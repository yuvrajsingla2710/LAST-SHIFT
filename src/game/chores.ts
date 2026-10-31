export type ChoreCategoryId = 'emails' | 'folders' | 'expenses' | 'lint';

export interface ChoreItem {
  id: string;
  categoryId: ChoreCategoryId;
  title: string;
  sourceDetail: string;
  targetAction: string;
  units: number; // e.g., number of emails, files, receipts, or lint warnings in this batch
  unitLabel: string;
  bytesSaved: number;
  timeSavedSeconds: number;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  resolutionSummary?: string;
}

export interface ChoreCategoryQueue {
  id: ChoreCategoryId;
  name: string;
  subtitle: string;
  sectorName: string;
  accentColor: string;
  totalUnitsTarget: number;
  unitLabel: string;
  items: ChoreItem[];
}

export interface ChoreExecutionLog {
  id: string;
  categoryId: ChoreCategoryId;
  title: string;
  actionTaken: string;
  unitsResolved: number;
  unitLabel: string;
  bytesSaved: number;
  timeSavedSeconds: number;
  triggerSource: 'kill' | 'combo' | 'overdrive' | 'wave_clear' | 'core_pickup';
  timestamp: string;
}

export interface ChoreEngineState {
  activeCategoryId: ChoreCategoryId;
  queues: Record<ChoreCategoryId, ChoreCategoryQueue>;
  logs: ChoreExecutionLog[];
  totals: {
    batchesResolved: number;
    unitsResolved: number;
    bytesSaved: number;
    timeSavedSeconds: number;
  };
}

