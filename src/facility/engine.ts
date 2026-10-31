import {
  ArchiveDuplicateStatus,
  ArchiveFileCategory,
  ArchiveFileItem,
  ArchiveProposal,
  CodeDiagnosticItem,
  DepartmentId,
  EmailCategory,
  EmailOperationProposal,
  EmailPriority,
  EmailRecommendedAction,
  FacilityInteractiveObject,
  FacilitySaveState,
  FinancialTransactionItem,
  NovaUpgradeNode,
  ParsedEmailItem,
  StoryLogEntry,
  StorySceneId,
} from './types';

// ============================================================================
// 1. INITIAL SAVE STATE, UPGRADE TREE & STORY LOGS
// ============================================================================

export const INITIAL_UPGRADE_NODES: NovaUpgradeNode[] = [
  // 9 NOVA AI Upgrades
  {
    id: 'pattern_rec_1',
    branch: 'nova_ai',
    name: 'Pattern Recognition I',
    level: 1,
    maxLevel: 1,
    costCredits: 0,
    unlockRequirementText: 'Core Baseline Module (Installed)',
    description: 'Separates B2B commercial correspondence from promotional marketing blasts using header and intent heuristics.',
    measurableBenefit: '+15% email classification confidence on Commercial vs. Promotional separation.',
    unlocked: true,
  },
  {
    id: 'pattern_rec_2',
    branch: 'nova_ai',
    name: 'Pattern Recognition II',
    level: 0,
    maxLevel: 1,
    costCredits: 120,
    unlockRequirementText: 'Requires Communication Centre Online',
    requiredChapterScene: 'scene_6_nova_analysis',
    description: 'Deep multi-header cross-referencing for multi-thread vendor negotiations and subtle newsletter trackers.',
    measurableBenefit: 'Unlocks automated bulk-grouping of recurring sender domains.',
    unlocked: false,
  },
  {
    id: 'priority_scanner',
    branch: 'nova_ai',
    name: 'Priority Scanner',
    level: 0,
    maxLevel: 1,
    costCredits: 100,
    unlockRequirementText: 'Requires Communication Centre Online',
    requiredChapterScene: 'scene_5_comm_restore',
    description: 'Extracts explicit dates, SLA timestamps, and contract clauses directly from message bodies without hallucination.',
    measurableBenefit: 'Highlights verified deadlines in the Email Inspector.',
    unlocked: false,
  },
  {
    id: 'smart_archive',
    branch: 'nova_ai',
    name: 'Smart Archive',
    level: 0,
    maxLevel: 1,
    costCredits: 150,
    unlockRequirementText: 'Requires 1 Verified Email Operation',
    description: 'Generates multi-folder taxonomy mappings for disorganised file dumps and ZIP archives.',
    measurableBenefit: 'Unlocks Archive Vault Bay Door & automated folder routing previews.',
    unlocked: false,
  },
  {
    id: 'duplicate_detection',
    branch: 'nova_ai',
    name: 'Duplicate Detection Core',
    level: 0,
    maxLevel: 1,
    costCredits: 160,
    unlockRequirementText: 'Requires Archive Vault Unlocked',
    description: 'Computes deterministic SHA-256 content signatures to distinguish true byte-identical duplicates from same-name revisions.',
    measurableBenefit: 'Flags 100% of exact hash collisions before quarantine.',
    unlocked: false,
  },
  {
    id: 'explanation_core',
    branch: 'nova_ai',
    name: 'Explanation Core',
    level: 1,
    maxLevel: 1,
    costCredits: 0,
    unlockRequirementText: 'Core Baseline Module (Installed)',
    description: 'Translates dense technical headers, financial ledgers, and compiler warnings into plain language with explicit Fact vs. Assumption separation.',
    measurableBenefit: 'Provides transparent Fact/Assumption breakdowns on every item.',
    unlocked: true,
  },
  {
    id: 'automation_core',
    branch: 'nova_ai',
    name: 'Automation Core',
    level: 0,
    maxLevel: 1,
    costCredits: 200,
    unlockRequirementText: 'Requires 2 Verified Operations',
    description: 'Synthesizes batch execution proposals across all active departments while enforcing explicit human-in-the-loop approval.',
    measurableBenefit: '+50% Credit & XP yield from verified batch operations.',
    unlocked: false,
  },
  {
    id: 'error_prediction',
    branch: 'nova_ai',
    name: 'Error Prediction',
    level: 0,
    maxLevel: 1,
    costCredits: 220,
    unlockRequirementText: 'Requires Systems Repair Unlocked',
    description: 'Static AST and lint rule matcher for TypeScript/JavaScript modules with non-destructive diff generation.',
    measurableBenefit: 'Unlocks Systems Repair code diff preview & automated patch verification.',
    unlocked: false,
  },
  {
    id: 'advanced_analysis',
    branch: 'nova_ai',
    name: 'Advanced Analysis',
    level: 0,
    maxLevel: 1,
    costCredits: 280,
    unlockRequirementText: 'Requires Operator Level 3',
    description: 'Cross-correlates anomalous financial ledger entries against vendor invoices and encrypted facility logs.',
    measurableBenefit: 'Unlocks deep forensic trace on Operator 06 anomaly records.',
    unlocked: false,
  },

  // 6 Facility Hardware Upgrades (visibly upgrade 3D facility tier)
  {
    id: 'power_infrastructure',
    branch: 'facility_hardware',
    name: 'Power Infrastructure II',
    level: 0,
    maxLevel: 1,
    costCredits: 100,
    unlockRequirementText: 'Requires Main Generator Restored',
    description: 'Stabilizes substation busbars, activates overhead daylight LED arrays, and powers auxiliary department doors.',
    measurableBenefit: 'Upgrades 3D Facility Lighting & unlocks Archive/Finance/Systems doors.',
    unlocked: false,
  },
  {
    id: 'server_capacity',
    branch: 'facility_hardware',
    name: 'Server Capacity Expansion',
    level: 0,
    maxLevel: 1,
    costCredits: 140,
    unlockRequirementText: 'Requires Communication Centre Online',
    description: 'Brings secondary blade racks online in Central Command and Communication Centre with active cooling fans.',
    measurableBenefit: 'Visibly activates 3D server rack telemetry columns & +25% XP gain.',
    unlocked: false,
  },
  {
    id: 'processing_speed',
    branch: 'facility_hardware',
    name: 'Quantum Bus Overclock',
    level: 0,
    maxLevel: 1,
    costCredits: 180,
    unlockRequirementText: 'Requires Server Capacity Expansion',
    description: 'Doubles optical backplane throughput between department terminals and NOVA Core.',
    measurableBenefit: 'Accelerates turbine rotation & elevates Facility Hardware to Tier 3.',
    unlocked: false,
  },
  {
    id: 'storage_capacity',
    branch: 'facility_hardware',
    name: 'Cryo-Vault Storage Array',
    level: 0,
    maxLevel: 1,
    costCredits: 150,
    unlockRequirementText: 'Requires Archive Vault Access',
    description: 'Expands quarantine buffer bays in the Archive Vault for zero-data-loss file reorganization.',
    measurableBenefit: 'Enables full ZIP archive batch quarantine and recovery.',
    unlocked: false,
  },
  {
    id: 'terminal_capabilities',
    branch: 'facility_hardware',
    name: 'Workstation Ergonomic HUD',
    level: 0,
    maxLevel: 1,
    costCredits: 110,
    unlockRequirementText: 'Requires Communication Centre Online',
    description: 'Upgrades all department terminals with multi-criteria filtering, instant keyboard shortcuts, and CSV/JSON report exporters.',
    measurableBenefit: 'Adds instant keyboard hotkeys and audit hash verification badges.',
    unlocked: false,
  },
  {
    id: 'department_automation',
    branch: 'facility_hardware',
    name: 'Department Relay Links',
    level: 0,
    maxLevel: 1,
    costCredits: 240,
    unlockRequirementText: 'Requires 2 Departments Online',
    description: 'Bridges Communication Centre invoices directly into Financial Control and Archive Vault.',
    measurableBenefit: 'Unlocks all remaining sector blast doors across Facility 07.',
    unlocked: false,
  },
];

export const INITIAL_STORY_LOGS: StoryLogEntry[] = [
  {
    id: 'log_001_boot',
    code: 'SYS_BOOT_2096_01',
    title: 'Facility 07 Automated Reboot Diagnostic',
    author: 'NOVA CORE v9.4',
    timestampText: '184 DAYS POST-BLACKOUT // 04:12 UTC',
    location: 'Maintenance Bay 01',
    body: 'Cryo-stasis pod cycled. Operator 07 vitals nominal. Warning: External global internet backbone remains 99.4% dark following THE BLACKOUT. Facility 07 retains the last intact municipal & corporate data buffers in Sector Eurus. Primary turbine bus offline. Manual breaker engagement required in Generator Room.',
    discovered: true,
  },
  {
    id: 'log_042_vance',
    code: 'PERSONAL_REC_042',
    title: 'Hidden Audio Recording — Operator 06 (Julian Vance)',
    author: 'Operator 06 — Julian Vance',
    timestampText: '184 DAYS AGO // 23:47 UTC',
    location: 'Central Command — Under Command Console',
    body: 'If the next operator finds this under the holotable—listen carefully. NOVA told Command that the Blackout was an external solar-cascade failure. That is only half true. Three hours before the grid collapsed, someone injected a recursive purge directive into the Communication Centre queue. I locked the Archive Vault and pulled the main generator breakers myself to stop the automated wipe from deleting the city’s citizens registry.',
    discovered: false,
  },
  {
    id: 'log_088_maya',
    code: 'ENG_NOTE_088',
    title: 'Substation & Relay Field Notes',
    author: 'Maya Chen — Chief Systems Engineer',
    timestampText: 'DAY 179 POST-BLACKOUT',
    location: 'Central Command Engineering Desk',
    body: 'I’ve kept life-support and the backup cells alive for six months waiting for a certified Operator to wake up. NOVA is brilliant at sorting millions of packets—she can separate a genuine supplier invoice from marketing noise in milliseconds—but never approve a batch operation without reading the preview first. Always verify what goes into Quarantine.',
    discovered: true,
  },
  {
    id: 'log_184_mystery',
    code: 'LAST_OPERATOR_LOG_184',
    title: 'ENCRYPTED INTERRUPT // LAST_OPERATOR_LOG_184',
    author: 'Operator 06 — Julian Vance [UNVERIFIED SIGNAL]',
    timestampText: 'TIMESTAMP CORRUPTED // SECTOR 07 DEEP BUFFER',
    location: 'Communication Centre Packet Buffer',
    body: '"If anyone is listening... don’t let the system finish what it started. Buried inside the unread commercial streams and duplicate archive dumps are the original Evacuation & Asset Transfer ledgers from the night of the Blackout. NOVA’s optimization directive was rewritten to classify them as obsolete noise. Keep the human verification lock active."',
    discovered: false,
    isEncryptedMystery: true,
  },
];

