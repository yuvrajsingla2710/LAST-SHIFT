import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  ArchiveFileCategory,
  ArchiveFileItem,
  CodeDiagnosticItem,
  EmailCategory,
  EmailOperationProposal,
  FacilitySaveState,
  FinancialTransactionItem,
  NovaUpgradeNode,
  ParsedEmailItem,
  StoryLogEntry,
  WorkstationTab,
} from '../facility/types';
import {
  CHAPTER_1_SCENES,
  RawFileInput,
  SAMPLE_FINANCE_CSV,
  SAMPLE_REPAIR_CODE_MODULE,
} from '../facility/engine';

interface WorkstationModalProps {
  activeTab: WorkstationTab;
  onSelectTab: (tab: WorkstationTab) => void;
  onClose: () => void;
  saveState: FacilitySaveState;
  // Email Intelligence & Google OAuth Gmail Integration
  emails: ParsedEmailItem[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  emailProposals: EmailOperationProposal[];
  onImportRawEmls: (files: Array<{ fileName: string; rawEml: string; isSample?: boolean }>) => Promise<void>;
  onOverrideEmailCategory: (emailId: string, newCat: EmailCategory) => void;
  onEmailSingleAction: (
    emailId: string,
    action: 'kept' | 'archived' | 'flagged_review' | 'spam_quarantine' | 'toggle_important'
  ) => void;
  onBulkEmailAction: (
    emailIds: string[],
    action: 'kept' | 'archived' | 'flagged_review'
  ) => void;
  onUndoEmailAction: () => void;
  canUndoEmail: boolean;
  onApproveEmailProposal: (proposalId: string) => void;
  onAskNovaAboutEmail: (email: ParsedEmailItem, promptText: string) => void;
  gmailConnectedEmail: string | null;
  gmailAuthError: string | null;
  gmailLoading: boolean;
  onConnectGoogleGmail: () => Promise<void>;
  onDisconnectGoogleGmail: () => Promise<void>;
  onFetchGmailInbox: () => Promise<void>;
  // Archive Vault
  archiveFiles: ArchiveFileItem[];
  onImportArchiveFiles: (files: RawFileInput[]) => Promise<void>;
  onOverrideFileFolder: (fileId: string, folder: ArchiveFileCategory) => void;
  onExecuteArchiveBatch: (mode: 'organize_all' | 'quarantine_duplicates') => void;
  // Financial Control
  transactions: FinancialTransactionItem[];
  onAnalyzeFinanceCsv: (csvText: string) => Promise<void>;
  onApproveFinanceAudit: () => void;
  // Systems Repair
  codeText: string;
  diagnostics: CodeDiagnosticItem[];
  onRunCodeLint: (code: string) => Promise<void>;
  onApproveCodeFix: (diagId: string) => void;
  // Upgrades & Story
  upgrades: NovaUpgradeNode[];
  onPurchaseUpgrade: (upgradeId: string) => void;
  storyLogs: StoryLogEntry[];
  onCompleteMysteryScene8: () => void;
}

const ALL_EMAIL_CATEGORIES: EmailCategory[] = [
  'Important',
  'Personal',
  'Commercial / Business',
  'Promotional / Marketing',
  'Newsletters',
  'Invoices and Receipts',
  'Notifications',
  'Suspicious / Possible phishing',
  'Unclassified',
];

const ALL_ARCHIVE_FOLDERS: ArchiveFileCategory[] = [
  'Documents',
  'Work',
  'Personal',
  'Finance',
  'Receipts',
  'Images',
  'Videos',
  'Downloads',
  'Archive',
  'Review Required',
];

export const WorkstationModal: React.FC<WorkstationModalProps> = ({
  activeTab,
  onSelectTab,
  onClose,
  saveState,
  emails,
  selectedEmailId,
  onSelectEmail,
  emailProposals,
  onImportRawEmls,
  onOverrideEmailCategory,
  onEmailSingleAction,
  onBulkEmailAction,
  onUndoEmailAction,
  canUndoEmail,
  onApproveEmailProposal,
  onAskNovaAboutEmail,
  gmailConnectedEmail,
  gmailAuthError,
  gmailLoading,
  onConnectGoogleGmail,
  onDisconnectGoogleGmail,
  onFetchGmailInbox,
  archiveFiles,
  onImportArchiveFiles,
  onOverrideFileFolder,
  onExecuteArchiveBatch,
  transactions,
  onAnalyzeFinanceCsv,
  onApproveFinanceAudit,
  codeText,
  diagnostics,
  onRunCodeLint,
  onApproveCodeFix,
  upgrades,
  onPurchaseUpgrade,
  storyLogs,
  onCompleteMysteryScene8,
}) => {
  const [emailFilterCat, setEmailFilterCat] = useState<string>('ALL');
  const [emailSearch, setEmailSearch] = useState('');
  const [checkedEmailIds, setCheckedEmailIds] = useState<Set<string>>(new Set());
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [csvDraft, setCsvDraft] = useState(SAMPLE_FINANCE_CSV);
  const [codeDraft, setCodeDraft] = useState(codeText || SAMPLE_REPAIR_CODE_MODULE);

  // Inbox Rescue One-Card-At-A-Time Gameplay State
  const [inboxRescueMode, setInboxRescueMode] = useState<boolean>(false);
  const [rescueCardIndex, setRescueCardIndex] = useState<number>(0);
  const [rescueScore, setRescueScore] = useState<number>(0);
  const [rescueStreak, setRescueStreak] = useState<number>(1);
  const [rescueTimeLeft, setRescueTimeLeft] = useState<number>(90);

  const selectedEmail =
    emails.find((e) => e.id === selectedEmailId) || emails[0] || null;

  const currentRescueCard = emails[Math.min(rescueCardIndex, Math.max(0, emails.length - 1))] || null;

  const handleRescueCardAction = (
    decision: 'important' | 'keep' | 'archive' | 'spam_review'
  ) => {
    if (!currentRescueCard) return;
    if (decision === 'important') {
      onEmailSingleAction(currentRescueCard.id, 'toggle_important');
      onEmailSingleAction(currentRescueCard.id, 'kept');
    } else if (decision === 'keep') {
      onEmailSingleAction(currentRescueCard.id, 'kept');
    } else if (decision === 'archive') {
      onEmailSingleAction(currentRescueCard.id, 'archived');
    } else {
      onEmailSingleAction(currentRescueCard.id, 'flagged_review');
    }
    setRescueScore((s) => s + 125 * rescueStreak);
    setRescueStreak((st) => Math.min(8, st + 1));
    if (rescueCardIndex + 1 < emails.length) {
      setRescueCardIndex((idx) => idx + 1);
      onSelectEmail(emails[rescueCardIndex + 1].id);
    }
  };

  const filteredEmails = emails.filter((e) => {
    const effCat = e.manualOverrideCategory ?? e.category;
    if (emailFilterCat !== 'ALL' && effCat !== emailFilterCat) return false;
    if (emailSearch.trim()) {
      const q = emailSearch.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        e.senderName.toLowerCase().includes(q) ||
        e.senderEmail.toLowerCase().includes(q) ||
        e.bodyText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle .eml or .zip upload for Communication Centre
  const handleEmailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadStatusMsg('Inspecting & parsing uploaded email archive...');

    try {
      const extracted: Array<{ fileName: string; rawEml: string; isSample?: boolean }> = [];
      for (const file of Array.from(fileList)) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [relPath, entry] of Object.entries(zip.files)) {
            if (entry.dir || relPath.includes('..') || relPath.startsWith('/')) continue;
            if (relPath.toLowerCase().endsWith('.eml') || relPath.toLowerCase().endsWith('.txt')) {
              const text = await entry.async('string');
              extracted.push({
                fileName: relPath.split('/').pop() || relPath,
                rawEml: text,
                isSample: false,
              });
            }
          }
        } else {
          const text = await file.text();
          extracted.push({
            fileName: file.name,
            rawEml: text,
            isSample: false,
          });
        }
      }

      if (extracted.length === 0) {
        setUploadStatusMsg('No valid .eml files found in selection.');
        return;
      }

      await onImportRawEmls(extracted);
      setUploadStatusMsg(`Verified & analyzed ${extracted.length} uploaded .eml message(s).`);
    } catch (err) {
      setUploadStatusMsg(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  // Handle files or .zip upload for Archive Vault
  const handleArchiveFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadStatusMsg('Computing SHA-256 content hashes & building inventory...');

    try {
      const extracted: RawFileInput[] = [];
      for (const file of Array.from(fileList)) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [relPath, entry] of Object.entries(zip.files)) {
            if (entry.dir || relPath.includes('..') || relPath.startsWith('/')) continue;
            const text = await entry.async('string');
            extracted.push({
              fileName: relPath.split('/').pop() || relPath,
              sizeBytes: text.length,
              lastModifiedIso: entry.date ? entry.date.toISOString() : new Date().toISOString(),
              content: text,
              isSample: false,
            });
          }
        } else {
          const text = await file.text();
          extracted.push({
            fileName: file.name,
            sizeBytes: file.size,
            lastModifiedIso: new Date(file.lastModified || Date.now()).toISOString(),
            content: text,
            isSample: false,
          });
        }
      }

      if (extracted.length > 0) {
        await onImportArchiveFiles(extracted);
        setUploadStatusMsg(`Analyzed ${extracted.length} file(s) with SHA-256 duplicate detection.`);
      }
    } catch (err) {
      setUploadStatusMsg(err instanceof Error ? err.message : 'Archive upload failed.');
    }
  };

  // Export organized email report
  const handleExportEmailReport = () => {
    const report = {
      facility: 'FACILITY 07 — COMMUNICATION CENTRE',
      exportedAt: new Date().toISOString(),
      totalMessages: emails.length,
      summaryByCategory: ALL_EMAIL_CATEGORIES.reduce(
        (acc, cat) => {
          acc[cat] = emails.filter((e) => (e.manualOverrideCategory ?? e.category) === cat).length;
          return acc;
        },
        {} as Record<string, number>
      ),
      messages: emails.map((e) => ({
        id: e.id,
        fileName: e.sourceFileName,
        isSampleData: e.isSample,
        sender: e.senderEmail,
        subject: e.subject,
        category: e.manualOverrideCategory ?? e.category,
        status: e.status,
        recommendedAction: e.recommendedAction,
        extractedDeadlines: e.extractedDatesAndDeadlines,
        extractedAmounts: e.extractedAmounts,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facility07_email_intelligence_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCheckedEmail = (id: string) => {
    setCheckedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const navTabs: Array<{ id: WorkstationTab; num: string; label: string; code: string }> = [
    { id: 'comm_email', num: '01', label: 'ХЕМОФОРМ · Comm Centre', code: 'EMAIL AI' },
    { id: 'archive_files', num: '02', label: 'АРХИВФОРМ · Archive Vault', code: 'SHA-256' },
    { id: 'finance_csv', num: '03', label: 'КВАНТОФОРМ · Finance Bay', code: 'LEDGER' },
    { id: 'systems_lint', num: '04', label: 'БИОФОРМ · Systems Lab', code: 'LINT' },
    { id: 'upgrades', num: '05', label: 'Ship & NOVA Upgrades', code: `${saveState.credits} CR` },
    { id: 'story_logs', num: '06', label: 'Story Logs & Mystery', code: 'LOGS' },
    { id: 'mission_brief', num: '07', label: 'Rotunda Bridge Blueprint', code: 'BRIDGE' },
  ];

  return (
    <div
      role="dialog"
      aria-label="Facility 07 Diegetic Terminal Interface"
      className="fixed inset-0 z-30 bg-[#07131A]/90 flex items-center justify-center p-3 md:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-7xl h-[90vh] flex flex-col">
        <div>
          <div className="ss-folder-tab">
            <span>[x]</span>
            <span>SPACESHIP ROTUNDA OS v9.4 · SECTOR WORKSTATION INTERFACES</span>
          </div>
        </div>
        <div className="ss-folder-body flex-1 flex flex-col overflow-hidden">
          {/* TOP DIEGETIC TERMINAL HEADER (Riveted Space-Shooter-UI9 Banner) */}
          <div className="px-5 py-3 bg-[#08161E] border-b border-[#1EE3CF]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="ss-banner px-4 py-1.5 mx-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#1EE3CF]">
                USER INTERFACES · OPERATOR LEVEL {saveState.operatorLevel} · TIER{' '}
                {saveState.facilityTier}
              </div>
              <div className="text-xs md:text-sm font-display font-bold uppercase tracking-wider text-white">
                {CHAPTER_1_SCENES[saveState.currentScene].title} —{' '}
                <span className="text-[#A3E635] font-normal">
                  {CHAPTER_1_SCENES[saveState.currentScene].objectiveText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded bg-[#0A1D26] border border-[#1EE3CF]/40 text-xs font-mono text-[#A3E635] tabular-nums">
                CREDITS: {saveState.credits} CR · VERIFIED OPS: {saveState.verifiedOperationsCount}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ss-btn px-3.5 py-1.5 text-xs cursor-pointer"
              >
                [ESC] Return to 3D Spaceship
              </button>
            </div>
          </div>

          {/* SECTOR NAVIGATION BAR (Yellow-Badged 01-07 Space-Shooter-UI9 Buttons) */}
          <div className="px-5 py-2 bg-[#071219] border-b border-[#1EE3CF]/30 flex items-center gap-2 overflow-x-auto">
            {navTabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTab(t.id)}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono transition-colors shrink-0 cursor-pointer flex items-center gap-2 border ${
                    active
                      ? 'bg-[#163C45] border-[#A3E635] text-white font-semibold'
                      : 'bg-[#0B1C24] border-[#1EE3CF]/35 text-slate-300 hover:border-[#1EE3CF]'
                  }`}
                >
                  <span className="px-1.5 py-0.5 bg-[#FACC15] text-[#081C24] font-mono font-extrabold text-[10px]">
                    {t.num}
                  </span>
                  <span>{t.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/40 text-[#A3E635]' : 'bg-[#07131A] text-[#1EE3CF]'
                    }`}
                  >
                    {t.code}
                  </span>
                </button>
              );
            })}
          </div>

          {uploadStatusMsg && (
            <div className="px-5 py-2 bg-[#14353E] border-b border-[#1EE3CF]/50 text-xs font-mono text-[#A3E635] flex items-center justify-between">
              <span>{uploadStatusMsg}</span>
              <button
                type="button"
                onClick={() => setUploadStatusMsg(null)}
                className="text-slate-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ====================================================================
              TAB 1: COMMUNICATION CENTRE — REAL GMAIL OAUTH + INBOX RESCUE
          ==================================================================== */}
          {activeTab === 'comm_email' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* GOOGLE OAUTH 2.0 GMAIL CONNECTION BANNER */}
              <div className="px-5 py-3 bg-[#08171F] border-b border-[#1EE3CF]/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#1EE3CF]">
                      NOVA INBOX RECOVERY LINK · GOOGLE OAUTH 2.0 (READ-ONLY SCOPE)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-[#A3E635] border border-[#A3E635]/40">
                      AES-256-GCM SESSION VAULT
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {gmailConnectedEmail ? (
                      <>
                        NOVA: &ldquo;Connected to{' '}
                        <strong className="text-[#1EE3CF]">{gmailConnectedEmail}</strong> via
                        read-only permission (<code>gmail.readonly</code>). I can analyze your real
                        inbox and prepare proposals without modifying or deleting your Gmail messages.&rdquo;
                      </>
                    ) : (
                      <>
                        NOVA: &ldquo;Communication systems restored. Operator, connect your Google
                        Account (<code>gmail.readonly</code>) to run Inbox Rescue on your real inbox,
                        or inspect imported <code>.eml</code> files.&rdquo;
                      </>
                    )}
                  </p>
                  {gmailAuthError && (
                    <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                      Notice: {gmailAuthError}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!gmailConnectedEmail ? (
                    <button
                      type="button"
                      data-connect-gmail="true"
                      disabled={gmailLoading}
                      onClick={onConnectGoogleGmail}
                      className="gsi-material-button flex items-center gap-2.5 px-4 py-2 rounded bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs shadow cursor-pointer"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-4 h-4 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>
                        {gmailLoading ? 'Authorizing...' : 'CONNECT GOOGLE ACCOUNT'}
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={gmailLoading}
                        onClick={onFetchGmailInbox}
                        className="ss-btn px-3 py-1.5 text-xs cursor-pointer"
                      >
                        {gmailLoading ? 'Fetching Gmail...' : 'Sync Real Gmail Inbox'}
                      </button>
                      <button
                        type="button"
                        onClick={onDisconnectGoogleGmail}
                        className="px-3 py-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-xs font-mono text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                      >
                        Disconnect Google Account
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    data-inbox-rescue-toggle="true"
                    onClick={() => setInboxRescueMode((prev) => !prev)}
                    className="ss-btn px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    {inboxRescueMode ? 'Exit Inbox Rescue Card Mode' : '▶ Start Inbox Rescue (Card Mode)'}
                  </button>
                </div>
              </div>

              {/* INBOX RESCUE ONE-CARD-AT-A-TIME GAMEPLAY VIEW */}
              {inboxRescueMode && currentRescueCard ? (
                <div className="flex-1 p-5 overflow-y-auto flex flex-col items-center justify-center bg-[#07131A]">
                  <div className="w-full max-w-3xl hud-panel rounded-md p-6 flex flex-col gap-4">
                  {/* Top Score, Streak, Timer & Progress */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          RESCUE SCORE
                        </div>
                        <div className="text-xl font-mono font-bold text-[#39E7FF] tabular-nums">
                          {rescueScore.toLocaleString()} PTS
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          STREAK
                        </div>
                        <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
                          {rescueStreak}x
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          SHIFT CLOCK
                        </div>
                        <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
                          {rescueTimeLeft}s
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">
                        CARD {rescueCardIndex + 1} OF {emails.length}
                      </span>
                      {canUndoEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            onUndoEmailAction();
                            setRescueCardIndex((idx) => Math.max(0, idx - 1));
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-amber-300 cursor-pointer"
                        >
                          [Z] Undo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Single Email Game Card */}
                  <div className="p-4 rounded-xl bg-[#050711] border border-slate-800 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#278BFF]/25 text-[#39E7FF]">
                          NOVA CATEGORY:{' '}
                          {currentRescueCard.manualOverrideCategory ?? currentRescueCard.category}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          PRIORITY: {currentRescueCard.priority}
                        </span>
                        {currentRescueCard.isSample ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                            SYNTHETIC SAMPLE
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            REAL IMPORTED / GMAIL MESSAGE
                          </span>
                        )}
                      </div>

                      <select
                        aria-label="Correct card category"
                        value={
                          currentRescueCard.manualOverrideCategory ?? currentRescueCard.category
                        }
                        onChange={(e) =>
                          onOverrideEmailCategory(
                            currentRescueCard.id,
                            e.target.value as EmailCategory
                          )
                        }
                        className="bg-[#0B1225] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                      >
                        {ALL_EMAIL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            Correct: {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-slate-400">
                        FROM: {currentRescueCard.senderName} &lt;{currentRescueCard.senderEmail}&gt; ·{' '}
                        {currentRescueCard.dateIso.slice(0, 10)}
                      </div>
                      <h3 className="text-lg font-display font-bold text-white mt-1">
                        {currentRescueCard.subject}
                      </h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-[#0B1225] p-3 rounded border border-slate-800/80">
                        {currentRescueCard.bodyText}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#091328] border border-[#278BFF]/30 text-xs text-slate-200">
                      <div className="text-[10px] font-mono uppercase text-[#39E7FF]">
                        NOVA EXPLANATION (COMMERCIAL VS. PROMOTIONAL SEPARATION)
                      </div>
                      <p className="mt-1">
                        {currentRescueCard.summary} —{' '}
                        <strong className="text-white">{currentRescueCard.whyItMatters}</strong>
                      </p>
                    </div>
                  </div>

                  {/* 4 Player Triage Decision Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleRescueCardAction('important')}
                      className="py-3 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-xs font-mono font-bold text-amber-200 cursor-pointer"
                    >
                      1. IMPORTANT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescueCardAction('keep')}
                      className="py-3 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-xs font-mono font-bold text-emerald-200 cursor-pointer"
                    >
                      2. KEEP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescueCardAction('archive')}
                      className="py-3 px-3 rounded-xl bg-[#278BFF]/25 hover:bg-[#278BFF]/40 border border-[#39E7FF]/50 text-xs font-mono font-bold text-[#39E7FF] cursor-pointer"
                    >
                      3. ARCHIVE PROPOSAL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescueCardAction('spam_review')}
                      className="py-3 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-xs font-mono font-bold text-rose-200 cursor-pointer"
                    >
                      4. SPAM REVIEW
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Upload, Category Filter & Email Queue */}
            <div className="lg:col-span-5 border-r border-slate-800 flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-slate-800 bg-[#080D1D] flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="px-3 py-1.5 rounded bg-[#278BFF] hover:bg-[#1B6FE0] text-xs font-mono font-semibold text-white cursor-pointer">
                    + Import .EML / .ZIP
                    <input
                      type="file"
                      accept=".eml,.txt,.zip"
                      multiple
                      onChange={handleEmailFileUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="flex items-center gap-1.5">
                    {canUndoEmail && (
                      <button
                        type="button"
                        onClick={onUndoEmailAction}
                        className="px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-amber-300 hover:bg-slate-700 cursor-pointer"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExportEmailReport}
                      className="px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-[#39E7FF] hover:bg-slate-700 cursor-pointer"
                    >
                      Export Report (.JSON)
                    </button>
                  </div>
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    placeholder="Search sender, subject, or content..."
                    className="flex-1 bg-[#050711] border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#39E7FF]"
                  />
                  <select
                    aria-label="Filter emails by category"
                    value={emailFilterCat}
                    onChange={(e) => setEmailFilterCat(e.target.value)}
                    className="bg-[#050711] border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  >
                    <option value="ALL">All Categories ({emails.length})</option>
                    {ALL_EMAIL_CATEGORIES.map((cat) => {
                      const cnt = emails.filter(
                        (e) => (e.manualOverrideCategory ?? e.category) === cat
                      ).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({cnt})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Bulk Selection Bar */}
                {checkedEmailIds.size > 0 && (
                  <div className="flex items-center justify-between bg-[#050711] px-2.5 py-1.5 rounded border border-[#39E7FF]/40 text-[11px] font-mono">
                    <span className="text-[#39E7FF]">{checkedEmailIds.size} selected</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onBulkEmailAction(Array.from(checkedEmailIds), 'kept');
                          setCheckedEmailIds(new Set());
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300"
                      >
                        Keep Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onBulkEmailAction(Array.from(checkedEmailIds), 'archived');
                          setCheckedEmailIds(new Set());
                        }}
                        className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300"
                      >
                        Archive Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onBulkEmailAction(Array.from(checkedEmailIds), 'flagged_review');
                          setCheckedEmailIds(new Set());
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300"
                      >
                        Flag Review
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
                {filteredEmails.map((item) => {
                  const effCat = item.manualOverrideCategory ?? item.category;
                  const isSelected = selectedEmail?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectEmail(item.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#132042]' : 'hover:bg-[#0E1730]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checkedEmailIds.has(item.id)}
                            onChange={(ev) => {
                              ev.stopPropagation();
                              toggleCheckedEmail(item.id);
                            }}
                            aria-label={`Select ${item.subject}`}
                          />
                          <span className="text-xs font-semibold text-white truncate">
                            {item.senderName}
                          </span>
                          {item.isSample && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              SAMPLE
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            effCat === 'Commercial / Business'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : effCat === 'Promotional / Marketing'
                              ? 'bg-purple-500/20 text-purple-300'
                              : effCat === 'Suspicious / Possible phishing'
                              ? 'bg-rose-500/25 text-rose-300'
                              : effCat === 'Invoices and Receipts'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : effCat === 'Important'
                              ? 'bg-amber-500/25 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {effCat}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-100 mt-1 truncate">
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.preview}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-slate-400">
                        <span>Status: {item.status.toUpperCase()}</span>
                        <span>Priority: {item.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Email NOVA Explanation + Batch Proposal Approval */}
            <div className="lg:col-span-7 flex flex-col overflow-y-auto p-4 md:p-5 gap-5">
              {selectedEmail && (
                <div className="bg-[#070C1B] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#278BFF]/20 text-[#39E7FF]">
                          {selectedEmail.analysisEngine === 'gemini-live'
                            ? 'GEMINI 3.8 FLASH ANALYSIS'
                            : 'NOVA DETERMINISTIC RULE ENGINE'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Confidence: {Math.round(selectedEmail.confidence * 100)}%
                        </span>
                      </div>
                      <h3 className="text-base font-display font-bold text-white mt-1.5">
                        {selectedEmail.subject}
                      </h3>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        From: {selectedEmail.senderName} &lt;{selectedEmail.senderEmail}&gt; ·{' '}
                        {selectedEmail.dateIso.slice(0, 10)}
                      </div>
                    </div>

                    {/* Manual Category Correction Override */}
                    <div className="flex flex-col items-end gap-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">
                        Category (Manual Correction):
                      </label>
                      <select
                        aria-label="Manual category override"
                        value={selectedEmail.manualOverrideCategory ?? selectedEmail.category}
                        onChange={(e) =>
                          onOverrideEmailCategory(
                            selectedEmail.id,
                            e.target.value as EmailCategory
                          )
                        }
                        className="bg-[#0B1225] border border-[#39E7FF]/50 rounded px-2.5 py-1 text-xs font-mono text-white"
                      >
                        {ALL_EMAIL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEmailSingleAction(selectedEmail.id, 'toggle_important')}
                      className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer border ${
                        selectedEmail.important
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {selectedEmail.important ? '★ Important' : '☆ Mark Important'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEmailSingleAction(selectedEmail.id, 'kept')}
                      className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-300 cursor-pointer"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => onEmailSingleAction(selectedEmail.id, 'archived')}
                      className="px-2.5 py-1 rounded bg-blue-500/15 border border-blue-500/40 text-xs font-mono text-blue-300 cursor-pointer"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => onEmailSingleAction(selectedEmail.id, 'flagged_review')}
                      className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-300 cursor-pointer"
                    >
                      Flag for Review
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onAskNovaAboutEmail(
                          selectedEmail,
                          `Is "${selectedEmail.subject}" a business email or advertisement, and what happens if I archive it?`
                        )
                      }
                      className="ml-auto px-2.5 py-1 rounded bg-[#985BFF]/20 border border-[#985BFF]/50 text-xs font-mono text-[#D2B8FF] cursor-pointer"
                    >
                      Ask NOVA in Chat →
                    </button>
                  </div>

                  {/* NOVA Plain-Language Explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0B1225] p-3.5 rounded-lg border border-slate-800">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[#39E7FF]">
                        NOVA PLAIN-LANGUAGE SUMMARY
                      </div>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        {selectedEmail.summary}
                      </p>
                      <div className="text-[10px] font-mono uppercase text-amber-400 mt-2.5">
                        WHY IT MATTERS & NEXT STEP
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {selectedEmail.whyItMatters} —{' '}
                        <strong className="text-white">
                          {selectedEmail.possibleRequiredAction}
                        </strong>
                      </p>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-emerald-400">
                          VERIFIED FACTS (EXTRACTED FROM MESSAGE)
                        </div>
                        <ul className="text-[11px] text-slate-300 mt-1 space-y-1 list-disc list-inside">
                          {selectedEmail.reasoningFacts.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-2">
                        <div className="text-[10px] font-mono uppercase text-purple-300">
                          ASSUMPTIONS & UNCERTAINTY
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {selectedEmail.reasoningAssumptions.join(' ')} ({selectedEmail.uncertaintyNote})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Raw Message Body */}
                  <div className="bg-[#050711] p-3 rounded border border-slate-800/80 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {selectedEmail.bodyText}
                  </div>
                </div>
              )}

              {/* ANALYSE -> PROPOSE -> PREVIEW -> APPROVE -> EXECUTE -> VERIFY */}
              <div className="bg-[#070C1B] border border-[#278BFF]/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#39E7FF]">
                      HUMAN-IN-THE-LOOP VERIFICATION PIPELINE
                    </div>
                    <h4 className="text-sm font-display font-bold text-white">
                      NOVA Proposed Batch Operations (Requires Explicit Operator Approval)
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {emailProposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-3 rounded-lg bg-[#0B1225] border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{prop.title}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              prop.status === 'approved_and_executed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {prop.status === 'approved_and_executed'
                              ? `VERIFIED (${prop.verificationHash})`
                              : `${prop.affectedEmailIds.length} MSG(S)`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{prop.description}</p>
                        <div className="text-[10px] font-mono text-slate-400 mt-1.5">
                          Examples: {prop.exampleSubjects.join(' · ')}
                        </div>
                      </div>

                      {prop.status === 'proposed' ? (
                        <button
                          type="button"
                          onClick={() => onApproveEmailProposal(prop.id)}
                          className="mt-2 w-full py-1.5 rounded bg-[#278BFF] hover:bg-[#1B6FE0] text-xs font-mono font-semibold text-white cursor-pointer"
                        >
                          Approve & Execute Operation (+75 CR / +80 XP)
                        </button>
                      ) : (
                        <div className="mt-2 text-[11px] font-mono text-emerald-400">
                          ✓ Operation Verified & Logged at {prop.executedAtIso?.slice(11, 19)} UTC
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TAB 2: ARCHIVE VAULT — SMART FILE ORGANISATION & SHA-256 DUPLICATES
        ==================================================================== */}
        {activeTab === 'archive_files' && (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070C1B] p-4 rounded-xl border border-slate-800">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#39E7FF]">
                  SECTOR 03 // ARCHIVE VAULT DIGITAL INVENTORY
                </div>
                <h3 className="text-base font-display font-bold text-white">
                  SHA-256 Content Duplicate Detection & Smart Folder Routing
                </h3>
                <p className="text-xs text-slate-400">
                  Files are never deleted silently or assumed to be junk based on age/size. Exact
                  SHA-256 duplicates are moved to recoverable Quarantine only upon approval.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 rounded bg-[#278BFF] hover:bg-[#1B6FE0] text-xs font-mono font-semibold text-white cursor-pointer">
                  + Upload Files or .ZIP
                  <input
                    type="file"
                    multiple
                    onChange={handleArchiveFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onExecuteArchiveBatch('quarantine_duplicates')}
                  className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500/40 text-xs font-mono text-amber-300 cursor-pointer"
                >
                  Approve Quarantine of SHA-256 Duplicates
                </button>
                <button
                  type="button"
                  onClick={() => onExecuteArchiveBatch('organize_all')}
                  className="px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300 cursor-pointer"
                >
                  Approve Proposed Folder Routing (+90 CR)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {archiveFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-lg bg-[#070C1B] border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-[240px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{file.fileName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {file.detectedType} · {(file.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          file.duplicateStatus === 'exact_hash_duplicate'
                            ? 'bg-rose-500/20 text-rose-300'
                            : file.duplicateStatus === 'same_name_collision'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {file.duplicateStatus.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        [{file.status.toUpperCase()}]
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{file.explanation}</p>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      Signature: {file.sha256Hash}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono text-slate-400">Folder:</label>
                    <select
                      aria-label={`Folder for ${file.fileName}`}
                      value={file.manualFolderOverride ?? file.suggestedFolder}
                      onChange={(e) =>
                        onOverrideFileFolder(file.id, e.target.value as ArchiveFileCategory)
                      }
                      className="bg-[#0B1225] border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-[#39E7FF]"
                    >
                      {ALL_ARCHIVE_FOLDERS.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: FINANCIAL CONTROL — CSV EXPENSE & DUPLICATE AUDIT
        ==================================================================== */}
        {activeTab === 'finance_csv' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-5 gap-4 overflow-y-auto">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="text-xs font-mono uppercase text-[#39E7FF]">
                SECTOR 04 // CSV EXPENSE INPUT
              </div>
              <textarea
                value={csvDraft}
                onChange={(e) => setCsvDraft(e.target.value)}
                rows={10}
                className="w-full bg-[#050711] border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAnalyzeFinanceCsv(csvDraft)}
                  className="px-3.5 py-2 rounded bg-[#278BFF] text-xs font-mono font-semibold text-white cursor-pointer"
                >
                  Run NOVA Ledger Analysis
                </button>
                <button
                  type="button"
                  onClick={onApproveFinanceAudit}
                  className="px-3.5 py-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300 cursor-pointer"
                >
                  Approve Audit Report (+85 CR)
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-2.5">
              <div className="text-xs font-mono uppercase text-[#39E7FF]">
                AUDITED TRANSACTIONS ({transactions.length})
              </div>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-lg bg-[#070C1B] border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{tx.vendor}</span>
                      <span className="text-xs font-mono text-[#39E7FF]">
                        ${tx.amount.toLocaleString()} {tx.currency}
                      </span>
                      {tx.isDuplicate && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/25 text-rose-300">
                          DUPLICATE OF {tx.duplicateOfId}
                        </span>
                      )}
                      {tx.isUnusual && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/25 text-amber-300">
                          ANOMALY FLAGGED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{tx.explanation}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {tx.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: SYSTEMS REPAIR — GENUINE LINT & BEFORE/AFTER DIFF
        ==================================================================== */}
        {activeTab === 'systems_lint' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-5 gap-4 overflow-y-auto">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="text-xs font-mono uppercase text-[#39E7FF]">
                SECTOR 05 // SOURCE MODULE INSPECTOR
              </div>
              <textarea
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                rows={12}
                className="w-full bg-[#050711] border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200"
              />
              <button
                type="button"
                onClick={() => onRunCodeLint(codeDraft)}
                className="px-4 py-2 rounded bg-[#278BFF] text-xs font-mono font-semibold text-white cursor-pointer"
              >
                Run Static Lint Diagnostics
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="text-xs font-mono uppercase text-[#39E7FF]">
                DETECTED DIAGNOSTICS & BEFORE/AFTER DIFFS ({diagnostics.length})
              </div>
              {diagnostics.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-lg bg-[#070C1B] border border-slate-800 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      Line {d.line} · {d.ruleId}
                    </span>
                    {d.status === 'open' ? (
                      <button
                        type="button"
                        onClick={() => onApproveCodeFix(d.id)}
                        className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300 cursor-pointer"
                      >
                        Approve & Patch Diff (+45 CR)
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400">✓ PATCH VERIFIED</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200">{d.novaPlainExplanation}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-rose-200">
                      - {d.beforeSnippet}
                    </div>
                    <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                      + {d.suggestedAfterSnippet}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 5: NOVA & FACILITY PROGRESSIVE UPGRADE TREE
        ==================================================================== */}
        {activeTab === 'upgrades' && (
          <div className="flex-1 p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {upgrades.map((u) => (
              <div
                key={u.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  u.unlocked
                    ? 'bg-[#0E1B38] border-[#39E7FF]/60'
                    : 'bg-[#070C1B] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#39E7FF]">
                      {u.branch === 'nova_ai' ? 'NOVA AI MODULE' : '3D FACILITY HARDWARE'}
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {u.unlocked ? 'INSTALLED' : `${u.costCredits} CR`}
                    </span>
                  </div>
                  <h4 className="text-base font-display font-bold text-white mt-1">{u.name}</h4>
                  <p className="text-xs text-slate-300 mt-1">{u.description}</p>
                  <div className="text-[11px] font-mono text-[#39E7FF] mt-2">
                    Benefit: {u.measurableBenefit}
                  </div>
                </div>

                {!u.unlocked && (
                  <button
                    type="button"
                    disabled={saveState.credits < u.costCredits}
                    onClick={() => onPurchaseUpgrade(u.id)}
                    className={`w-full py-1.5 rounded text-xs font-mono font-semibold cursor-pointer ${
                      saveState.credits >= u.costCredits
                        ? 'bg-[#278BFF] hover:bg-[#1B6FE0] text-white'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {saveState.credits >= u.costCredits
                      ? `Install Upgrade (${u.costCredits} CR)`
                      : `Requires ${u.costCredits} CR`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ====================================================================
            TAB 6: STORY LOGS & SCENE 8 MYSTERY (LAST_OPERATOR_LOG_184)
        ==================================================================== */}
        {activeTab === 'story_logs' && (
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
            {storyLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-xl border ${
                  log.isEncryptedMystery
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : 'bg-[#070C1B] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#39E7FF]">{log.code}</span>
                  <span className="text-[11px] font-mono text-slate-400">{log.timestampText}</span>
                </div>
                <h4 className="text-base font-display font-bold text-white mt-1">{log.title}</h4>
                <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                  {log.discovered
                    ? log.body
                    : '[UNDISCOVERED AUDIO RECORDING — Explore Central Command or complete Communication Centre restoration]'}
                </p>
                {log.id === 'log_184_mystery' && log.discovered && (
                  <div className="mt-3 p-3 rounded bg-[#050711] border border-amber-500/40 flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-300">
                      NOVA RESPONSE: &ldquo;Telemetry anomaly disregarded. No irregular directive
                      found in Sector 07 core.&rdquo;
                    </span>
                    <button
                      type="button"
                      onClick={onCompleteMysteryScene8}
                      className="px-3 py-1.5 rounded bg-[#278BFF] text-xs font-mono font-semibold text-white cursor-pointer"
                    >
                      Complete Chapter 01 Debrief →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ====================================================================
            TAB 7: SPACESHIP ROTUNDA BRIDGE BLUEPRINT & 5-CHAPTER CAMPAIGN MAP
        ==================================================================== */}
        {activeTab === 'mission_brief' && (
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
            {/* Reference Blueprint Showcase matching uploaded assets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-[#07141B] border border-[#1EE3CF]/40 flex flex-col gap-2.5">
                <div className="text-xs font-mono uppercase text-[#1EE3CF]">
                  SPACESHIP ROTUNDA BRIDGE ARCHITECTURE (SECTOR 00 CENTRAL COMMAND)
                </div>
                <img
                  src="/assets/aistudio/c80b58250380253.6a47d90422454_c5d21db8.jpg"
                  alt="Spaceship Rotunda Bridge Reference Blueprint"
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover rounded border border-[#1EE3CF]/50"
                />
                <p className="text-xs text-slate-300">
                  Recessed multi-ring overhead lighting dome, 12-segmented white/silver holoprojector
                  ring console, glowing cyan-blue continental Earth hologram, and illuminated sector
                  bay headers (<code>ХЕМОФОРМ</code> · <code>КВАНТОФОРМ</code> · <code>БИОФОРМ</code>).
                </p>
              </div>

              <div className="p-4 rounded bg-[#07141B] border border-[#A3E635]/40 flex flex-col gap-2.5">
                <div className="text-xs font-mono uppercase text-[#A3E635]">
                  SPACE-SHOOTER-UI9 TACTICAL HUD &amp; TERMINAL SPECIFICATION
                </div>
                <img
                  src="/assets/aistudio/Space-Shooter-UI9_a6c31201.webp"
                  alt="Space-Shooter-UI9 Tactical Interface Reference"
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover rounded border border-[#A3E635]/50"
                />
                <p className="text-xs text-slate-300">
                  Riveted teal header banners, chamfered folder-tab cards, 10-segment lime/cyan
                  Power &amp; Energy bars, and numbered yellow-badged action list controls.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#07141B] border border-[#1EE3CF]/35 rounded p-4">
                <div className="text-xs font-mono uppercase text-[#1EE3CF]">
                  SPACESHIP FACILITY 07 · FIVE SECTOR BAYS STATUS
                </div>
                <div className="space-y-2.5 mt-3">
                  {[
                    {
                      name: '01. Central Command Rotunda',
                      status: saveState.departments.central_command,
                      desc: '12-Segmented Earth Holotable, Recessed Ceiling Dome, NOVA AI Core & Maya Chen Engineering Desk.',
                    },
                    {
                      name: '02. ХЕМОФОРМ · Communication Centre',
                      status: saveState.departments.communication_centre,
                      desc: 'Google OAuth 2.0 Gmail read-only sync, .EML & .ZIP import, 9-category separation, and Inbox Rescue card mode.',
                    },
                    {
                      name: '03. АРХИВФОРМ · Archive Vault',
                      status: saveState.departments.archive_vault,
                      desc: 'SHA-256 content duplicate detection, same-name revision hold, and safe folder routing.',
                    },
                    {
                      name: '04. КВАНТОФОРМ · Financial Control',
                      status: saveState.departments.financial_control,
                      desc: 'CSV expense import, duplicate billing detection, and high-value outlier auditing.',
                    },
                    {
                      name: '05. БИОФОРМ · Systems Repair',
                      status: saveState.departments.systems_repair,
                      desc: 'Static code lint verification, NOVA plain-language explanations, and before/after diffs.',
                    },
                  ].map((dept) => (
                    <div
                      key={dept.name}
                      className="p-3 rounded bg-[#0A1D26] border border-[#1EE3CF]/25 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{dept.name}</div>
                        <div className="text-[11px] text-slate-300">{dept.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#07131A] text-[#A3E635] border border-[#A3E635]/40">
                        {dept.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#07141B] border border-[#1EE3CF]/35 rounded p-4">
                <div className="text-xs font-mono uppercase text-[#1EE3CF]">
                  CAMPAIGN CHAPTERS · THE LAST OPERATOR
                </div>
                <div className="space-y-2.5 mt-3">
                  {[
                    {
                      ch: 'Chapter 1: The Awakening (PLAYABLE NOW)',
                      desc: 'Wake in Maintenance Bay 01, restore the Substation Generator, enter the Earth Holo-Globe Rotunda, bring the Communication Centre online, and uncover LAST_OPERATOR_LOG_184.',
                    },
                    {
                      ch: 'Chapter 2: Lost Records (LOCKED — PLANNED)',
                      desc: 'Partner with records specialist Elias to reconstruct the Sector Eurus citizen registry inside the deep Archive Vault.',
                    },
                    {
                      ch: 'Chapter 3: The Ledger (LOCKED — PLANNED)',
                      desc: 'Trace Offshore Shell 99 dark-fiber transfers across Financial Control ledgers.',
                    },
                    {
                      ch: 'Chapter 4: System Failure (LOCKED — PLANNED)',
                      desc: 'Isolate recursive purge daemons in Systems Repair before substation overload.',
                    },
                    {
                      ch: 'Chapter 5: The Last Operator (LOCKED — PLANNED)',
                      desc: 'Confront the architects of THE BLACKOUT and decide the fate of NOVA Core.',
                    },
                  ].map((c) => (
                    <div
                      key={c.ch}
                      className="p-3 rounded bg-[#0A1D26] border border-[#1EE3CF]/25 flex flex-col gap-1"
                    >
                      <div className="text-xs font-bold text-white">{c.ch}</div>
                      <div className="text-[11px] text-slate-300">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
