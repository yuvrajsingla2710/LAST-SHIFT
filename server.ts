import crypto from 'node:crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ChoreCategoryId,
  createInitialChoreState,
  executeChoreBatchInState,
  addCustomChoreToState,
} from './src/game/chores';
import {
  analyzeArchiveFiles,
  analyzeCodeSnippetForLint,
  classifyEmailDeterministic,
  createInitialFacilitySaveState,
  generateEmailOperationProposals,
  generateNovaContextualResponse,
  parseAndAnalyzeCsvExpenses,
  parseRawEmlContent,
  RawFileInput,
} from './src/facility/engine';
import {
  createCsrfStateToken,
  decryptTokenAes256Gcm,
  EncryptedTokenRecord,
  encryptTokenAes256Gcm,
  GmailApiMessageResource,
  parseGmailApiMessageToParsedEmail,
  verifyCsrfStateToken,
} from './src/facility/security';
import { ParsedEmailItem } from './src/facility/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 10 && key !== 'MY_GEMINI_API_KEY');
}

function getGenAIClient(): GoogleGenAI | null {
  if (!isGeminiKeyConfigured()) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Per-session AES-256-GCM encrypted token vault (isolated per session ID; never logged or exposed)
const encryptedSessionVault = new Map<
  string,
  {
    email: string;
    uid: string;
    encryptedToken: EncryptedTokenRecord;
    createdAtMs: number;
  }
>();

// Simple sliding-window rate limiter per IP for auth & Gmail routes
const rateLimitBuckets = new Map<string, { count: number; resetAtMs: number }>();
function checkRateLimit(ip: string, maxRequests = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitBuckets.get(ip);
  if (!entry || now > entry.resetAtMs) {
    rateLimitBuckets.set(ip, { count: 1, resetAtMs: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxRequests;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));

  let choreState = createInitialChoreState();

  app.get('/api/health', (_req, res) => {
    const geminiReady = isGeminiKeyConfigured();
    res.json({
      status: 'ok',
      service: 'last-shift-the-last-operator',
      timestamp: new Date().toISOString(),
      geminiConfigured: geminiReady,
      activeAnalysisEngine: geminiReady ? 'gemini-3.8-flash' : 'deterministic-rule-engine',
      oauthSecurity: {
        tokenEncryptionAlgorithm: 'aes-256-gcm',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        httpOnlySessionCookies: true,
        csrfStateValidation: true,
      },
    });
  });

  // ==========================================================================
  // GOOGLE OAUTH 2.0 SESSION VAULT, CSRF STATE VALIDATION & GMAIL API PROXY
  // ==========================================================================
  app.get('/api/auth/status', (req, res) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip, 60)) {
      res.status(429).json({ error: 'Rate limit exceeded on authentication endpoint.' });
      return;
    }
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies['last_shift_sid'];
    const vaultEntry = sid ? encryptedSessionVault.get(sid) : undefined;
    const csrfState = createCsrfStateToken();

    res.json({
      connected: Boolean(vaultEntry),
      email: vaultEntry?.email || null,
      encryptionAtRest: 'AES-256-GCM',
      grantedScope: 'https://www.googleapis.com/auth/gmail.readonly',
      csrfState,
    });
  });

  app.post('/api/auth/verify-state', (req, res) => {
    const { state } = req.body as { state?: string };
    if (!state || !verifyCsrfStateToken(state)) {
      res.status(403).json({
        valid: false,
        error: 'Invalid or expired OAuth CSRF state token rejected.',
      });
      return;
    }
    res.json({ valid: true });
  });

  app.post('/api/auth/session', (req, res) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip, 30)) {
      res.status(429).json({ error: 'Too many authentication attempts. Please wait.' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      res.status(401).json({ error: 'Missing Bearer OAuth token.' });
      return;
    }

    const { email = '', uid = '' } = req.body as { email?: string; uid?: string };
    const encryptedToken = encryptTokenAes256Gcm(bearerToken);
    const sid = crypto.randomBytes(24).toString('hex');

    encryptedSessionVault.set(sid, {
      email: String(email),
      uid: String(uid),
      encryptedToken,
      createdAtMs: Date.now(),
    });

    const cookieFlags = [
      `last_shift_sid=${encodeURIComponent(sid)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=3600',
      isProd ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    res.setHeader('Set-Cookie', cookieFlags);
    res.json({
      stored: true,
      encryption: 'aes-256-gcm',
      email: String(email),
    });
  });

  app.post('/api/auth/disconnect', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies['last_shift_sid'];
    if (sid) {
      encryptedSessionVault.delete(sid);
    }
    res.setHeader(
      'Set-Cookie',
      'last_shift_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );
    res.json({ disconnected: true, credentialsCleared: true });
  });

  app.get('/api/gmail/messages', async (req, res) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(ip, 30)) {
      res.status(429).json({ error: 'Gmail API rate limit reached. Please wait a moment.' });
      return;
    }

    // Resolve access token from Authorization Bearer header or decrypt from HttpOnly session cookie
    const authHeader = req.headers.authorization || '';
    let accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!accessToken) {
      const cookies = parseCookies(req.headers.cookie);
      const sid = cookies['last_shift_sid'];
      const vaultEntry = sid ? encryptedSessionVault.get(sid) : undefined;
      if (vaultEntry) {
        try {
          accessToken = decryptTokenAes256Gcm(vaultEntry.encryptedToken);
        } catch {
          accessToken = '';
        }
      }
    }

    if (!accessToken) {
      res.status(401).json({
        error:
          'Google Account not connected or session expired. Click CONNECT GOOGLE ACCOUNT to authorize Gmail read-only access.',
      });
      return;
    }

    const maxResults = Math.min(20, Math.max(1, Number(req.query.maxResults) || 12));

    try {
      const listResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (listResp.status === 401 || listResp.status === 403) {
        res.status(listResp.status).json({
          error:
            'Gmail access token expired or insufficient permissions (requires gmail.readonly). Please reconnect your Google Account.',
        });
        return;
      }

      if (!listResp.ok) {
        res.status(listResp.status).json({
          error: `Gmail API returned status ${listResp.status}.`,
        });
        return;
      }

      const listData = (await listResp.json()) as {
        messages?: Array<{ id: string; threadId?: string }>;
      };
      const messageRefs = (listData.messages || []).slice(0, maxResults);

      const detailedMessages: ParsedEmailItem[] = [];
      for (const ref of messageRefs) {
        const msgResp = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(ref.id)}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (msgResp.ok) {
          const msgJson = (await msgResp.json()) as GmailApiMessageResource;
          detailedMessages.push(parseGmailApiMessageToParsedEmail(msgJson, 1));
        }
      }

      const proposals = generateEmailOperationProposals(detailedMessages);
      res.json({
        source: 'gmail-api-live',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        readOnlyMode: true,
        emails: detailedMessages,
        proposals,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to communicate with Gmail API.',
      });
    }
  });

  // ==========================================================================
  // PRESERVED CHORE ROUTES
  // ==========================================================================
  app.get('/api/chores/state', (_req, res) => {
    res.json(choreState);
  });

  app.post('/api/chores/select-mission', (req, res) => {
    const { categoryId } = req.body as { categoryId?: ChoreCategoryId };
    if (!categoryId || !choreState.queues[categoryId]) {
      res.status(400).json({ error: 'Invalid chore category ID.' });
      return;
    }
    choreState.activeCategoryId = categoryId;
    res.json(choreState);
  });

  app.post('/api/chores/execute-batch', (req, res) => {
    const { categoryId, triggerSource = 'kill', intensity = 1 } = req.body as {
      categoryId?: ChoreCategoryId;
      triggerSource?: 'kill' | 'combo' | 'overdrive' | 'wave_clear' | 'core_pickup';
      intensity?: number;
    };
    const result = executeChoreBatchInState(choreState, {
      categoryId,
      triggerSource,
      intensity,
    });
    choreState = result.updatedState;
    res.json({
      state: choreState,
      resolvedItems: result.resolvedItems,
      newLogs: result.newLogs,
    });
  });

  app.post('/api/chores/add-task', (req, res) => {
    try {
      const { categoryId, title, sourceDetail = '', targetAction, units } = req.body as {
        categoryId: ChoreCategoryId;
        title: string;
        sourceDetail?: string;
        targetAction: string;
        units: number;
      };
      if (!categoryId || !choreState.queues[categoryId]) {
        res.status(400).json({ error: 'Invalid categoryId.' });
        return;
      }
      const added = addCustomChoreToState(choreState, {
        categoryId,
        title: String(title ?? ''),
        sourceDetail: String(sourceDetail ?? ''),
        targetAction: String(targetAction ?? ''),
        units: Number(units),
      });
      res.json({ state: choreState, added });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to queue custom chore.',
      });
    }
  });

  app.post('/api/chores/reset', (_req, res) => {
    const currentCategory = choreState.activeCategoryId;
    choreState = createInitialChoreState();
    choreState.activeCategoryId = currentCategory;
    res.json(choreState);
  });

  // ==========================================================================
  // FACILITY 07 — REAL EMAIL INTELLIGENCE ENDPOINT (.EML / .ZIP)
  // ==========================================================================
  app.post('/api/emails/analyze', async (req, res) => {
    try {
      const { rawFiles = [], patternRecLevel = 1 } = req.body as {
        rawFiles: Array<{ fileName: string; rawEml: string; isSample?: boolean }>;
        patternRecLevel?: number;
      };

      if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
        res.status(400).json({ error: 'No .eml files provided for analysis.' });
        return;
      }

      const classified: ParsedEmailItem[] = rawFiles.slice(0, 50).map((f) => {
        const safeName = path.basename(String(f.fileName || 'message.eml'));
        const base = parseRawEmlContent(String(f.rawEml || ''), safeName, Boolean(f.isSample));
        return classifyEmailDeterministic(base, patternRecLevel);
      });

      const proposals = generateEmailOperationProposals(classified);
      res.json({
        emails: classified,
        proposals,
        engineUsed: 'deterministic-rule-engine',
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to analyze email batch.',
      });
    }
  });

  // ==========================================================================
  // FACILITY 07 — ARCHIVE VAULT FILE ORGANISATION ENDPOINT
  // ==========================================================================
  app.post('/api/archive/analyze', (req, res) => {
    try {
      const { files = [] } = req.body as { files: RawFileInput[] };
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'No files provided for Archive Vault inventory.' });
        return;
      }

      const sanitized: RawFileInput[] = files.slice(0, 100).map((f) => {
        const rawPath = String(f.fileName || 'unnamed.dat').replace(/\\/g, '/');
        if (rawPath.includes('..') || rawPath.startsWith('/')) {
          throw new Error(`Unsafe archive path rejected: ${rawPath}`);
        }
        return {
          fileName: path.basename(rawPath),
          sizeBytes: Math.max(0, Number(f.sizeBytes) || 0),
          lastModifiedIso: String(f.lastModifiedIso || new Date().toISOString()),
          content: String(f.content || ''),
          isSample: Boolean(f.isSample),
        };
      });

      const analyzed = analyzeArchiveFiles(sanitized);
      res.json({ files: analyzed });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Archive inspection failed.',
      });
    }
  });

  // ==========================================================================
  // FACILITY 07 — FINANCIAL CONTROL CSV AUDIT ENDPOINT
  // ==========================================================================
  app.post('/api/finance/analyze', (req, res) => {
    try {
      const { csvText = '' } = req.body as { csvText: string };
      if (!csvText.trim()) {
        res.status(400).json({ error: 'CSV content is empty.' });
        return;
      }
      const transactions = parseAndAnalyzeCsvExpenses(csvText);
      res.json({ transactions });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to parse financial CSV.',
      });
    }
  });

  // ==========================================================================
  // FACILITY 07 — SYSTEMS REPAIR LINT DIAGNOSTIC ENDPOINT
  // ==========================================================================
  app.post('/api/systems/lint', (req, res) => {
    try {
      const { codeText = '', filePath = 'src/sector02/router_daemon.ts' } = req.body as {
        codeText: string;
        filePath?: string;
      };
      const diagnostics = analyzeCodeSnippetForLint(codeText, filePath);
      res.json({ diagnostics });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to run code diagnostics.',
      });
    }
  });

  // ==========================================================================
  // FACILITY 07 — NOVA AI ASSISTANT
  // ==========================================================================
  app.post('/api/nova/chat', async (req, res) => {
    const {
      question = '',
      saveState,
      selectedEmail = null,
      emails = [],
      files = [],
      transactions = [],
      diagnostics = [],
    } = req.body as {
      question: string;
      saveState?: ReturnType<typeof createInitialFacilitySaveState>;
      selectedEmail?: ParsedEmailItem | null;
      emails?: ParsedEmailItem[];
      files?: ReturnType<typeof analyzeArchiveFiles>;
      transactions?: ReturnType<typeof parseAndAnalyzeCsvExpenses>;
      diagnostics?: ReturnType<typeof analyzeCodeSnippetForLint>;
    };

    const safeState = saveState || createInitialFacilitySaveState();
    const deterministicResult = generateNovaContextualResponse(question, {
      saveState: safeState,
      selectedEmail,
      emails,
      files,
      transactions,
      diagnostics,
    });

    const ai = getGenAIClient();
    if (!ai) {
      res.json(deterministicResult);
      return;
    }

    try {
      const contextSummary = JSON.stringify({
        currentScene: safeState.currentScene,
        operatorLevel: safeState.operatorLevel,
        credits: safeState.credits,
        selectedEmail: selectedEmail
          ? {
              subject: selectedEmail.subject,
              sender: selectedEmail.senderEmail,
              category: selectedEmail.manualOverrideCategory ?? selectedEmail.category,
              dates: selectedEmail.extractedDatesAndDeadlines,
              amounts: selectedEmail.extractedAmounts,
              bodyPreview: selectedEmail.bodyText.slice(0, 350),
            }
          : null,
        emailCounts: emails.length,
        fileCounts: files.length,
        transactionCounts: transactions.length,
        diagnosticCounts: diagnostics.length,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Player Question: "${question}"\nFacility Context JSON: ${contextSummary}`,
        config: {
          systemInstruction:
            'You are NOVA, the AI brain of Facility 07 in the year 2096 (LAST SHIFT: THE LAST OPERATOR). Explain emails, duplicate files, financial transactions, and code lint errors in clear, concise, plain language. Strictly separate verified facts present in the data from assumptions. Never invent deadlines or amounts not present in the data.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              facts: { type: Type.ARRAY, items: { type: Type.STRING } },
              assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['replyText', 'facts', 'assumptions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        replyText: parsed.replyText || deterministicResult.replyText,
        facts: Array.isArray(parsed.facts) ? parsed.facts : deterministicResult.facts,
        assumptions: Array.isArray(parsed.assumptions)
          ? parsed.assumptions
          : deterministicResult.assumptions,
        engineBadge: 'GEMINI 3.8 FLASH // LIVE AI CORE',
      });
    } catch {
      res.json(deterministicResult);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LAST SHIFT: THE LAST OPERATOR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