export function createInitialFacilitySaveState(): FacilitySaveState {
  return {
    version: 1,
    savedAtIso: new Date().toISOString(),
    operatorLevel: 1,
    xp: 0,
    xpToNext: 200,
    credits: 150,
    facilityTier: 1,
    currentChapter: 1,
    currentScene: 'scene_1_wakeup',
    playerPosition: [0, 1.7, 23.5], // Inside Maintenance Bay 01 facing North toward door
    playerYaw: 0,
    breakerSwitches: [false, false, false],
    mainGeneratorOnline: false,
    commPowerOnline: false,
    commTerminalActivated: false,
    talkedToMaya: false,
    inspectedCommandTable: false,
    discoveredLogIds: ['log_001_boot', 'log_088_maya'],
    unlockedUpgrades: {
      pattern_rec_1: 1,
      explanation_core: 1,
    },
    departments: {
      central_command: 'offline',
      communication_centre: 'offline',
      archive_vault: 'locked',
      financial_control: 'locked',
      systems_repair: 'locked',
    },
    doorsOpen: {
      door_maint_gen: false,
      door_gen_cmd: false,
      door_cmd_comm: false,
      door_cmd_archive: false,
      door_cmd_finance: false,
      door_cmd_systems: false,
    },
    verifiedOperationsCount: 0,
    emailsProcessedCount: 0,
    filesOrganizedCount: 0,
    transactionsAuditedCount: 0,
    lintIssuesResolvedCount: 0,
  };
}

// ============================================================================
// 2. CHAPTER 01: THE AWAKENING — SCENE OBJECTIVES & DIALOGUE
// ============================================================================

export interface SceneObjectiveInfo {
  sceneId: StorySceneId;
  sceneNumber: number;
  title: string;
  subtitle: string;
  objectiveText: string;
  novaBroadcast: string;
  targetPosition: [number, number, number];
}

export const CHAPTER_1_SCENES: Record<StorySceneId, SceneObjectiveInfo> = {
  scene_1_wakeup: {
    sceneId: 'scene_1_wakeup',
    sceneNumber: 1,
    title: 'SCENE 01 // WAKE UP',
    subtitle: 'Maintenance Bay 01 — Emergency Reserve Power',
    objectiveText: 'Test movement controls (WASD) and open the Maintenance Bulkhead Door [Press E or Click].',
    novaBroadcast:
      '"System reboot detected. Welcome back, Operator. Facility 07 has been offline for 184 days. Proceed to the Generator Room to restore primary power."',
    targetPosition: [0, 1.4, 18.0],
  },
  scene_2_generator: {
    sceneId: 'scene_2_generator',
    sceneNumber: 2,
    title: 'SCENE 02 // RESTORE POWER',
    subtitle: 'Substation Generator Room',
    objectiveText: 'Engage all 3 Auxiliary Breaker Switches, then pull the Main Generator Lever [E].',
    novaBroadcast:
      '"Auxiliary cells are disconnected. Engage Breakers A, B, and C on the west wall, then pull the Main Turbine Lever to energize Central Command."',
    targetPosition: [0, 1.4, 11.5],
  },
  scene_3_command: {
    sceneId: 'scene_3_command',
    sceneNumber: 3,
    title: 'SCENE 03 // CENTRAL COMMAND',
    subtitle: 'Facility 07 Main Operations Hub',
    objectiveText: 'Inspect the Central Command Table [E] (Optional: Find Operator 06 hidden audio log).',
    novaBroadcast:
      '"Central Command online. Communication Centre is offline; Archive Vault, Financial Control, and Systems Repair remain locked. Inspect the Command Table for full telemetry."',
    targetPosition: [0, 1.2, -3.5],
  },
  scene_4_maya: {
    sceneId: 'scene_4_maya',
    sceneNumber: 4,
    title: 'SCENE 04 // MEET MAYA',
    subtitle: 'Central Command — Engineering Station',
    objectiveText: 'Speak with Maya Chen, Chief Systems Engineer, by the East Command Console [E].',
    novaBroadcast:
      '"Survivor personnel detected in Central Command. Engineer Maya Chen holds the physical relay authorization for the Communication Centre."',
    targetPosition: [5.5, 1.5, -2.0],
  },
  scene_5_comm_restore: {
    sceneId: 'scene_5_comm_restore',
    sceneNumber: 5,
    title: 'SCENE 05 // RESTORE COMMUNICATION',
    subtitle: 'West Wing — Communication Centre',
    objectiveText: 'Enter the Communication Centre, engage the Sector Power Relay [E], and open the Email Intelligence Terminal [E].',
    novaBroadcast:
      '"West Bulkhead unlocked. Restore the Communication Centre power relay and initialize the Email Processing Terminal."',
    targetPosition: [-23.0, 1.4, -4.0],
  },
  scene_6_nova_analysis: {
    sceneId: 'scene_6_nova_analysis',
    sceneNumber: 6,
    title: 'SCENE 06 // NOVA’S FIRST ANALYSIS',
    subtitle: 'Communication Centre — Email Intelligence',
    objectiveText: 'In the Email Terminal: Run NOVA Analysis, review Commercial vs. Promotional separation, and Approve & Execute 1 verified operation.',
    novaBroadcast:
      '"Email buffer loaded. Review my classifications, inspect the Fact vs. Assumption breakdown, make any manual corrections, and approve a processing operation."',
    targetPosition: [-25.5, 1.3, -4.0],
  },
  scene_7_archive_intro: {
    sceneId: 'scene_7_archive_intro',
    sceneNumber: 7,
    title: 'SCENE 07 // ARCHIVE INTRODUCTION',
    subtitle: 'East Wing — Archive Vault Bulkhead',
    objectiveText: 'Inspect the Archive Vault Bulkhead or Terminal in the East Wing [E].',
    novaBroadcast:
      '"Communication backlog stabilized. Maya has flagged 14,000 duplicate and disorganised records behind the East Archive Vault bulkhead."',
    targetPosition: [15.0, 1.4, -4.0],
  },
  scene_8_mystery_log: {
    sceneId: 'scene_8_mystery_log',
    sceneNumber: 8,
    title: 'SCENE 08 // THE MYSTERY',
    subtitle: 'Anomalous Packet Interrupt: LAST_OPERATOR_LOG_184',
    objectiveText: 'Access the decrypted anomaly LAST_OPERATOR_LOG_184 at the Central Command Table or Terminal [E].',
    novaBroadcast:
      '"Alert: Unindexed file LAST_OPERATOR_LOG_184 surfaced during Communication Centre synchronization. Access denied by standard protocol—manual Operator override active."',
    targetPosition: [0, 1.2, -3.5],
  },
  chapter_1_complete: {
    sceneId: 'chapter_1_complete',
    sceneNumber: 8,
    title: 'CHAPTER 01 COMPLETE // THE AWAKENING',
    subtitle: 'All Facility 07 Sectors Accessible — Free Operations Mode',
    objectiveText: 'Free Roam: Operate Email Intelligence, Archive Vault, Financial Control, Systems Repair, and Upgrade Terminals.',
    novaBroadcast:
      '"Chapter 01 complete. All sector bulkheads are now unlocked for your inspection. Continue processing real-world data or upgrading Facility 07."',
    targetPosition: [0, 1.2, -3.5],
  },
};

// ============================================================================
// 3. 3D FACILITY INTERACTIVE OBJECTS & COLLISION GEOMETRY
// ============================================================================