export function createInitialChoreState(): ChoreEngineState {
  const emailSenders = [
    ['Promo_Digest_SaaS_Weekly', 'marketing@cloud-digest.io', 'Unsubscribe + Archive 250 threads', 250, 14800000, 180],
    ['GitHub_CI_Notifications_2024', 'notifications@github.com', 'Filter stale PR bots + Archive 420 emails', 420, 22400000, 310],
    ['Expired_Coupon_Blast_Retail', 'deals@megaretail-alerts.com', 'Purge 380 expired promo threads', 380, 19200000, 240],
    ['Jira_Automated_Status_Flood', 'jira@enterprise-workspace.net', 'Group by ticket + Archive 510 alerts', 510, 16500000, 360],
    ['Substack_Unread_Backlog_Q1', 'newsletter@substack.com', 'Extract top links + Archive 290 issues', 290, 31000000, 220],
    ['Calendar_Declined_Invites_Old', 'calendar-noreply@google.com', 'Purge 340 past event responses', 340, 8900000, 190],
    ['Stripe_Webhook_Test_Logs', 'support@stripe.com', 'Archive 610 sandbox receipt pings', 610, 18400000, 400],
    ['LinkedIn_Connection_Pings', 'messages-noreply@linkedin.com', 'Deduplicate + Archive 450 digests', 450, 15200000, 280],
    ['Cold_Outreach_SDR_Sequences', 'growth@b2b-leadgen-mail.io', 'Block domain + Purge 530 spam threads', 530, 24100000, 390],
    ['Cloud_Billing_Threshold_Alerts', 'noreply@googlecloud.com', 'Tag Finance_2025 + Archive 320 alerts', 320, 11300000, 210],
    ['Slack_Missed_Channel_Digests', 'no-reply@slack.com', 'Purge 480 redundant email mirrors', 480, 17600000, 290],
    ['Security_2FA_OTP_History', 'auth@login-services.org', 'Shred 420 expired verification codes', 420, 6400000, 250],
  ] as const;

  const folderBatches = [
    ['Desktop_Screenshots_2024_2026', '~/Desktop/Screen Shot 2025-*.png', 'Move 48 PNGs -> ~/Pictures/Screenshots/2025/', 48, 184000000, 260],
    ['Downloads_Duplicate_Installers', '~/Downloads/*.dmg, *.pkg, *(1).zip', 'Purge 32 duplicate installers & DMGs', 32, 1420000000, 340],
    ['Tax_Receipts_Unlabeled_PDFs', '~/Downloads/scan_001..045.pdf', 'OCR Rename -> ~/Documents/Finance/2026_Receipts/', 45, 92000000, 480],
    ['Camera_RAW_Dump_Unsorted', '~/Desktop/DCIM_Import_Misc/', 'Sort 64 RAW photos by EXIF date', 64, 890000000, 410],
    ['Project_Assets_Final_v2_REAL', '~/Documents/Client_Pitch_Final_FINAL/', 'Version-tag & archive 38 draft mockups', 38, 310000000, 290],
    ['Node_Modules_Orphan_Caches', '~/Projects/old-prototypes/*/node_modules', 'Prune 54 stale dependency caches', 54, 2150000000, 380],
    ['Audio_Voice_Memos_Untitled', '~/Downloads/Recording_1..36.m4a', 'Tag transcript topic -> ~/Audio/Memos/', 36, 145000000, 230],
    ['Spreadsheet_CSV_Exports', '~/Downloads/export (1)..(44).csv', 'Consolidate into ~/Data/Archive_CSVs/', 44, 67000000, 270],
    ['Design_Font_Zip_Bundles', '~/Downloads/*_Font_Family.zip', 'Install OTFs + Clean 29 unpacked folders', 29, 128000000, 195],
    ['Temp_Video_Render_Scratch', '~/Movies/Scratch_Renders_Temp/', 'Clear 30 unreferenced render proxies', 30, 1780000000, 310],
  ] as const;

  const expenseBatches = [
    ['AWS_EC2_S3_Monthly_Invoices', 'AWS EMEA SARL · $1,420.50 (18 line items)', 'Match PO #409 + Classify: Cloud Infrastructure', 18, 4200000, 320],
    ['Uber_Lyft_Client_Transit_Q3', '24 rides · SF / NYC Summit ($684.20)', 'Verify timestamps + Tag: Travel & Lodging', 24, 6800000, 390],
    ['Figma_Linear_Notion_Seats', '16 SaaS renewals ($940.00)', 'Reconcile active seats + Tag: Software Subscriptions', 16, 3900000, 260],
    ['Team_Offsite_Dining_Receipts', '19 itemized restaurant folios ($1,180.00)', 'Separate alcohol tax + Tag: Meals (50% Deductible)', 19, 8400000, 410],
    ['Delta_United_Flight_Folios', '12 e-ticket passenger receipts ($3,410.00)', 'Attach boarding passes + Approve Reimbursement', 12, 5100000, 290],
    ['Apple_Hardware_Peripherals', '14 adapters, monitors & cables ($1,890.00)', 'Log serial numbers + Tag: CapEx Equipment', 14, 4600000, 340],
    ['Google_Workspace_API_Usage', '22 billing statements ($760.80)', 'Allocate cost center: R&D Engineering', 22, 5300000, 280],
    ['CoWorking_Day_Passes_Remote', '15 WeWork / Industrious receipts ($525.00)', 'Validate remote policy + Approve payout', 15, 3400000, 230],
    ['Conference_Sponsorship_Booth', '20 vendor invoices ($2,650.00)', 'Verify W-9 attachment + Tag: Marketing Events', 20, 7200000, 360],
    ['Foreign_FX_SaaS_Transactions', '20 EUR/GBP card charges ($812.40)', 'Compute spot FX conversion + Reconcile ledger', 20, 4900000, 310],
  ] as const;

  const lintBatches = [
    ['src/auth/sessionManager.ts', '16x @typescript-eslint/no-explicit-any, unused imports', 'Infer strict SessionPayload types + remove dead imports', 16, 124000, 290],
    ['src/components/DataGrid.tsx', '18x react-hooks/exhaustive-deps & missing key props', 'Memoize row callbacks + assign deterministic row keys', 18, 98000, 340],
    ['src/api/billingWebhook.ts', '14x no-floating-promises & unhandled async catch', 'Wrap async handlers with explicit await + Result<T>', 14, 112000, 310],
    ['src/utils/dateFormatter.ts', '12x prefer-const, eqeqeq, no-shadow warnings', 'Normalize strict equality (===) + immutable bindings', 12, 64000, 180],
    ['src/store/SyncReducer.ts', '15x no-param-reassign & switch fallthrough', 'Convert to pure immutable state transitions', 15, 142000, 270],
    ['src/hooks/useRealtimeSocket.ts', '13x Memory leak: missing cleanup in useEffect', 'Add AbortController & socket.off() teardown', 13, 88000, 260],
    ['src/services/pdfExporter.ts', '14x no-console & deprecated Buffer constructor', 'Replace console.log with structured logger + Buffer.from()', 14, 76000, 210],
    ['src/styles/themeTokens.ts', '16x duplicate object keys & dead CSS variables', 'Deduplicate design tokens + tree-shake unused vars', 16, 94000, 230],
    ['src/workers/indexWorker.ts', '12x strict-boolean-expressions on nullable strings', 'Add explicit null/empty guards', 12, 68000, 195],
    ['src/routes/checkoutFlow.tsx', '12x jsx-a11y/aria-props & button-has-type', 'Add explicit type="button" & accessible labels', 12, 82000, 220],
  ] as const;

  const queues: Record<ChoreCategoryId, ChoreCategoryQueue> = {
    emails: {
      id: 'emails',
      name: 'Inbox Zero Purge',
      subtitle: 'Clean out 5,000 unread promotional, bot, and stale threads',
      sectorName: 'SECTOR 01 · SMTP RELAY RING',
      accentColor: '#39E7FF',
      totalUnitsTarget: 5000,
      unitLabel: 'emails',
      items: emailSenders.map(([title, sourceDetail, targetAction, units, bytesSaved, timeSavedSeconds], idx) => ({
        id: `email-batch-${idx + 1}`,
        categoryId: 'emails',
        title,
        sourceDetail,
        targetAction,
        units,
        unitLabel: 'emails',
        bytesSaved,
        timeSavedSeconds,
        status: 'pending',
      })),
    },
    folders: {
      id: 'folders',
      name: 'Messy Folder Triage',
      subtitle: 'Sort 420 chaotic Desktop & Downloads files into structured directories',
      sectorName: 'SECTOR 02 · FILE ALLOCATION NEBULA',
      accentColor: '#278BFF',
      totalUnitsTarget: 420,
      unitLabel: 'files',
      items: folderBatches.map(([title, sourceDetail, targetAction, units, bytesSaved, timeSavedSeconds], idx) => ({
        id: `folder-batch-${idx + 1}`,
        categoryId: 'folders',
        title,
        sourceDetail,
        targetAction,
        units,
        unitLabel: 'files',
        bytesSaved,
        timeSavedSeconds,
        status: 'pending',
      })),
    },
    expenses: {
      id: 'expenses',
      name: 'Q3 Expense Audit',
      subtitle: 'Categorize, tax-tag, and reconcile 180 unreviewed receipts',
      sectorName: 'SECTOR 03 · LEDGER CITADEL',
      accentColor: '#985BFF',
      totalUnitsTarget: 180,
      unitLabel: 'receipts',
      items: expenseBatches.map(([title, sourceDetail, targetAction, units, bytesSaved, timeSavedSeconds], idx) => ({
        id: `expense-batch-${idx + 1}`,
        categoryId: 'expenses',
        title,
        sourceDetail,
        targetAction,
        units,
        unitLabel: 'receipts',
        bytesSaved,
        timeSavedSeconds,
        status: 'pending',
      })),
    },
    lint: {
      id: 'lint',
      name: 'Codebase Lint Sweep',
      subtitle: 'Auto-patch 142 TypeScript, React Hooks, and AST lint violations',
      sectorName: 'SECTOR 04 · COMPILER CORE',
      accentColor: '#10B981',
      totalUnitsTarget: 142,
      unitLabel: 'lint fixes',
      items: lintBatches.map(([title, sourceDetail, targetAction, units, bytesSaved, timeSavedSeconds], idx) => ({
        id: `lint-batch-${idx + 1}`,
        categoryId: 'lint',
        title,
        sourceDetail,
        targetAction,
        units,
        unitLabel: 'lint fixes',
        bytesSaved,
        timeSavedSeconds,
        status: 'pending',
      })),
    },
  };

  return {
    activeCategoryId: 'emails',
    queues,
    logs: [],
    totals: {
      batchesResolved: 0,
      unitsResolved: 0,
      bytesSaved: 0,
      timeSavedSeconds: 0,
    },
  };
}

