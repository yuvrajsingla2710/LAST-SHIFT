export type GameScreenMode =
  | 'title'
  | 'story_intro'
  | 'playing'
  | 'paused'
  | 'workstation'
  | 'chapter_complete';

export type WorkstationTab =
  | 'comm_email'
  | 'archive_files'
  | 'finance_csv'
  | 'systems_lint'
  | 'upgrades'
  | 'story_logs'
  | 'mission_brief';

export type DepartmentId =
  | 'central_command'
  | 'communication_centre'
  | 'archive_vault'
  | 'financial_control'
  | 'systems_repair';

export type DepartmentStatus = 'online' | 'offline' | 'locked' | 'restoring';

export type StorySceneId =
  | 'scene_1_wakeup'
  | 'scene_2_generator'
  | 'scene_3_command'
  | 'scene_4_maya'
  | 'scene_5_comm_restore'
  | 'scene_6_nova_analysis'
  | 'scene_7_archive_intro'
  | 'scene_8_mystery_log'
  | 'chapter_1_complete';

export type EmailCategory =
  | 'Important'
  | 'Personal'
  | 'Commercial / Business'
  | 'Promotional / Marketing'
  | 'Newsletters'
  | 'Invoices and Receipts'
  | 'Notifications'
  | 'Suspicious / Possible phishing'
  | 'Unclassified';

export type EmailPriority = 'Critical' | 'High' | 'Normal' | 'Low';

export type EmailStatus = 'unread' | 'kept' | 'archived' | 'flagged_review' | 'spam_quarantine';

export type EmailRecommendedAction =
  | 'Mark Important & Keep'
  | 'Keep in Active Inbox'
  | 'Archive'
  | 'Flag for Security Review'
  | 'Move to Accounting Queue';

export interface ParsedEmailItem {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  dateIso: string;
  preview: string;
  bodyText: string;
  headers: Record<string, string>;
  isSample: boolean;
  sourceFileName: string;
  // Classification & AI explanation
  category: EmailCategory;
  manualOverrideCategory?: EmailCategory;
  priority: EmailPriority;
  confidence: number; // 0..1
  analysisEngine: 'gemini-live' | 'deterministic-rule-engine';
  summary: string;
  whyItMatters: string;
  extractedDatesAndDeadlines: string[]; // Strictly extracted from text; never invented
   extractedAmounts: string[]; // Strictly extracted from text; never invented
  possibleRequiredAction: string;
  recommendedAction: EmailRecommendedAction;
  reasoningFacts: string[];
  reasoningAssumptions: string[];
  uncertaintyNote: string;
  status: EmailStatus;
  important: boolean;
  selected?: boolean;
}

export interface EmailOperationProposal {
  id: string;
  title: string;
  description: string;
  targetAction: 'archive' | 'mark_important' | 'flag_review' | 'keep';
  targetCategoryFilter?: EmailCategory[];
  affectedEmailIds: string[];
  exampleSubjects: string[];
  status: 'proposed' | 'approved_and_executed' | 'cancelled';
  executedAtIso?: string;
  verificationHash?: string;
}

export type ArchiveFileCategory =
  | 'Documents'
  | 'Work'
  | 'Personal'
  | 'Finance'
  | 'Receipts'
  | 'Images'
  | 'Videos'
  | 'Downloads'
  | 'Archive'
  | 'Review Required';

export type ArchiveDuplicateStatus = 'unique' | 'exact_hash_duplicate' | 'same_name_collision';

export interface ArchiveFileItem {
  id: string;
  fileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  lastModifiedIso: string;
  sha256Hash: string;
  isSample: boolean;
  contentPreview: string;
  detectedType:
    | 'Document'
    | 'Invoice'
    | 'Receipt'
    | 'Image'
    | 'Video'
    | 'Temporary / Log'
    | 'Archive'
    | 'Unknown';
  duplicateStatus: ArchiveDuplicateStatus;
  duplicateOfFileName?: string;
  suggestedFolder: ArchiveFileCategory;
  manualFolderOverride?: ArchiveFileCategory;
  explanation: string;
  recommendedAction: 'Move to Suggested Folder' | 'Quarantine Duplicate' | 'Hold for Manual Review';
  status: 'pending' | 'organized' | 'quarantined';
  selected?: boolean;
}