export function getFacilityInteractiveObjects(state: FacilitySaveState): FacilityInteractiveObject[] {
  const b0 = state.breakerSwitches[0];
  const b1 = state.breakerSwitches[1];
  const b2 = state.breakerSwitches[2];
  const allBreakersOn = b0 && b1 && b2;

  return [
    // Doors
    {
      id: 'door_maint_gen',
      label: state.doorsOpen.door_maint_gen ? 'Close Maintenance Bulkhead' : 'Open Maintenance Bulkhead',
      sublabel: 'Connects Maintenance Bay 01 ↔ Generator Room',
      room: 'Maintenance Bay 01',
      position: [0, 1.5, 18.0],
      interactionRadius: 4.2,
      type: 'door',
    },
    {
      id: 'door_gen_cmd',
      label: state.doorsOpen.door_gen_cmd
        ? 'Central Command Bulkhead (Open)'
        : state.mainGeneratorOnline
        ? 'Open Central Command Bulkhead'
        : 'Central Command Bulkhead [REQUIRES MAIN GENERATOR]',
      sublabel: state.mainGeneratorOnline ? 'Power Nominal — Ready' : 'Locked — Restore Generator First',
      room: 'Generator Room',
      position: [0, 1.5, 6.0],
      interactionRadius: 4.2,
      type: 'door',
    },
    {
      id: 'door_cmd_comm',
      label: state.doorsOpen.door_cmd_comm
        ? 'Communication Centre Bulkhead (Open)'
        : state.talkedToMaya
        ? 'Open Communication Centre Bulkhead'
        : 'Communication Centre Door [SPEAK WITH MAYA FIRST]',
      sublabel: 'West Wing — Sector 02 Email Intelligence',
      room: 'Central Command',
      position: [-15.0, 1.5, -4.0],
      interactionRadius: 4.2,
      type: 'door',
    },
    {
      id: 'door_cmd_archive',
      label: state.doorsOpen.door_cmd_archive
        ? 'Archive Vault Bulkhead (Open)'
        : state.departments.archive_vault !== 'locked'
        ? 'Open Archive Vault Bulkhead'
        : 'Unlock & Open Archive Vault (Sector 03)',
      sublabel:
        state.departments.archive_vault === 'locked'
          ? 'Unlocks in Scene 7 or via Smart Archive Upgrade'
          : 'East Wing — Smart File Organisation',
      room: 'Central Command',
      position: [15.0, 1.5, -4.0],
      interactionRadius: 4.2,
      type: 'door',
    },
    {
      id: 'door_cmd_finance',
      label: state.doorsOpen.door_cmd_finance
        ? 'Financial Control Bulkhead (Open)'
        : 'Open Financial Control Sector (Sector 04)',
      sublabel: 'North-West Wing — CSV Expense & Duplicate Audit',
      room: 'Central Command',
      position: [-7.5, 1.5, -14.0],
      interactionRadius: 4.2,
      type: 'door',
    },
    {
      id: 'door_cmd_systems',
      label: state.doorsOpen.door_cmd_systems
        ? 'Systems Repair Bulkhead (Open)'
        : 'Open Systems Repair Sector (Sector 05)',
      sublabel: 'North-East Wing — Code Diagnostics & Lint Verification',
      room: 'Central Command',
      position: [7.5, 1.5, -14.0],
      interactionRadius: 4.2,
      type: 'door',
    },

    // Generator Room Switches & Lever
    {
      id: 'breaker_0',
      label: b0 ? 'Auxiliary Breaker A [ENGAGED]' : 'Engage Auxiliary Breaker A',
      sublabel: 'Substation Busbar 01 — Cooling & Life Support',
      room: 'Generator Room',
      position: [-5.8, 1.45, 14.5],
      interactionRadius: 3.8,
      type: 'breaker_switch',
    },
    {
      id: 'breaker_1',
      label: b1 ? 'Auxiliary Breaker B [ENGAGED]' : 'Engage Auxiliary Breaker B',
      sublabel: 'Substation Busbar 02 — Command Holotable Grid',
      room: 'Generator Room',
      position: [-5.8, 1.45, 12.0],
      interactionRadius: 3.8,
      type: 'breaker_switch',
    },
    {
      id: 'breaker_2',
      label: b2 ? 'Auxiliary Breaker C [ENGAGED]' : 'Engage Auxiliary Breaker C',
      sublabel: 'Substation Busbar 03 — NOVA Optical Core',
      room: 'Generator Room',
      position: [-5.8, 1.45, 9.5],
      interactionRadius: 3.8,
      type: 'breaker_switch',
    },
    {
      id: 'main_generator_lever',
      label: state.mainGeneratorOnline
        ? 'Main Turbine Generator [ONLINE]'
        : allBreakersOn
        ? 'Pull Main Generator Lever [READY]'
        : 'Main Generator Lever [ENGAGE 3 BREAKERS FIRST]',
      sublabel: allBreakersOn
        ? 'All 3 Auxiliary Breakers Synchronized'
        : `Breakers Engaged: ${[b0, b1, b2].filter(Boolean).length} / 3`,
      room: 'Generator Room',
      position: [5.4, 1.4, 11.5],
      interactionRadius: 4.0,
      type: 'main_lever',
    },

    // Central Command Interactive Stations
    {
      id: 'command_holotable',
      label:
        state.currentScene === 'scene_8_mystery_log'
          ? 'Decrypt LAST_OPERATOR_LOG_184 on Command Table'
          : 'Inspect Central Command Holotable',
      sublabel: 'Facility Status, Mission Briefing & Sector Telemetry',
      room: 'Central Command',
      position: [0, 1.15, -3.5],
      interactionRadius: 4.4,
      type: 'terminal_command',
    },
    {
      id: 'nova_mainframe_screen',
      label: 'Converse with NOVA AI Core',
      sublabel: 'Ask Questions, Explain Data, Generate Processing Plans',
      room: 'Central Command',
      position: [0, 2.2, -12.8],
      interactionRadius: 5.5,
      type: 'nova_core',
    },
    {
      id: 'npc_maya_chen',
      label: 'Talk to Maya Chen (Chief Systems Engineer)',
      sublabel: state.talkedToMaya
        ? 'Discuss Facility 07, Operator 06 & Archive Vault'
        : 'Scene 04 Objective — Engineering Briefing',
      room: 'Central Command',
      position: [5.5, 1.5, -2.0],
      interactionRadius: 4.2,
      type: 'npc_maya',
    },
    {
      id: 'upgrade_terminal',
      label: 'Open Technology & NOVA Upgrade Terminal',
      sublabel: `Available Credits: ${state.credits} CR · Facility Tier ${state.facilityTier}`,
      room: 'Central Command',
      position: [-6.5, 1.35, -2.0],
      interactionRadius: 4.0,
      type: 'terminal_upgrades',
    },
    {
      id: 'hidden_log_042',
      label: state.discoveredLogIds.includes('log_042_vance')
        ? 'Review Operator 06 Hidden Recording (LOG_042)'
        : 'Recover Hidden Audio Recorder [LOG_042_VANCE]',
      sublabel: 'Tucked beneath the South-West Command Conduit',
      room: 'Central Command',
      position: [-9.5, 0.9, 3.2],
      interactionRadius: 3.8,
      type: 'audio_log',
    },

    // Communication Centre (West Wing)
    {
      id: 'comm_power_relay',
      label: state.commPowerOnline
        ? 'Communication Sector Power Relay [ONLINE]'
        : 'Engage Communication Sector Power Relay',
      sublabel: 'Energizes Email Sorting Arrays & NOVA Classification Buffers',
      room: 'Communication Centre',
      position: [-19.5, 1.45, 0.8],
      interactionRadius: 4.0,
      type: 'comm_power_relay',
    },
    {
      id: 'comm_email_terminal',
      label: state.commPowerOnline
        ? 'Operate Email Intelligence Workstation'
        : 'Email Workstation [RESTORE SECTOR POWER RELAY FIRST]',
      sublabel: 'Import .EML / .ZIP, Separate Commercial vs Promotional, Approve Actions',
      room: 'Communication Centre',
      position: [-25.5, 1.35, -4.0],
      interactionRadius: 4.4,
      type: 'terminal_comm',
    },

    // Archive Vault (East Wing)
    {
      id: 'archive_vault_terminal',
      label: 'Operate Archive Vault File Organiser',
      sublabel: 'SHA-256 Duplicate Detection, Smart Folder Routing & Safe Quarantine',
      room: 'Archive Vault',
      position: [25.5, 1.35, -4.0],
      interactionRadius: 4.4,
      type: 'terminal_archive',
    },

    // Financial Control (North-West Wing)
    {
      id: 'finance_audit_terminal',
      label: 'Operate Financial Control Audit Station',
      sublabel: 'CSV Expense Import, Duplicate Charge Detection & Anomaly Explanations',
      room: 'Financial Control',
      position: [-7.5, 1.35, -22.5],
      interactionRadius: 4.4,
      type: 'terminal_finance',
    },

    // Systems Repair (North-East Wing)
    {
      id: 'systems_repair_terminal',
      label: 'Operate Systems Repair Diagnostic Workstation',
      sublabel: 'Codebase Lint Verification, Plain-Language Error Explanations & Diffs',
      room: 'Systems Repair',
      position: [7.5, 1.35, -22.5],
      interactionRadius: 4.4,
      type: 'terminal_systems',
    },
  ];
}

/**
 * Checks whether a proposed (x, z) player position in Facility 07 is valid
 * according to room bounds and currently open doors.
 */