export function executeChoreBatchInState(
  state: ChoreEngineState,
  options: {
    categoryId?: ChoreCategoryId;
    triggerSource: ChoreExecutionLog['triggerSource'];
    intensity?: number;
  }
): {
  updatedState: ChoreEngineState;
  resolvedItems: ChoreItem[];
  newLogs: ChoreExecutionLog[];
} {
  const catId = options.categoryId ?? state.activeCategoryId;
  const countToResolve = Math.max(1, Math.min(3, Math.round(options.intensity ?? 1)));
  const queue = state.queues[catId];
  const pendingItems = queue.items.filter((item) => item.status === 'pending');

  // If active queue is 100% complete, either spill over to another pending queue or recycle virtual batches
  let targetQueue = queue;
  let targetPending = pendingItems;

  if (targetPending.length === 0) {
    const fallbackQueue = (Object.values(state.queues) as ChoreCategoryQueue[]).find(
      (q) => q.items.some((i) => i.status === 'pending')
    );
    if (fallbackQueue) {
      targetQueue = fallbackQueue;
      targetPending = fallbackQueue.items.filter((item) => item.status === 'pending');
    } else {
      // Dynamically generate a fresh deep-clean batch so continuous play always executes real work
      const syntheticIndex = targetQueue.items.length + 1;
      const syntheticItem: ChoreItem = {
        id: `${targetQueue.id}-deep-${syntheticIndex}`,
        categoryId: targetQueue.id,
        title: `Deep_Archive_Partition_${syntheticIndex}`,
        sourceDetail: `Automated background sweep #${syntheticIndex}`,
        targetAction: `Verified & compacted ${targetQueue.unitLabel}`,
        units: targetQueue.id === 'emails' ? 200 : 15,
        unitLabel: targetQueue.unitLabel,
        bytesSaved: 8500000,
        timeSavedSeconds: 150,
        status: 'pending',
      };
      targetQueue.items.push(syntheticItem);
      targetQueue.totalUnitsTarget += syntheticItem.units;
      targetPending = [syntheticItem];
    }
  }

  const resolvedItems: ChoreItem[] = [];
  const newLogs: ChoreExecutionLog[] = [];
  const nowIso = new Date().toISOString();

  for (let i = 0; i < countToResolve && i < targetPending.length; i++) {
    const item = targetPending[i];
    item.status = 'resolved';
    item.resolvedAt = nowIso;
    item.resolutionSummary = `${item.targetAction} (${item.units} ${item.unitLabel})`;
    resolvedItems.push(item);

    const logEntry: ChoreExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      categoryId: item.categoryId,
      title: item.title,
      actionTaken: item.targetAction,
      unitsResolved: item.units,
      unitLabel: item.unitLabel,
      bytesSaved: item.bytesSaved,
      timeSavedSeconds: item.timeSavedSeconds,
      triggerSource: options.triggerSource,
      timestamp: nowIso,
    };
    newLogs.push(logEntry);

    state.totals.batchesResolved += 1;
    state.totals.unitsResolved += item.units;
    state.totals.bytesSaved += item.bytesSaved;
    state.totals.timeSavedSeconds += item.timeSavedSeconds;
  }

  state.logs = [...newLogs, ...state.logs].slice(0, 60);

  return {
    updatedState: state,
    resolvedItems,
    newLogs,
  };
}