export interface ArchiveProposal {
  id: string;
  title: string;
  description: string;
  action: 'organize_to_folders' | 'quarantine_duplicates';
  affectedFileIds: string[];
  status: 'proposed' | 'approved_and_executed';
  executedAtIso?: string;
}

export interface FinancialTransactionItem {
  id: string;
  date: string;
  vendor: string;
  description: string;
  amount: number;
  currency: string;
  category:
    | 'Infrastructure & Cloud'
    | 'Hardware & Maintenance'
    | 'Software Subscriptions'
    | 'Contractor & Legal'
    | 'Travel & Logistics'
    | 'Unclassified';
  isDuplicate: boolean;
  duplicateOfId?: string;
  isUnusual: boolean;
  explanation: string;
  recommendedAction: 'Approve Expense' | 'Flag Duplicate Charge' | 'Audit Anomaly';
  status: 'pending' | 'approved' | 'flagged';
}

export interface CodeDiagnosticItem {
  id: string;
  filePath: string;
  line: number;
  column: number;
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  novaPlainExplanation: string;
  beforeSnippet: string;
  suggestedAfterSnippet: string;
  status: 'open' | 'approved_fixed' | 'ignored';
}

export interface NovaUpgradeNode {
  id: string;
  branch: 'nova_ai' | 'facility_hardware';
  name: string;
  level: number;
  maxLevel: number;
  costCredits: number;
  unlockRequirementText: string;
  requiredChapterScene?: StorySceneId;
  description: string;
  measurableBenefit: string;
  unlocked: boolean;
}

export interface StoryLogEntry {
  id: string;
  code: string;
  title: string;
  author: string;
  timestampText: string;
  location: string;
  body: string;
  discovered: boolean;
  isEncryptedMystery?: boolean;
}

export interface NovaChatMessage {
  id: string;
  sender: 'operator' | 'nova' | 'maya';
  timestampIso: string;
  text: string;
  engineBadge?: string;
  facts?: string[];
  assumptions?: string[];
}

export interface FacilityInteractiveObject {
  id: string;
  label: string;
  sublabel: string;
  room: string;
  position: [number, number, number];
  interactionRadius: number;
  type:
    | 'door'
    | 'breaker_switch'
    | 'main_lever'
    | 'comm_power_relay'
    | 'terminal_comm'
    | 'terminal_command'
    | 'terminal_archive'
    | 'terminal_finance'
    | 'terminal_systems'
    | 'terminal_upgrades'
    | 'npc_maya'
    | 'audio_log'
    | 'nova_core';
}

export interface FacilitySaveState {
  version: number;
  savedAtIso: string;
  operatorLevel: number;
  xp: number;
  xpToNext: number;
  credits: number;
  facilityTier: 1 | 2 | 3; // Level 1: Emergency, Level 2: Restored, Level 3: Advanced Quantum
  currentChapter: number;
  currentScene: StorySceneId;
  playerPosition: [number, number, number];
  playerYaw: number;
  // Physical puzzle & world state
  breakerSwitches: [boolean, boolean, boolean];
  mainGeneratorOnline: boolean;
  commPowerOnline: boolean;
  commTerminalActivated: boolean;
  talkedToMaya: boolean;
  inspectedCommandTable: boolean;
  discoveredLogIds: string[];
  unlockedUpgrades: Record<string, number>;
  departments: Record<DepartmentId, DepartmentStatus>;
  doorsOpen: Record<string, boolean>;
  verifiedOperationsCount: number;
  emailsProcessedCount: number;
  filesOrganizedCount: number;
  transactionsAuditedCount: number;
  lintIssuesResolvedCount: number;
}