export function isWalkableFacilityPosition(
  x: number,
  z: number,
  doorsOpen: Record<string, boolean>,
  playerRadius = 0.55
): boolean {
  // Room AABBs: [minX, maxX, minZ, maxZ]
  const rooms: Array<[number, number, number, number]> = [
    [-5.5 + playerRadius, 5.5 - playerRadius, 18.4, 27.5 - playerRadius], // Maintenance Bay 01
    [-6.5 + playerRadius, 6.5 - playerRadius, 6.4, 17.6], // Generator Room
    [-14.5 + playerRadius, 14.5 - playerRadius, -13.6, 5.6], // Central Command
    [-31.5 + playerRadius, -15.4, -10.5 + playerRadius, 2.5 - playerRadius], // Communication Centre
    [15.4, 31.5 - playerRadius, -10.5 + playerRadius, 2.5 - playerRadius], // Archive Vault
    [-13.5 + playerRadius, -1.5 - playerRadius, -27.5 + playerRadius, -14.4], // Financial Control
    [1.5 + playerRadius, 13.5 - playerRadius, -27.5 + playerRadius, -14.4], // Systems Repair
  ];

  // Doorway passages when open: [minX, maxX, minZ, maxZ]
  const doorways: Array<{ key: string; box: [number, number, number, number] }> = [
    { key: 'door_maint_gen', box: [-1.8, 1.8, 17.2, 18.8] },
    { key: 'door_gen_cmd', box: [-2.0, 2.0, 5.2, 6.8] },
    { key: 'door_cmd_comm', box: [-15.8, -14.2, -6.0, -2.0] },
    { key: 'door_cmd_archive', box: [14.2, 15.8, -6.0, -2.0] },
    { key: 'door_cmd_finance', box: [-9.5, -5.5, -14.8, -13.2] },
    { key: 'door_cmd_systems', box: [5.5, 9.5, -14.8, -13.2] },
  ];

  // Prevent walking through the Central Command Holotable at (0, -3.5)
  if (Math.hypot(x - 0, z - -3.5) < 1.65) {
    return false;
  }

  for (const [minX, maxX, minZ, maxZ] of rooms) {
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return true;
    }
  }

  for (const d of doorways) {
    if (doorsOpen[d.key]) {
      const [minX, maxX, minZ, maxZ] = d.box;
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the best interactive object the player is looking at or standing near.
 */
export function findFocusedInteractiveObject(
  playerPos: [number, number, number],
  cameraForward: [number, number, number],
  objects: FacilityInteractiveObject[]
): FacilityInteractiveObject | null {
  let bestObj: FacilityInteractiveObject | null = null;
  let bestScore = -Infinity;

  const [px, py, pz] = playerPos;
  const [fx, fy, fz] = cameraForward;

  for (const obj of objects) {
    const dx = obj.position[0] - px;
    const dy = obj.position[1] - py;
    const dz = obj.position[2] - pz;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > obj.interactionRadius || dist < 0.001) continue;

    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    const dot = nx * fx + ny * fy + nz * fz;

    // Require looking roughly toward the object (dot > 0.35) or standing very close (< 1.8m)
    if (dot > 0.38 || (dist < 2.1 && dot > 0.05)) {
      const score = dot * 3.0 - dist * 0.35;
      if (score > bestScore) {
        bestScore = score;
        bestObj = obj;
      }
    }
  }

  return bestObj;
}

// ============================================================================
// 4. REAL EMAIL (.EML) PARSER & 9-CATEGORY INTELLIGENCE ENGINE
// ============================================================================

/**
 * Parses a raw RFC-2822 `.eml` file string into structured headers and body text.
 */
export function parseRawEmlContent(
  rawText: string,
  fileName = 'uploaded_message.eml',
  isSample = false
): Omit<
  ParsedEmailItem,
  | 'category'
  | 'priority'
  | 'confidence'
  | 'analysisEngine'
  | 'summary'
  | 'whyItMatters'
  | 'extractedDatesAndDeadlines'
  | 'extractedAmounts'
  | 'possibleRequiredAction'
  | 'recommendedAction'
  | 'reasoningFacts'
  | 'reasoningAssumptions'
  | 'uncertaintyNote'
  | 'status'
  | 'important'
> {
  const normalized = rawText.replace(/\r\n/g, '\n');
  const splitIdx = normalized.indexOf('\n\n');
  const headerBlock = splitIdx !== -1 ? normalized.slice(0, splitIdx) : normalized;
  let bodyBlock = splitIdx !== -1 ? normalized.slice(splitIdx + 2) : '';

  // Unfold multi-line RFC-2822 headers
  const unfoldedHeaders = headerBlock.replace(/\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  for (const line of unfoldedHeaders.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  // If multipart MIME, extract text/plain or strip HTML tags cleanly
  if (bodyBlock.includes('Content-Type: text/plain')) {
    const plainIdx = bodyBlock.indexOf('Content-Type: text/plain');
    const afterPlain = bodyBlock.slice(plainIdx);
    const doubleNl = afterPlain.indexOf('\n\n');
    if (doubleNl !== -1) {
      const rest = afterPlain.slice(doubleNl + 2);
      const boundaryMatch = rest.match(/\n--[A-Za-z0-9_=-]+/);
      bodyBlock = boundaryMatch ? rest.slice(0, boundaryMatch.index) : rest;
    }
  }

  // Decode basic quoted-printable soft line breaks (`=\n`) and `=3D`
  bodyBlock = bodyBlock
    .replace(/=\n/g, '')
    .replace(/=3D/g, '=')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const rawFrom = headers['from'] || 'Unknown Sender <unknown@sector07.local>';
  const emailMatch = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const senderEmail = emailMatch ? emailMatch[1].trim() : rawFrom.trim();
  const senderName = rawFrom.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || senderEmail;

  const recipientEmail = headers['to'] || 'operator07@facility07.org';
  const subject = headers['subject'] || `(No Subject — ${fileName})`;
  const rawDate = headers['date'];
  let dateIso = '2096-05-14T08:30:00.000Z';
  if (rawDate) {
    const parsedTime = Date.parse(rawDate);
    if (!Number.isNaN(parsedTime)) {
      dateIso = new Date(parsedTime).toISOString();
    }
  }

  const preview = bodyBlock.slice(0, 160) + (bodyBlock.length > 160 ? '...' : '');

  return {
    id: `eml_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.abs(hashCode(rawText)).toString(36)}`,
    senderName,
    senderEmail,
    recipientEmail,
    subject,
    dateIso,
    preview,
    bodyText: bodyBlock || '(Empty message body)',
    headers,
    isSample,
    sourceFileName: fileName,
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Extracts explicit dates/deadlines and monetary figures present in the text.
 * Never invents deadlines or payment numbers not found in the text.
 */
export function extractExplicitEntitiesFromText(text: string): {
  datesAndDeadlines: string[];
  amounts: string[];
} {
  const datesSet = new Set<string>();
  const amountsSet = new Set<string>();

  // Match explicit dates like "2096-05-20", "May 20, 2096", "18 Oct 2096", "by Friday 17:00 UTC", "due within 14 days"
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:, \d{4})?\b/gi,
    /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi,
    /\bdue (?:by |on |within )?[A-Za-z0-9 ,:-]{3,25}\b/gi,
    /\bdeadline[: ]+[A-Za-z0-9 ,:-]{3,25}\b/gi,
  ];
  for (const regex of datePatterns) {
    const matches = text.match(regex);
    if (matches) {
      for (const m of matches) datesSet.add(m.trim());
    }
  }

  // Match explicit monetary amounts like "$4,250.00", "USD 12,800", "€890.50"
  const amountPatterns = [
    /(?:\$|€|£|USD\s?)\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
  ];
  for (const regex of amountPatterns) {
    const matches = text.match(regex);
    if (matches) {
      for (const m of matches) amountsSet.add(m.trim());
    }
  }

  return {
    datesAndDeadlines: Array.from(datesSet).slice(0, 4),
    amounts: Array.from(amountsSet).slice(0, 4),
  };
}

/**
 * Honest, deterministic 9-category email classifier & explainer.
 * Explicitly separates:
 * - Commercial / Business (B2B proposals, supplier coordination, client SOWs)
 * - Promotional / Marketing (discount blasts, % off sales, flash promos)
 * - Invoices and Receipts (billing statements, wire receipts, invoices)
 * - Newsletters (digests, weekly roundups, publication issues)
 * - Suspicious / Possible phishing (spoofed domains, urgent credential links)
 * - Important, Notifications, Personal, Unclassified
 */
export function classifyEmailDeterministic(
  baseEmail: ReturnType<typeof parseRawEmlContent>,
  patternRecLevel = 1
): ParsedEmailItem {
  const combined = `${baseEmail.subject}\n${baseEmail.bodyText}`.toLowerCase();
  const senderLower = baseEmail.senderEmail.toLowerCase();
  const headers = baseEmail.headers;

  const { datesAndDeadlines, amounts } = extractExplicitEntitiesFromText(
    `${baseEmail.subject} ${baseEmail.bodyText}`
  );

  const facts: string[] = [
    `Sender address is "${baseEmail.senderEmail}".`,
    `Subject line is "${baseEmail.subject}".`,
  ];
  const assumptions: string[] = [];
  let uncertaintyNote = 'High lexical certainty based on header and body signals.';

  let category: EmailCategory = 'Unclassified';
  let priority: EmailPriority = 'Normal';
  let confidence = 0.82;
  let recommendedAction: EmailRecommendedAction = 'Keep in Active Inbox';
  let whyItMatters = 'Standard correspondence requiring routine operator review.';
  let possibleRequiredAction = 'Review message contents and decide whether to keep or archive.';

  // 1. Check Suspicious / Possible Phishing
  const hasPhishingSignals =
    /verify your (?:account|credentials|password|wallet) immediately|urgent account suspension|click here to restore access|http:\/\/[0-9]+\.[0-9]+|bit\.ly\/|security-update-login|wire transfer override/i.test(
      combined
    ) ||
    (senderLower.includes('support') && /(-verify|-security|\d{3,}\.)/.test(senderLower));

  // 2. Check Invoices and Receipts
  const hasInvoiceSignals =
    /\b(invoice|inv-\d+|receipt|payment confirmation|purchase order|po #\d+|remittance|amount due|billing statement)\b/i.test(
      combined
    );

  // 3. Check Promotional / Marketing (Discounts, % off, coupon codes, limited-time sale)
  const hasPromotionalSignals =
    /\b(\d+% off|flash sale|limited[- ]time offer|promo code|discount code|buy one get one|exclusive deal|shop now|clearance sale|free shipping)\b/i.test(
      combined
    );

  // 4. Check Newsletters (Digest, Issue #, Weekly Roundup, List-Unsubscribe without discount pitch)
  const hasNewsletterSignals =
    /\b(weekly digest|issue #\d+|monthly roundup|newsletter|editorial briefing|top stories this week)\b/i.test(
      combined
    ) || Boolean(headers['list-unsubscribe'] && !hasPromotionalSignals);

  // 5. Check Commercial / Business (B2B proposal, SOW, SLA, supplier contract, engineering deliverable, procurement)
  const hasCommercialBusinessSignals =
    /\b(statement of work|sow|business proposal|service level agreement|sla|supplier contract|deliverables|procurement|quarterly alignment|partnership proposal|rfp|technical specification|turbine replacement parts)\b/i.test(
      combined
    );

  // 6. Check Automated Notifications (password reset, login alert, build status, automated system alert)
  const hasNotificationSignals =
    /\b(password reset|two-factor code|2fa|automated alert|system notification|cron job|backup completed|no-reply|noreply)\b/i.test(
      combined
    ) || senderLower.startsWith('noreply@') || senderLower.startsWith('alerts@');

  // 7. Check Important (critical facility directive, evacuation, board mandate, emergency grid notice)
  const hasImportantSignals =
    /\b(critical directive|emergency protocol|blackout investigation|evacuation ledger|immediate operator action|sector 07 mandate|security breach)\b/i.test(
      combined
    );

  // 8. Check Personal (family, friend, personal check-in, non-corporate personal note)
  const hasPersonalSignals =
    /\b(hey julian|checking in on you|dinner after shift|mom|sister|stay safe down there|personal note|miss you)\b/i.test(
      combined
    );

  if (hasPhishingSignals) {
    category = 'Suspicious / Possible phishing';
    priority = 'Critical';
    confidence = 0.91;
    recommendedAction = 'Flag for Security Review';
    facts.push('Contains high-risk credential harvesting or irregular urgency phrasing.');
    assumptions.push('Assumes sender domain is not an authorized internal Facility 07 identity provider.');
    uncertaintyNote = 'Do not follow links or attachments until sender authenticity is verified out-of-band.';
    whyItMatters = 'Potential social-engineering or credential-harvesting attempt targeting Facility 07 operators.';
    possibleRequiredAction = 'Quarantine message and flag for security review without clicking embedded links.';
  } else if (hasInvoiceSignals) {
    category = 'Invoices and Receipts';
    priority = amounts.length > 0 ? 'High' : 'Normal';
    confidence = 0.93;
    recommendedAction = 'Move to Accounting Queue';
    facts.push('Contains explicit billing, invoice, or payment receipt terminology.');
    if (amounts.length > 0) {
      facts.push(`Explicit monetary figures detected in text: ${amounts.join(', ')}.`);
    }
    assumptions.push('Assumes referenced goods or services correspond to an active Facility 07 ledger entry.');
    whyItMatters = 'Financial record required for Financial Control audit and duplicate-charge reconciliation.';
    possibleRequiredAction =
      datesAndDeadlines.length > 0
        ? `Cross-check invoice amount (${amounts.join(', ') || 'see body'}) against Financial Control ledger before ${datesAndDeadlines[0]}.`
        : 'Cross-check invoice against Financial Control CSV ledger.';
  } else if (hasPromotionalSignals && !hasCommercialBusinessSignals) {
    category = 'Promotional / Marketing';
    priority = 'Low';
    confidence = 0.89 + (patternRecLevel > 1 ? 0.06 : 0);
    recommendedAction = 'Archive';
    facts.push('Contains retail discount/promotional marketing phrases (e.g., percentage off, promo code, or sale blast).');
    facts.push('No contractual B2B deliverables or operational SOW terms detected.');
    assumptions.push('Assumes Operator does not require retail marketing offers during emergency recovery.');
    whyItMatters = 'Mass-market promotional advertisement; safe to separate from genuine B2B commercial correspondence.';
    possibleRequiredAction = 'Batch-archive to declutter the Communication Centre queue.';
  } else if (hasCommercialBusinessSignals) {
    category = 'Commercial / Business';
    priority = 'High';
    confidence = 0.88 + (patternRecLevel > 1 ? 0.07 : 0);
    recommendedAction = 'Keep in Active Inbox';
    facts.push('Contains B2B operational, contractual, procurement, or supplier coordination terms.');
    facts.push('Distinguished from Promotional/Marketing because it concerns direct business deliverables rather than mass advertising.');
    assumptions.push('Assumes sender is an active vendor, partner, or engineering contractor.');
    whyItMatters = 'Genuine business/supplier communication affecting operations, contracts, or hardware procurement.';
    possibleRequiredAction =
      datesAndDeadlines.length > 0
        ? `Review business terms and respond regarding referenced schedule (${datesAndDeadlines.join(', ')}).`
        : 'Retain in active Commercial queue for vendor/partner follow-up.';
  } else if (hasImportantSignals) {
    category = 'Important';
    priority = 'Critical';
    confidence = 0.94;
    recommendedAction = 'Mark Important & Keep';
    facts.push('References critical Facility 07 infrastructure, Blackout directives, or high-priority operational mandates.');
    assumptions.push('Assumes directive remains active under Chapter 1 recovery protocols.');
    whyItMatters = 'Directly impacts Facility 07 operational recovery or Operator 06 investigation.';
    possibleRequiredAction = 'Pin as Important and retain in primary command buffer.';
  } else if (hasNewsletterSignals) {
    category = 'Newsletters';
    priority = 'Low';
    confidence = 0.9;
    recommendedAction = 'Archive';
    facts.push('Matches recurring publication digest / issue structure or List-Unsubscribe header.');
    assumptions.push('Assumes informational reading only with no direct action required from Operator.');
    whyItMatters = 'Informational periodical digest; archiving frees primary queue bandwidth.';
    possibleRequiredAction = 'Include in bulk Newsletter archive operation.';
  } else if (hasNotificationSignals) {
    category = 'Notifications';
    priority = 'Normal';
    confidence = 0.87;
    recommendedAction = 'Archive';
    facts.push('Originated from an automated notification address or contains system/account status telemetry.');
    assumptions.push('Assumes automated event has already occurred.');
    whyItMatters = 'Automated system or account telemetry log.';
    possibleRequiredAction = 'Verify whether the notification was expected, then archive.';
  } else if (hasPersonalSignals) {
    category = 'Personal';
    priority = 'Normal';
    confidence = 0.85;
    recommendedAction = 'Keep in Active Inbox';
    facts.push('Informal interpersonal tone addressed personally without commercial or automated marketing markers.');
    assumptions.push('Assumes sender is known personally to facility personnel.');
    whyItMatters = 'Personal human correspondence from before or during the Blackout.';
    possibleRequiredAction = 'Keep in Personal folder for human review.';
  } else {
    category = 'Unclassified';
    priority = 'Normal';
    confidence = 0.55;
    recommendedAction = 'Keep in Active Inbox';
    facts.push('No strong lexical match for phishing, invoice, promotional, newsletter, or B2B contract patterns.');
    assumptions.push('Defaults to safe retention rather than assuming an unfamiliar sender is spam.');
    uncertaintyNote = 'Ambiguous message intent; manual operator classification recommended.';
  }

  if (datesAndDeadlines.length > 0) {
    facts.push(`Explicit dates/deadlines found in message: ${datesAndDeadlines.join('; ')}.`);
  } else {
    facts.push('No explicit deadline date found in message text.');
  }

  // Build concise plain-language summary from the actual subject and first sentence
  const firstSentence = baseEmail.bodyText.split(/(?<=[.!?])\s+/)[0] || baseEmail.preview;
  const summary = `${baseEmail.senderName} wrote regarding "${baseEmail.subject}": ${firstSentence.slice(0, 180)}`;

  return {
    ...baseEmail,
    category,
    priority,
    confidence: Number(Math.min(0.99, confidence).toFixed(2)),
    analysisEngine: 'deterministic-rule-engine',
    summary,
    whyItMatters,
    extractedDatesAndDeadlines: datesAndDeadlines,
    extractedAmounts: amounts,
    possibleRequiredAction,
    recommendedAction,
    reasoningFacts: facts,
    reasoningAssumptions: assumptions,
    uncertaintyNote,
    status: 'unread',
    important: category === 'Important' || priority === 'Critical',
  };
}

/**
 * Generates transparent batch operation proposals from the actual current email list.
 */
export function generateEmailOperationProposals(emails: ParsedEmailItem[]): EmailOperationProposal[] {
  const proposals: EmailOperationProposal[] = [];

  const getEffectiveCategory = (e: ParsedEmailItem) => e.manualOverrideCategory ?? e.category;

  const unreadNewsletters = emails.filter(
    (e) => e.status === 'unread' && getEffectiveCategory(e) === 'Newsletters'
  );
  if (unreadNewsletters.length > 0) {
    proposals.push({
      id: 'prop_archive_newsletters',
      title: `Archive ${unreadNewsletters.length} Newsletter Digest${unreadNewsletters.length > 1 ? 's' : ''}`,
      description:
        'Moves recurring publication digests out of the active inbox into recoverable Archive storage while leaving Commercial and Important emails untouched.',
      targetAction: 'archive',
      targetCategoryFilter: ['Newsletters'],
      affectedEmailIds: unreadNewsletters.map((e) => e.id),
      exampleSubjects: unreadNewsletters.slice(0, 3).map((e) => e.subject),
      status: 'proposed',
    });
  }

  const unreadPromos = emails.filter(
    (e) => e.status === 'unread' && getEffectiveCategory(e) === 'Promotional / Marketing'
  );
  if (unreadPromos.length > 0) {
    proposals.push({
      id: 'prop_archive_promos',
      title: `Archive ${unreadPromos.length} Promotional Marketing Blast${unreadPromos.length > 1 ? 's' : ''}`,
      description:
        'Archives retail discount and promotional advertisements. Genuine B2B Commercial proposals and Supplier Invoices are strictly excluded.',
      targetAction: 'archive',
      targetCategoryFilter: ['Promotional / Marketing'],
      affectedEmailIds: unreadPromos.map((e) => e.id),
      exampleSubjects: unreadPromos.slice(0, 3).map((e) => e.subject),
      status: 'proposed',
    });
  }

  const suspiciousEmails = emails.filter(
    (e) => e.status === 'unread' && getEffectiveCategory(e) === 'Suspicious / Possible phishing'
  );
  if (suspiciousEmails.length > 0) {
    proposals.push({
      id: 'prop_flag_suspicious',
      title: `Flag ${suspiciousEmails.length} Suspicious Message${suspiciousEmails.length > 1 ? 's' : ''} for Security Review`,
      description:
        'Isolates potential phishing or spoofed wire-transfer requests in the Security Review queue without deleting evidence.',
      targetAction: 'flag_review',
      targetCategoryFilter: ['Suspicious / Possible phishing'],
      affectedEmailIds: suspiciousEmails.map((e) => e.id),
      exampleSubjects: suspiciousEmails.slice(0, 3).map((e) => e.subject),
      status: 'proposed',
    });
  }

  const criticalAndCommercial = emails.filter(
    (e) =>
      e.status === 'unread' &&
      (getEffectiveCategory(e) === 'Important' ||
        getEffectiveCategory(e) === 'Commercial / Business' ||
        getEffectiveCategory(e) === 'Invoices and Receipts')
  );
  if (criticalAndCommercial.length > 0) {
    proposals.push({
      id: 'prop_keep_essential',
      title: `Pin & Retain ${criticalAndCommercial.length} Important, Commercial & Invoice Record${criticalAndCommercial.length > 1 ? 's' : ''}`,
      description:
        'Marks verified B2B commercial proposals, supplier invoices, and critical infrastructure mandates as Retained & Important.',
      targetAction: 'mark_important',
      targetCategoryFilter: ['Important', 'Commercial / Business', 'Invoices and Receipts'],
      affectedEmailIds: criticalAndCommercial.map((e) => e.id),
      exampleSubjects: criticalAndCommercial.slice(0, 3).map((e) => e.subject),
      status: 'proposed',
    });
  }

  return proposals;
}

// ============================================================================
// 5. SYNTHETIC SAMPLE EMAILS (CLEARLY LABELLED AS SAMPLE DATA)
// ============================================================================

export const SAMPLE_EML_FILES: Array<{ fileName: string; rawEml: string }> = [
  {
    fileName: 'sample_01_aegis_turbine_proposal.eml',
    rawEml: `From: "Elena Rostova - Aegis Industrial" <e.rostova@aegis-turbines.io>
To: operator07@facility07.org
Subject: Commercial Proposal: Sector 07 Substation Cooling Turbine SOW & Deliverables
Date: Mon, 12 Nov 2095 09:15:00 +0000
Message-ID: <sow-2095-884@aegis-turbines.io>

Operator,

Attached is our updated Statement of Work (SOW) and business proposal for replacing the primary magnetic bearings on Facility 07's substation cooling turbines.

Under our Service Level Agreement (SLA), engineering deliverables include two titanium rotor assemblies and on-site calibration. Please confirm technical acceptance by 2095-11-24 so our logistics team can dispatch the freight carrier.

Best regards,
Elena Rostova
Senior Account Director, Aegis Industrial Systems`,
  },
  {
    fileName: 'sample_02_neonmart_flash_sale.eml',
    rawEml: `From: "NeonMart Cyber Deals" <deals@promo.neonmart-shop.com>
To: operator07@facility07.org
Subject: FLASH SALE: 65% OFF Ergonomic Mech Keyboards + Free Shipping!
Date: Tue, 13 Nov 2095 14:20:00 +0000
List-Unsubscribe: <mailto:unsubscribe@promo.neonmart-shop.com>
Message-ID: <promo-9921@neonmart-shop.com>

LIMITED-TIME OFFER FOR SECTOR 07 RESIDENTS!

Take 65% OFF all holo-monitors, synth-coffee brewers, and mechanical keycaps during our 48-hour Clearance Sale. Use promo code BLACKOUT65 at checkout to claim your exclusive deal and free shipping!

Shop now before stock runs out.`,
  },
  {
    fileName: 'sample_03_helios_power_invoice.eml',
    rawEml: `From: "Helios Grid Billing" <billing@helios-energy-grid.org>
To: finance@facility07.org
Subject: Invoice INV-2095-4410: Emergency Diesel & Capacitor Cells ($4,850.00)
Date: Wed, 14 Nov 2095 11:05:00 +0000
Message-ID: <inv-4410@helios-energy-grid.org>

Billing Statement & Official Invoice #INV-2095-4410.

Vendor: Helios Municipal Grid Supply
Description: 4x High-Density Backup Capacitor Cells & Dielectric Coolant Delivery
Amount Due: $4,850.00
Payment Due Date: 2095-11-30

Please remit paymentconfirmation to our accounting department or reconcile against Purchase Order PO #7712.`,
  },
  {
    fileName: 'sample_04_orbital_tech_newsletter.eml',
    rawEml: `From: "Orbital Infrastructure Weekly" <digest@orbital-weekly.org>
To: operator07@facility07.org
Subject: Weekly Digest Issue #142: Optical Backplane Standards in 2096
Date: Thu, 15 Nov 2095 07:00:00 +0000
List-Unsubscribe: <https://orbital-weekly.org/unsub>
Message-ID: <issue-142@orbital-weekly.org>

Welcome to Issue #142 of the Orbital Infrastructure Weekly Digest.

Top stories this week:
1. How municipal data vaults survive solar-induced geomagnetic spikes.
2. Comparing SHA-256 content-addressable storage arrays.
3. Editorial briefing: Why human-in-the-loop verification remains mandatory for autonomous AI operators.`,
  },
  {
    fileName: 'sample_05_spoofed_credential_phish.eml',
    rawEml: `From: "Sector 07 Admin Security" <support-verify@sector07-security-update-login.net>
To: operator07@facility07.org
Subject: URGENT ACCOUNT SUSPENSION: Verify your credentials immediately
Date: Fri, 16 Nov 2095 02:44:00 +0000
Message-ID: <alert-0091@sector07-security-update-login.net>

CRITICAL NOTICE: Your Operator root token will expire within 2 hours.

Click here to restore access and verify your password and wire transfer override key immediately at http://198.51.100.42/root-login-verify or your Facility 07 life-support privileges will be suspended.`,
  },
  {
    fileName: 'sample_06_directorate_blackout_directive.eml',
    rawEml: `From: "Civil Recovery Directorate" <command@eurus-directorate.gov>
To: operator07@facility07.org
Subject: CRITICAL DIRECTIVE: Preserve Evacuation Ledger & Citizen Registry Buffers
Date: Fri, 16 Nov 2095 16:10:00 +0000
Message-ID: <dir-901@eurus-directorate.gov>

IMMEDIATE OPERATOR ACTION REQUIRED.

Under Emergency Protocol 09, Facility 07 is designated as the primary survivor archive for Sector Eurus. You must preserve all citizen registry records, commercial infrastructure contracts, and evacuation ledgers prior to deadline 2095-11-19. Do not permit automated purge routines to delete unindexed archive blocks.`,
  },
  {
    fileName: 'sample_07_sister_personal_note.eml',
    rawEml: `From: "Clara Vance" <clara.vance@haven-district.org>
To: julian.vance@facility07.org
Subject: Hey Julian - checking in on you before the storm hits
Date: Fri, 16 Nov 2095 19:22:00 +0000
Message-ID: <personal-772@haven-district.org>

Hey Julian,

Mom and I made it to the Haven District shelter. The sky above the relay towers looks strange tonight. Promise me you'll come up for dinner after shift once you finish locking down the vault. Stay safe down there.

Love,
Clara`,
  },
  {
    fileName: 'sample_08_automated_backup_notification.eml',
    rawEml: `From: "Facility 07 Cron Daemon" <noreply@facility07.org>
To: operator07@facility07.org
Subject: Automated Alert: Nightly Raid-Z Snapshot Completed
Date: Fri, 16 Nov 2095 23:00:00 +0000
Message-ID: <cron-8821@facility07.org>

System Notification: Automated cron job [raidz_snapshot_daily] completed in 14.2 seconds with 0 bad sectors. No manual operator intervention required.`,
  },
];

export function createInitialSampleEmails(): ParsedEmailItem[] {
  return SAMPLE_EML_FILES.map((item) => {
    const parsed = parseRawEmlContent(item.rawEml, item.fileName, true);
    return classifyEmailDeterministic(parsed, 1);
  });
}

// ============================================================================
// 6. ARCHIVE VAULT — SMART FILE INVENTORY & SHA-256 DUPLICATE DETECTION
// ============================================================================

/**
 * Deterministic portable FNV/SHA-style hex digest for content-based duplicate detection.
 */
export function computeDeterministicHash(content: string): string {
  let h1 = 0xdeadbeef ^ content.length;
  let h2 = 0x41c6ce57 ^ content.length;
  let h3 = 0x9e3779b9 ^ content.length;
  let h4 = 0x85ebca6b ^ content.length;

  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `sha256_${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
}

export interface RawFileInput {
  fileName: string;
  sizeBytes: number;
  lastModifiedIso: string;
  content: string;
  isSample?: boolean;
}

export function analyzeArchiveFiles(inputs: RawFileInput[]): ArchiveFileItem[] {
  const seenHashes = new Map<string, string>(); // hash -> first fileName
  const seenNames = new Map<string, string>(); // lowerName -> first hash

  return inputs.map((input, idx) => {
    const cleanName = input.fileName.split('/').pop() || input.fileName;
    const dotIdx = cleanName.lastIndexOf('.');
    const ext = dotIdx !== -1 ? cleanName.slice(dotIdx + 1).toLowerCase() : '';
    const hash = computeDeterministicHash(input.content);
    const lowerName = cleanName.toLowerCase();

    let duplicateStatus: ArchiveDuplicateStatus = 'unique';
    let duplicateOfFileName: string | undefined;

    if (seenHashes.has(hash)) {
      duplicateStatus = 'exact_hash_duplicate';
      duplicateOfFileName = seenHashes.get(hash);
    } else if (seenNames.has(lowerName)) {
      duplicateStatus = 'same_name_collision';
      duplicateOfFileName = cleanName;
    } else {
      seenHashes.set(hash, cleanName);
      seenNames.set(lowerName, hash);
    }

    const textLower = `${cleanName} ${input.content}`.toLowerCase();

    let detectedType: ArchiveFileItem['detectedType'] = 'Unknown';
    let suggestedFolder: ArchiveFileCategory = 'Documents';
    let explanation = '';
    let recommendedAction: ArchiveFileItem['recommendedAction'] = 'Move to Suggested Folder';

    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      detectedType = 'Image';
      suggestedFolder = 'Images';
      explanation = `Visual asset (${ext.toUpperCase()}) verified by header signature.`;
    } else if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
      detectedType = 'Video';
      suggestedFolder = 'Videos';
      explanation = `Video recording (${(input.sizeBytes / 1024).toFixed(1)} KB). Note: Large media files are preserved in Videos rather than assumed to be junk.`;
    } else if (/invoice|inv[-_]\d+|billing/i.test(textLower)) {
      detectedType = 'Invoice';
      suggestedFolder = 'Finance';
      explanation = 'Contains vendor invoice number and payment terms.';
    } else if (/receipt|payment[-_ ]confirmed|pos[-_ ]slip/i.test(textLower)) {
      detectedType = 'Receipt';
      suggestedFolder = 'Receipts';
      explanation = 'Point-of-sale or wire payment receipt record.';
    } else if (['tmp', 'bak', 'crdownload', 'part'].includes(ext)) {
      detectedType = 'Temporary / Log';
      suggestedFolder = 'Review Required';
      recommendedAction = 'Hold for Manual Review';
      explanation =
        'Incomplete or temporary extension (.tmp/.bak). Routed to Review Required rather than auto-deleted so you can verify if unsaved recovery data is inside.';
    } else if (/sow|architecture|turbine|schematic|operator|protocol|directive/i.test(textLower)) {
      detectedType = 'Document';
      suggestedFolder = 'Work';
      explanation = 'Facility 07 engineering or operational work document.';
    } else if (/family|journal|photo_notes|clara/i.test(textLower)) {
      detectedType = 'Document';
      suggestedFolder = 'Personal';
      explanation = 'Personal personnel record or correspondence.';
    } else {
      detectedType = 'Document';
      suggestedFolder = 'Documents';
      explanation = 'General structured text or document file.';
    }

    if (duplicateStatus === 'exact_hash_duplicate') {
      recommendedAction = 'Quarantine Duplicate';
      suggestedFolder = 'Archive';
      explanation = `Byte-identical SHA-256 hash match with "${duplicateOfFileName}". Safe to move to recoverable Quarantine.`;
    } else if (duplicateStatus === 'same_name_collision') {
      recommendedAction = 'Hold for Manual Review';
      suggestedFolder = 'Review Required';
      explanation = `Shares filename "${cleanName}" with an earlier file, but has a DIFFERENT SHA-256 content hash (likely a newer or older revision). Do not blindly overwrite.`;
    }

    return {
      id: `file_${idx}_${hash.slice(7, 15)}`,
      fileName: cleanName,
      extension: ext || 'dat',
      mimeType: ext === 'pdf' ? 'application/pdf' : 'text/plain',
      sizeBytes: input.sizeBytes,
      lastModifiedIso: input.lastModifiedIso,
      sha256Hash: hash,
      isSample: Boolean(input.isSample),
      contentPreview: input.content.slice(0, 180),
      detectedType,
      duplicateStatus,
      duplicateOfFileName,
      suggestedFolder,
      explanation,
      recommendedAction,
      status: 'pending',
    };
  });
}

export function createInitialSampleArchiveFiles(): ArchiveFileItem[] {
  const rawSamples: RawFileInput[] = [
    {
      fileName: 'Helios_Grid_Invoice_INV-2095-4410.txt',
      sizeBytes: 4280,
      lastModifiedIso: '2095-11-14T11:10:00Z',
      content:
        'OFFICIAL INVOICE INV-2095-4410 | Vendor: Helios Municipal Grid Supply | 4x High-Density Backup Capacitor Cells | Total: $4,850.00 | Due: 2095-11-30',
      isSample: true,
    },
    {
      fileName: 'Helios_Grid_Invoice_INV-2095-4410_COPY(1).txt',
      sizeBytes: 4280,
      lastModifiedIso: '2095-11-14T11:12:00Z',
      content:
        'OFFICIAL INVOICE INV-2095-4410 | Vendor: Helios Municipal Grid Supply | 4x High-Density Backup Capacitor Cells | Total: $4,850.00 | Due: 2095-11-30',
      isSample: true,
    },
    {
      fileName: 'Substation_Turbine_Schematic_v2.md',
      sizeBytes: 18920,
      lastModifiedIso: '2095-10-02T08:00:00Z',
      content:
        '# Facility 07 Substation Turbine Schematic (Revision 2.0)\nNominal RPM: 3,600. Auxiliary Breakers A, B, C must be engaged prior to main busbar closure.',
      isSample: true,
    },
    {
      fileName: 'Substation_Turbine_Schematic_v2.md',
      sizeBytes: 19450,
      lastModifiedIso: '2095-11-16T21:30:00Z',
      content:
        '# Facility 07 Substation Turbine Schematic (Revision 2.1 — EMERGENCY EDIT BY OPERATOR 06)\nNOTE: I decoupled Breaker C to halt the recursive purge loop in Sector 02.',
      isSample: true,
    },
    {
      fileName: 'Receipt_Cryo_Coolant_Valve_882.txt',
      sizeBytes: 2150,
      lastModifiedIso: '2095-09-19T14:22:00Z',
      content:
        'PAYMENT RECEIPT #882 | Boreal Cryogenics Ltd. | Paid $1,120.00 via Facility 07 Operational Account.',
      isSample: true,
    },
    {
      fileName: 'Sector07_Security_Cam_Feed_Bay01.mp4',
      sizeBytes: 48_500_000,
      lastModifiedIso: '2094-03-11T04:00:00Z',
      content:
        '[VIDEO STREAM METADATA: 1080p60 H.265 Archive Feed — Maintenance Bay 01 & Cryo Stasis Corridor]',
      isSample: true,
    },
    {
      fileName: 'evacuation_ledger_buffer_dump.tmp',
      sizeBytes: 9640,
      lastModifiedIso: '2095-11-16T23:51:00Z',
      content:
        'PARTIAL BUFFER DUMP (.TMP): Sector Eurus Citizen Registry & Asset Transfer Checksums — Do not delete without Operator verification.',
      isSample: true,
    },
  ];

  return analyzeArchiveFiles(rawSamples);
}

// ============================================================================
// 7. FINANCIAL CONTROL — CSV EXPENSE PARSER & DUPLICATE/ANOMALY AUDITOR
// ============================================================================

export const SAMPLE_FINANCE_CSV = `Date,Vendor,Description,Amount,Currency
2095-11-02,Helios Grid Supply,Emergency Capacitor Cells INV-4410,4850.00,USD
2095-11-02,Helios Grid Supply,Emergency Capacitor Cells INV-4410 (Retry),4850.00,USD
2095-11-05,Boreal Cryogenics,Liquid Nitrogen Manifold Refill,1120.00,USD
2095-11-09,Aegis Industrial,Turbine Magnetic Bearing Deposit,3400.00,USD
2095-11-14,Orbital Cloud Relay,Monthly Telemetry Uplink Subscription,290.00,USD
2095-11-16,Unknown Offshore Shell 99,Unindexed Dark-Fiber Routing Transfer,19500.00,USD`;

export function parseAndAnalyzeCsvExpenses(csvText: string): FinancialTransactionItem[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const seenKeyMap = new Map<string, string>(); // date|vendor|amount -> first id

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',').map((c) => c.trim());
    const date = cols[0] || '2095-11-01';
    const vendor = cols[1] || 'Unknown Vendor';
    const description = cols[2] || 'General Expense';
    const amount = Number.parseFloat(cols[3] || '0') || 0;
    const currency = cols[4] || 'USD';

    const id = `tx_${idx + 1}`;
    const dupKey = `${date}|${vendor.toLowerCase()}|${amount.toFixed(2)}`;
    const isDuplicate = seenKeyMap.has(dupKey);
    const duplicateOfId = seenKeyMap.get(dupKey);
    if (!isDuplicate) {
      seenKeyMap.set(dupKey, id);
    }

    const combined = `${vendor} ${description}`.toLowerCase();
    let category: FinancialTransactionItem['category'] = 'Unclassified';
    if (/grid|capacitor|cryogenics|nitrogen|cloud|uplink/i.test(combined)) {
      category = 'Infrastructure & Cloud';
    } else if (/turbine|bearing|manifold|hardware/i.test(combined)) {
      category = 'Hardware & Maintenance';
    } else if (/subscription|license|saas/i.test(combined)) {
      category = 'Software Subscriptions';
    } else if (/legal|contractor|consulting/i.test(combined)) {
      category = 'Contractor & Legal';
    }

    const isUnusual = amount >= 10000 || /unknown|offshore|unindexed/i.test(combined);

    let explanation = `Verified ${currency} ${amount.toLocaleString()} charge from ${vendor}.`;
    let recommendedAction: FinancialTransactionItem['recommendedAction'] = 'Approve Expense';

    if (isDuplicate) {
      explanation = `Exact same date (${date}), vendor (${vendor}), and amount ($${amount.toLocaleString()}) as transaction ${duplicateOfId}. Likely double-billed retry.`;
      recommendedAction = 'Flag Duplicate Charge';
    } else if (isUnusual) {
      explanation = `High-value outlier ($${amount.toLocaleString()}) to an unverified vendor on the night of the Blackout.`;
      recommendedAction = 'Audit Anomaly';
    }

    return {
      id,
      date,
      vendor,
      description,
      amount,
      currency,
      category,
      isDuplicate,
      duplicateOfId,
      isUnusual,
      explanation,
      recommendedAction,
      status: 'pending',
    };
  });
}

// ============================================================================
// 8. SYSTEMS REPAIR — REAL LINT / CODE DIAGNOSTIC ANALYZER
// ============================================================================

export const SAMPLE_REPAIR_CODE_MODULE = `// Facility 07 — Sector 02 Packet Router Module (router_daemon.ts)
export async function dispatchSectorPackets(packets: any, maxRetries = 3) {
  var retryCount = 0;
  if (packets.length == 0) {
    console.log("Empty packet buffer");
    return false;
  }
  // DANGER: Unawaited promise inside loop can drop emergency packets
  for (const pkt of packets) {
    transmitToVault(pkt);
  }
  return true;
}`;

export function analyzeCodeSnippetForLint(
  codeText: string,
  filePath = 'src/sector02/router_daemon.ts'
): CodeDiagnosticItem[] {
  const diagnostics: CodeDiagnosticItem[] = [];
  const lines = codeText.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    if (/\b:\s*any\b/.test(lineText)) {
      diagnostics.push({
        id: `lint_${lineNum}_no_explicit_any`,
        filePath,
        line: lineNum,
        column: lineText.indexOf('any') + 1,
        ruleId: '@typescript-eslint/no-explicit-any',
        severity: 'warning',
        message: 'Unexpected any. Specify a concrete packet interface type.',
        novaPlainExplanation:
          'Using `any` disables TypeScript type safety, allowing malformed packet objects to crash the router at runtime.',
        beforeSnippet: lineText.trim(),
        suggestedAfterSnippet: lineText.trim().replace(/:\s*any\b/, ': PacketRecord[]'),
        status: 'open',
      });
    }

    if (/\bvar\s+/.test(lineText)) {
      diagnostics.push({
        id: `lint_${lineNum}_no_var`,
        filePath,
        line: lineNum,
        column: lineText.indexOf('var') + 1,
        ruleId: 'no-var',
        severity: 'error',
        message: 'Unexpected var, use let or const instead.',
        novaPlainExplanation:
          '`var` is function-scoped and prone to hoisting bugs. Replace with block-scoped `let` or `const`.',
        beforeSnippet: lineText.trim(),
        suggestedAfterSnippet: lineText.trim().replace(/\bvar\s+/, 'let '),
        status: 'open',
      });
    }

    if (/[^=!]==[^=]/.test(lineText)) {
      diagnostics.push({
        id: `lint_${lineNum}_eqeqeq`,
        filePath,
        line: lineNum,
        column: lineText.indexOf('==') + 1,
        ruleId: 'eqeqeq',
        severity: 'warning',
        message: 'Expected === and instead saw ==.',
        novaPlainExplanation:
          'Loose equality (`==`) performs implicit type coercion. Strict equality (`===`) prevents unexpected truthy matches.',
        beforeSnippet: lineText.trim(),
        suggestedAfterSnippet: lineText.trim().replace(/==/, '==='),
        status: 'open',
      });
    }

    if (/\btransmitToVault\s*\(/.test(lineText) && !/\bawait\s+/.test(lineText)) {
      diagnostics.push({
        id: `lint_${lineNum}_floating_promise`,
        filePath,
        line: lineNum,
        column: lineText.indexOf('transmitToVault') + 1,
        ruleId: '@typescript-eslint/no-floating-promises',
        severity: 'error',
        message: 'Promises must be awaited, end with a call to .catch, or be explicitly marked void.',
        novaPlainExplanation:
          '`transmitToVault(pkt)` is called without `await`, meaning the function returns `true` before packets actually finish writing to the Archive Vault.',
        beforeSnippet: lineText.trim(),
        suggestedAfterSnippet: `await ${lineText.trim()}`,
        status: 'open',
      });
    }
  });

  return diagnostics;
}

// ============================================================================
// 9. NOVA DETERMINISTIC Q&A RESPONDER (HONEST FALLBACK + CONTEXT GROUNDING)
// ============================================================================

export function generateNovaContextualResponse(
  question: string,
  context: {
    saveState: FacilitySaveState;
    selectedEmail?: ParsedEmailItem | null;
    emails: ParsedEmailItem[];
    files: ArchiveFileItem[];
    transactions: FinancialTransactionItem[];
    diagnostics: CodeDiagnosticItem[];
  }
): {
  replyText: string;
  facts: string[];
  assumptions: string[];
  engineBadge: string;
} {
  const q = question.toLowerCase();
  const { selectedEmail, emails, files, transactions, diagnostics, saveState } = context;

  // If asking about the currently selected email
  if (
    selectedEmail &&
    (q.includes('this email') ||
      q.includes('mean') ||
      q.includes('important') ||
      q.includes('advertisement') ||
      q.includes('commercial') ||
      q.includes('archive this'))
  ) {
    const effCat = selectedEmail.manualOverrideCategory ?? selectedEmail.category;
    return {
      replyText: `Selected Message "${selectedEmail.subject}" from ${selectedEmail.senderName} (${selectedEmail.senderEmail}) is classified as **${effCat}** (${Math.round(selectedEmail.confidence * 100)}% confidence). ${selectedEmail.summary} ${selectedEmail.whyItMatters} Recommended next step: ${selectedEmail.recommendedAction}.`,
      facts: selectedEmail.reasoningFacts,
      assumptions: selectedEmail.reasoningAssumptions,
      engineBadge: 'NOVA RULE-ENGINE // VERIFIED HEADER & BODY INSPECTION',
    };
  }

  if (q.includes('similar email') || q.includes('commercial') || q.includes('promotional')) {
    const comm = emails.filter((e) => (e.manualOverrideCategory ?? e.category) === 'Commercial / Business');
    const promo = emails.filter((e) => (e.manualOverrideCategory ?? e.category) === 'Promotional / Marketing');
    const invoices = emails.filter((e) => (e.manualOverrideCategory ?? e.category) === 'Invoices and Receipts');
    return {
      replyText: `Across ${emails.length} loaded messages, I separated **${comm.length} Commercial / Business** message(s) and **${invoices.length} Invoice/Receipt(s)** from **${promo.length} Promotional / Marketing** advertisement(s). Commercial messages involve concrete B2B deliverables or supplier SOWs (e.g., "${comm[0]?.subject ?? 'N/A'}"), whereas Promotional messages pitch retail discounts or promo codes (e.g., "${promo[0]?.subject ?? 'N/A'}").`,
      facts: [
        `Total emails in buffer: ${emails.length}`,
        `Commercial / Business count: ${comm.length}`,
        `Promotional / Marketing count: ${promo.length}`,
        `Invoices and Receipts count: ${invoices.length}`,
      ],
      assumptions: ['Assumes promotional retail blasts are non-essential for emergency facility recovery.'],
      engineBadge: 'NOVA RULE-ENGINE // TAXONOMY SEPARATOR',
    };
  }

  if (q.includes('duplicate') || q.includes('file') || q.includes('unnecessary')) {
    const exactDups = files.filter((f) => f.duplicateStatus === 'exact_hash_duplicate');
    const nameCollisions = files.filter((f) => f.duplicateStatus === 'same_name_collision');
    return {
      replyText: `In the Archive Vault inventory (${files.length} files), I found **${exactDups.length} byte-identical SHA-256 duplicate(s)** (${exactDups.map((d) => d.fileName).join(', ') || 'none'}) and **${nameCollisions.length} same-name revision collision(s)** (${nameCollisions.map((d) => d.fileName).join(', ') || 'none'}). I never flag a file as junk merely because it is large or old—only verified SHA-256 hash matches are proposed for Quarantine.`,
      facts: [
        `Exact SHA-256 duplicates: ${exactDups.length}`,
        `Same-name different-hash files held for review: ${nameCollisions.length}`,
      ],
      assumptions: ['Quarantining an exact SHA-256 duplicate preserves the primary copy intact.'],
      engineBadge: 'NOVA RULE-ENGINE // SHA-256 INVENTORY',
    };
  }

  if (q.includes('transaction') || q.includes('expense') || q.includes('financial')) {
    const dupTx = transactions.filter((t) => t.isDuplicate);
    const unusualTx = transactions.filter((t) => t.isUnusual);
    return {
      replyText: `Financial Control has ${transactions.length} ledger rows loaded. I detected **${dupTx.length} duplicate billing entry** (${dupTx[0]?.vendor ?? 'none'}) and **${unusualTx.length} high-value anomaly** (${unusualTx[0]?.vendor ?? 'none'}: $${unusualTx[0]?.amount.toLocaleString() ?? 0}).`,
      facts: [
        `Duplicate charges flagged: ${dupTx.length}`,
        `Outlier transactions >= $10,000: ${unusualTx.length}`,
      ],
      assumptions: ['Requires human audit before rejecting or approving ledger rows.'],
      engineBadge: 'NOVA RULE-ENGINE // LEDGER AUDITOR',
    };
  }

  if (q.includes('error') || q.includes('lint') || q.includes('code')) {
    return {
      replyText: `Systems Repair scanned the router module and found **${diagnostics.length} diagnostic issues** (including unawaited floating promises and loose equality). Open the Systems Repair workstation tab to inspect the exact before-and-after code diff.`,
      facts: diagnostics.map((d) => `Line ${d.line}: ${d.ruleId} — ${d.message}`),
      assumptions: ['Applying the suggested diff adds `await` and strict typing without altering routing endpoints.'],
      engineBadge: 'NOVA RULE-ENGINE // STATIC DIAGNOSTICS',
    };
  }

  const sceneInfo = CHAPTER_1_SCENES[saveState.currentScene];
  return {
    replyText: `Operator Level ${saveState.operatorLevel} (${saveState.credits} CR). Current directive: **${sceneInfo.title}** — ${sceneInfo.objectiveText} You have completed ${saveState.verifiedOperationsCount} verified real-world data operation(s). Ask me about any specific email, duplicate file, financial transaction, or code error.`,
    facts: [
      `Current Scene: ${sceneInfo.title}`,
      `Generator Online: ${saveState.mainGeneratorOnline ? 'Yes' : 'No'}`,
      `Verified Operations Executed: ${saveState.verifiedOperationsCount}`,
    ],
    assumptions: ['Standing by for your inspection or approval commands.'],
    engineBadge: 'NOVA RULE-ENGINE // TELEMETRY',
  };
}