export function addCustomChoreToState(
  state: ChoreEngineState,
  input: {
    categoryId: ChoreCategoryId;
    title: string;
    sourceDetail: string;
    targetAction: string;
    units: number;
  }
): ChoreItem {
  const cleanTitle = input.title.trim();
  const cleanAction = input.targetAction.trim();
  if (!cleanTitle || !cleanAction || !Number.isFinite(input.units) || input.units <= 0) {
    throw new Error('Valid title, target action, and positive unit count are required.');
  }

  const queue = state.queues[input.categoryId];
  const newItem: ChoreItem = {
    id: `${input.categoryId}-custom-${Date.now()}`,
    categoryId: input.categoryId,
    title: cleanTitle,
    sourceDetail: input.sourceDetail.trim() || 'User Queued Chore',
    targetAction: cleanAction,
    units: Math.round(input.units),
    unitLabel: queue.unitLabel,
    bytesSaved: Math.round(input.units * 450000),
    timeSavedSeconds: Math.max(30, Math.round(input.units * 8)),
    status: 'pending',
  };

  queue.items.unshift(newItem);
  queue.totalUnitsTarget += newItem.units;
  return newItem;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${Math.round(bytes / 1_000_000)} MB`;
  }
  if (bytes >= 1_000) {
    return `${Math.round(bytes / 1_000)} KB`;
  }
  return `${Math.round(bytes)} B`;
}

export function formatMinutesSaved(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }
  return `${mins} min`;
}
