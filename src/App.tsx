/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  analyzeArchiveFiles,
  analyzeCodeSnippetForLint,
  CHAPTER_1_SCENES,
  createInitialFacilitySaveState,
  createInitialSampleArchiveFiles,
  createInitialSampleEmails,
  generateEmailOperationProposals,
  generateNovaContextualResponse,
  getFacilityInteractiveObjects,
  INITIAL_STORY_LOGS,
  INITIAL_UPGRADE_NODES,
  parseAndAnalyzeCsvExpenses,
  RawFileInput,
  SAMPLE_FINANCE_CSV,
  SAMPLE_REPAIR_CODE_MODULE,
} from './facility/engine';
import {
  ArchiveFileCategory,
  ArchiveFileItem,
  CodeDiagnosticItem,
  EmailCategory,
  EmailOperationProposal,
  FacilityInteractiveObject,
  FacilitySaveState,
  FinancialTransactionItem,
  GameScreenMode,
  NovaChatMessage,
  NovaUpgradeNode,
  ParsedEmailItem,
  StoryLogEntry,
  WorkstationTab,
} from './facility/types';
import { FacilityViewport3D } from './components/FacilityViewport3D';
import { WorkstationModal } from './components/WorkstationModal';
import { NovaDrawer } from './components/NovaDrawer';
import { soundEngine } from './game/sound';
import {
  disconnectGmailAccount,
  getGmailAccessToken,
  googleSignInForGmail,
  initGmailAuth,
} from './facility/gmailAuth';

const SAVE_STORAGE_KEY = 'last_shift_operator_save_v1';

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [screenMode, setScreenMode] = useState<GameScreenMode>(
    initialAutostart ? 'playing' : 'title'
  );
  const [workstationTab, setWorkstationTab] = useState<WorkstationTab>('comm_email');
  const [novaDrawerOpen, setNovaDrawerOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Google OAuth 2.0 Gmail Connection State
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null);
  const [gmailAuthError, setGmailAuthError] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState<boolean>(false);

  // Persistent Game Progression State
  const [saveState, setSaveState] = useState<FacilitySaveState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FacilitySaveState;
          if (parsed && parsed.version === 1 && parsed.departments) {
            return parsed;
          }
        }
      } catch {
        // Ignore corrupted local save
      }
    }
    return createInitialFacilitySaveState();
  });

  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.localStorage.getItem(SAVE_STORAGE_KEY));
  });

  // Focused 3D object from raycaster
  const [focusedObject, setFocusedObject] = useState<FacilityInteractiveObject | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Department Data States
  const [emails, setEmails] = useState<ParsedEmailItem[]>(() => createInitialSampleEmails());
  const [emailUndoStack, setEmailUndoStack] = useState<ParsedEmailItem[][]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(() => {
    const init = createInitialSampleEmails();
    return init[0]?.id ?? null;
  });
  const [emailProposals, setEmailProposals] = useState<EmailOperationProposal[]>(() =>
    generateEmailOperationProposals(createInitialSampleEmails())
  );

  const [archiveFiles, setArchiveFiles] = useState<ArchiveFileItem[]>(() =>
    createInitialSampleArchiveFiles()
  );
  const [transactions, setTransactions] = useState<FinancialTransactionItem[]>(() =>
    parseAndAnalyzeCsvExpenses(SAMPLE_FINANCE_CSV)
  );
  const [codeText, setCodeText] = useState<string>(SAMPLE_REPAIR_CODE_MODULE);
  const [diagnostics, setDiagnostics] = useState<CodeDiagnosticItem[]>(() =>
    analyzeCodeSnippetForLint(SAMPLE_REPAIR_CODE_MODULE)
  );

  const [upgrades, setUpgrades] = useState<NovaUpgradeNode[]>(() => INITIAL_UPGRADE_NODES);
  const [storyLogs, setStoryLogs] = useState<StoryLogEntry[]>(() => INITIAL_STORY_LOGS);

  const [novaMessages, setNovaMessages] = useState<NovaChatMessage[]>([
    {
      id: 'msg_init_1',
      sender: 'nova',
      timestampIso: new Date().toISOString(),
      text: 'System reboot detected. Welcome back, Operator. Facility 07 has been offline for 184 days. Restore the Generator in Sector 01, then bring the Communication Centre online.',
      engineBadge: 'NOVA OS v9.4 // BOOT SEQUENCE',
      facts: [
        'Facility 07 has been running on emergency reserve cells for 184 days.',
        'Communication Centre holds unprocessed commercial, promotional, invoice, and directive emails.',
      ],
      assumptions: ['Operator 07 cognitive and motor telemetry nominal.'],
    },
  ]);

  // Sync body dataset state for testing & CSS hooks
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = screenMode === 'workstation' ? 'playing' : screenMode;
    }
  }, [screenMode]);

  // Persist saveState to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          SAVE_STORAGE_KEY,
          JSON.stringify({ ...saveState, savedAtIso: new Date().toISOString() })
        );
        setHasSavedGame(true);
      } catch {
        // Ignore quota error
      }
    }
  }, [saveState]);

  // Check backend health, Gemini status & Google OAuth status on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.geminiConfigured === 'boolean') {
          setGeminiConnected(data.geminiConfigured);
        }
      })
      .catch(() => {});

    fetch('/api/auth/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.connected && typeof data.email === 'string') {
          setGmailConnectedEmail(data.email);
        }
      })
      .catch(() => {});

    const unsub = initGmailAuth((user) => {
      if (user?.email) {
        setGmailConnectedEmail(user.email);
      }
    });
    return () => unsub();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
  }, []);

  // Fetch & classify real Gmail messages via backend proxy
  const handleFetchGmailMessages = useCallback(
    async (explicitToken?: string) => {
      setGmailLoading(true);
      setGmailAuthError(null);
      try {
        const token = explicitToken || getGmailAccessToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const resp = await fetch('/api/gmail/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({ maxResults: 20 }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(
            data.error || `Failed to fetch Gmail messages (HTTP ${resp.status}).`
          );
        }

        const fetchedEmails = Array.isArray(data.emails)
          ? (data.emails as ParsedEmailItem[])
          : [];

        if (fetchedEmails.length === 0) {
          showToast('Gmail inbox connected — 0 recent messages returned.');
          return;
        }

        setEmails((prev) => {
          const existingSamples = prev.filter((e) => e.isSample);
          const combined = [...fetchedEmails, ...existingSamples];
          setEmailProposals(generateEmailOperationProposals(combined));
          return combined;
        });
        setSelectedEmailId(fetchedEmails[0].id);
        awardProgress(60, 140);
        showToast(
          `Synced ${fetchedEmails.length} real Gmail messages via read-only OAuth 2.0 (+60 XP)`
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to sync Gmail inbox messages.';
        setGmailAuthError(msg);
      } finally {
        setGmailLoading(false);
      }
    },
    [showToast]
  );

  const handleConnectGmail = useCallback(async () => {
    setGmailLoading(true);
    setGmailAuthError(null);
    try {
      const result = await googleSignInForGmail();
      if (!result) {
        throw new Error('Google OAuth 2.0 sign-in was cancelled or returned no credentials.');
      }
      setGmailConnectedEmail(result.user.email || 'Connected Operator');
      await handleFetchGmailMessages(result.accessToken);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Google OAuth 2.0 sign-in failed or was cancelled.';
      setGmailAuthError(msg);
      setGmailLoading(false);
    }
  }, [handleFetchGmailMessages]);

  const handleRefreshGmail = useCallback(async () => {
    await handleFetchGmailMessages();
  }, [handleFetchGmailMessages]);

  const handleDisconnectGmail = useCallback(async () => {
    setGmailLoading(true);
    setGmailAuthError(null);
    try {
      await disconnectGmailAccount();
      setGmailConnectedEmail(null);
      setEmails((prev) => {
        const samplesOnly = prev.filter((e) => e.isSample);
        const nextList = samplesOnly.length > 0 ? samplesOnly : createInitialSampleEmails();
        setEmailProposals(generateEmailOperationProposals(nextList));
        setSelectedEmailId(nextList[0]?.id ?? null);
        return nextList;
      });
      showToast('Google Account disconnected and encrypted session vault cleared.');
    } finally {
      setGmailLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!toastBanner) return;
    const t = setTimeout(() => setToastBanner(null), 5000);
    return () => clearTimeout(t);
  }, [toastBanner]);

  // Award XP & Credits helper
  const awardProgress = useCallback((xpDelta: number, creditsDelta: number) => {
    setSaveState((prev) => {
      let nextXp = prev.xp + xpDelta;
      let nextLevel = prev.operatorLevel;
      let nextXpToNext = prev.xpToNext;
      while (nextXp >= nextXpToNext) {
        nextXp -= nextXpToNext;
        nextLevel += 1;
        nextXpToNext = Math.round(nextXpToNext * 1.35);
      }
      return {
        ...prev,
        operatorLevel: nextLevel,
        xp: nextXp,
        xpToNext: nextXpToNext,
        credits: prev.credits + creditsDelta,
      };
    });
  }, []);

  // ==========================================================================
  // PHYSICAL 3D OBJECT INTERACTION HANDLER (CHAPTER 1 STORY STATE MACHINE)
  // ==========================================================================
  const handleInteractWithObject = useCallback(
    (obj: FacilityInteractiveObject) => {
      // 1. Maintenance Bay Door (Scene 1 -> Scene 2)
      if (obj.id === 'door_maint_gen') {
        setSaveState((prev) => {
          const nextOpen = !prev.doorsOpen.door_maint_gen;
          const nextScene =
            prev.currentScene === 'scene_1_wakeup' && nextOpen
              ? 'scene_2_generator'
              : prev.currentScene;
          return {
            ...prev,
            doorsOpen: { ...prev.doorsOpen, door_maint_gen: nextOpen },
            currentScene: nextScene,
          };
        });
        showToast('Maintenance Bulkhead cycled. Enter the Generator Room ahead.');
        return;
      }

      // 2. Generator Room Auxiliary Breakers A, B, C
      if (obj.id === 'breaker_0' || obj.id === 'breaker_1' || obj.id === 'breaker_2') {
        const idx = obj.id === 'breaker_0' ? 0 : obj.id === 'breaker_1' ? 1 : 2;
        setSaveState((prev) => {
          const nextBreakers: [boolean, boolean, boolean] = [...prev.breakerSwitches] as [
            boolean,
            boolean,
            boolean,
          ];
          nextBreakers[idx] = !nextBreakers[idx];
          const count = nextBreakers.filter(Boolean).length;
          showToast(
            `Auxiliary Breaker ${['A', 'B', 'C'][idx]} ${
              nextBreakers[idx] ? 'ENGAGED' : 'DISCONNECTED'
            } (${count}/3 active).`
          );
          return {
            ...prev,
            breakerSwitches: nextBreakers,
          };
        });
        return;
      }

      // 3. Main Generator Lever (Scene 2 -> Scene 3)
      if (obj.id === 'main_generator_lever') {
        setSaveState((prev) => {
          const allThree =
            prev.breakerSwitches[0] && prev.breakerSwitches[1] && prev.breakerSwitches[2];
          if (!allThree) {
            showToast(
              'Cannot pull Main Turbine Lever yet — engage all 3 Auxiliary Breaker Switches on the West wall first!'
            );
            return prev;
          }
          if (prev.mainGeneratorOnline) {
            showToast('Main Turbine Generator is already online and feeding Central Command.');
            return prev;
          }
          showToast(
            'PRIMARY POWER RESTORED! Central Command Bulkhead unlocked (+50 XP / +60 CR).'
          );
          return {
            ...prev,
            mainGeneratorOnline: true,
            facilityTier: Math.max(prev.facilityTier, 2) as 1 | 2 | 3,
            xp: prev.xp + 50,
            credits: prev.credits + 60,
            departments: {
              ...prev.departments,
              central_command: 'online',
            },
            doorsOpen: {
              ...prev.doorsOpen,
              door_maint_gen: true,
              door_gen_cmd: true,
            },
            currentScene:
              prev.currentScene === 'scene_1_wakeup' || prev.currentScene === 'scene_2_generator'
                ? 'scene_3_command'
                : prev.currentScene,
          };
        });
        return;
      }

      // 4. Generator -> Central Command Door
      if (obj.id === 'door_gen_cmd') {
        setSaveState((prev) => {
          if (!prev.mainGeneratorOnline) {
            showToast('Bulkhead locked: Restore the Main Generator first.');
            return prev;
          }
          return {
            ...prev,
            doorsOpen: { ...prev.doorsOpen, door_gen_cmd: !prev.doorsOpen.door_gen_cmd },
          };
        });
        return;
      }

      // 5. Central Command Holotable (Scene 3 -> Scene 4, or Scene 8 Mystery Log)
      if (obj.id === 'command_holotable') {
        if (saveState.currentScene === 'scene_8_mystery_log') {
          setWorkstationTab('story_logs');
          setScreenMode('workstation');
          return;
        }
        setSaveState((prev) => ({
          ...prev,
          inspectedCommandTable: true,
          currentScene:
            prev.currentScene === 'scene_3_command' ? 'scene_4_maya' : prev.currentScene,
        }));
        showToast(
          'Central Command Telemetry synced. Speak with Engineer Maya Chen at the East Station.'
        );
        setWorkstationTab('mission_brief');
        setScreenMode('workstation');
        return;
      }

      // 6. Hidden Audio Recording LOG_042_VANCE
      if (obj.id === 'hidden_log_042') {
        setStoryLogs((prev) =>
          prev.map((l) => (l.id === 'log_042_vance' ? { ...l, discovered: true } : l))
        );
        setSaveState((prev) => ({
          ...prev,
          discoveredLogIds: Array.from(new Set([...prev.discoveredLogIds, 'log_042_vance'])),
          credits: prev.credits + 40,
        }));
        showToast('HIDDEN RECORDING RECOVERED: Operator 06 Julian Vance (PERSONAL_REC_042)!');
        setWorkstationTab('story_logs');
        setScreenMode('workstation');
        return;
      }

      // 7. Meet Maya Chen (Scene 4 -> Scene 5)
      if (obj.id === 'npc_maya_chen') {
        setSaveState((prev) => ({
          ...prev,
          talkedToMaya: true,
          doorsOpen: {
            ...prev.doorsOpen,
            door_cmd_comm: true,
          },
          currentScene:
            prev.currentScene === 'scene_3_command' || prev.currentScene === 'scene_4_maya'
              ? 'scene_5_comm_restore'
              : prev.currentScene,
        }));
        setNovaMessages((prev) => [
          ...prev,
          {
            id: `maya_${Date.now()}`,
            sender: 'maya',
            timestampIso: new Date().toISOString(),
            text: "Glad you're awake, Operator. I've unlocked the West Bulkhead to the Communication Centre. Flip the sector power relay inside, then use NOVA's Email Intelligence terminal to separate genuine B2B commercial contracts and supplier invoices from promotional spam—and never approve a batch without checking the preview first.",
            engineBadge: 'MAYA CHEN // CHIEF SYSTEMS ENGINEER',
          },
        ]);
        setNovaDrawerOpen(true);
        showToast('Maya unlocked the West Communication Centre Bulkhead!');
        return;
      }

      // 8. Communication Centre Door
      if (obj.id === 'door_cmd_comm') {
        setSaveState((prev) => {
          if (!prev.talkedToMaya && !prev.mainGeneratorOnline) {
            showToast('Restore power and speak with Engineer Maya Chen in Central Command first.');
            return prev;
          }
          return {
            ...prev,
            doorsOpen: { ...prev.doorsOpen, door_cmd_comm: !prev.doorsOpen.door_cmd_comm },
          };
        });
        return;
      }

      // 9. Communication Sector Power Relay (Scene 5)
      if (obj.id === 'comm_power_relay') {
        setSaveState((prev) => ({
          ...prev,
          commPowerOnline: true,
          departments: {
            ...prev.departments,
            communication_centre: 'online',
          },
          currentScene:
            prev.currentScene === 'scene_5_comm_restore'
              ? 'scene_6_nova_analysis'
              : prev.currentScene,
        }));
        showToast(
          'Communication Centre Power Relay ONLINE! Operate the Email Intelligence Workstation.'
        );
        return;
      }

      // 10. Communication Centre Email Workstation (Scene 6)
      if (obj.id === 'comm_email_terminal') {
        setSaveState((prev) => ({
          ...prev,
          commPowerOnline: true,
          commTerminalActivated: true,
          departments: {
            ...prev.departments,
            communication_centre: 'online',
          },
          currentScene:
            prev.currentScene === 'scene_5_comm_restore'
              ? 'scene_6_nova_analysis'
              : prev.currentScene,
        }));
        setWorkstationTab('comm_email');
        setScreenMode('workstation');
        return;
      }

      // 11. Archive Vault Door & Terminal (Scene 7 -> Scene 8)
      if (obj.id === 'door_cmd_archive' || obj.id === 'archive_vault_terminal') {
        setSaveState((prev) => {
          const nextScene =
            prev.currentScene === 'scene_7_archive_intro'
              ? 'scene_8_mystery_log'
              : prev.currentScene;
          return {
            ...prev,
            doorsOpen: { ...prev.doorsOpen, door_cmd_archive: true },
            departments: { ...prev.departments, archive_vault: 'online' },
            currentScene: nextScene,
          };
        });
        if (saveState.currentScene === 'scene_7_archive_intro') {
          setStoryLogs((prev) =>
            prev.map((l) => (l.id === 'log_184_mystery' ? { ...l, discovered: true } : l))
          );
          showToast(
            'ALERT: Encrypted file LAST_OPERATOR_LOG_184 intercepted! Inspect Story Logs.'
          );
        }
        if (obj.id === 'archive_vault_terminal') {
          setWorkstationTab('archive_files');
          setScreenMode('workstation');
        }
        return;
      }

      // 12. Financial Control & Systems Repair Doors / Terminals
      if (obj.id === 'door_cmd_finance' || obj.id === 'finance_audit_terminal') {
        setSaveState((prev) => ({
          ...prev,
          doorsOpen: { ...prev.doorsOpen, door_cmd_finance: true },
          departments: { ...prev.departments, financial_control: 'online' },
        }));
        if (obj.id === 'finance_audit_terminal') {
          setWorkstationTab('finance_csv');
          setScreenMode('workstation');
        }
        return;
      }

      if (obj.id === 'door_cmd_systems' || obj.id === 'systems_repair_terminal') {
        setSaveState((prev) => ({
          ...prev,
          doorsOpen: { ...prev.doorsOpen, door_cmd_systems: true },
          departments: { ...prev.departments, systems_repair: 'online' },
        }));
        if (obj.id === 'systems_repair_terminal') {
          setWorkstationTab('systems_lint');
          setScreenMode('workstation');
        }
        return;
      }

      if (obj.id === 'upgrade_terminal') {
        setWorkstationTab('upgrades');
        setScreenMode('workstation');
        return;
      }

      if (obj.id === 'nova_mainframe_screen') {
        setNovaDrawerOpen(true);
      }
    },
    [saveState.currentScene, showToast]
  );

  // ==========================================================================
  // EMAIL INTELLIGENCE HANDLERS
  // ==========================================================================
  const handleImportRawEmls = useCallback(
    async (rawFiles: Array<{ fileName: string; rawEml: string; isSample?: boolean }>) => {
      const patternRecLevel = saveState.unlockedUpgrades['pattern_rec_2'] ? 2 : 1;
      const res = await fetch('/api/emails/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawFiles, patternRecLevel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.emails)) {
          setEmailUndoStack((prev) => [...prev, emails]);
          setEmails((prev) => [...data.emails, ...prev]);
          setSelectedEmailId(data.emails[0]?.id ?? selectedEmailId);
          setEmailProposals(generateEmailOperationProposals([...data.emails, ...emails]));
        }
      }
    },
    [emails, saveState.unlockedUpgrades, selectedEmailId]
  );

  const handleOverrideEmailCategory = useCallback(
    (emailId: string, newCat: EmailCategory) => {
      setEmailUndoStack((prev) => [...prev, emails]);
      const updated = emails.map((e) =>
        e.id === emailId ? { ...e, manualOverrideCategory: newCat } : e
      );
      setEmails(updated);
      setEmailProposals(generateEmailOperationProposals(updated));
      showToast(`Classification updated to "${newCat}". Proposals recalculated.`);
    },
    [emails, showToast]
  );

  const handleEmailSingleAction = useCallback(
    (
      emailId: string,
      action: 'kept' | 'archived' | 'flagged_review' | 'spam_quarantine' | 'toggle_important'
    ) => {
      setEmailUndoStack((prev) => [...prev, emails]);
      const updated = emails.map((e) => {
        if (e.id !== emailId) return e;
        if (action === 'toggle_important') {
          return { ...e, important: !e.important };
        }
        return { ...e, status: action };
      });
      setEmails(updated);
      setEmailProposals(generateEmailOperationProposals(updated));
    },
    [emails]
  );

  const handleBulkEmailAction = useCallback(
    (emailIds: string[], action: 'kept' | 'archived' | 'flagged_review') => {
      const idSet = new Set(emailIds);
      setEmailUndoStack((prev) => [...prev, emails]);
      const updated = emails.map((e) => (idSet.has(e.id) ? { ...e, status: action } : e));
      setEmails(updated);
      setEmailProposals(generateEmailOperationProposals(updated));
      awardProgress(35, 30);
      showToast(`Executed bulk "${action.toUpperCase()}" on ${emailIds.length} message(s).`);
    },
    [awardProgress, emails, showToast]
  );

  const handleUndoEmailAction = useCallback(() => {
    setEmailUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const previousEmails = prev[prev.length - 1];
      setEmails(previousEmails);
      setEmailProposals(generateEmailOperationProposals(previousEmails));
      showToast('Reverted last email classification/status operation.');
      return prev.slice(0, -1);
    });
  }, [showToast]);

  const handleApproveEmailProposal = useCallback(
    (proposalId: string) => {
      const prop = emailProposals.find((p) => p.id === proposalId);
      if (!prop || prop.status === 'approved_and_executed') return;

      const affectedSet = new Set(prop.affectedEmailIds);
      setEmailUndoStack((prev) => [...prev, emails]);

      const updatedEmails = emails.map((e) => {
        if (!affectedSet.has(e.id)) return e;
        if (prop.targetAction === 'archive') return { ...e, status: 'archived' as const };
        if (prop.targetAction === 'flag_review') return { ...e, status: 'flagged_review' as const };
        if (prop.targetAction === 'mark_important')
          return { ...e, status: 'kept' as const, important: true };
        return { ...e, status: 'kept' as const };
      });

      setEmails(updatedEmails);
      const verificationHash = `VRF_${Math.abs(proposalId.length * 9187 + Date.now() % 99999)
        .toString(16)
        .toUpperCase()}`;

      setEmailProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? {
                ...p,
                status: 'approved_and_executed',
                executedAtIso: new Date().toISOString(),
                verificationHash,
              }
            : p
        )
      );

      // Advance Scene 6 -> Scene 7 -> Scene 8 when first email proposal is verified!
      setSaveState((prev) => {
        const nextScene =
          prev.currentScene === 'scene_5_comm_restore' ||
          prev.currentScene === 'scene_6_nova_analysis'
            ? 'scene_7_archive_intro'
            : prev.currentScene;
        return {
          ...prev,
          verifiedOperationsCount: prev.verifiedOperationsCount + 1,
          emailsProcessedCount: prev.emailsProcessedCount + prop.affectedEmailIds.length,
          doorsOpen: {
            ...prev.doorsOpen,
            door_cmd_archive: true,
            door_cmd_finance: true,
            door_cmd_systems: true,
          },
          departments: {
            ...prev.departments,
            communication_centre: 'online',
            archive_vault: 'online',
          },
          currentScene: nextScene,
        };
      });

      setStoryLogs((prev) =>
        prev.map((l) => (l.id === 'log_184_mystery' ? { ...l, discovered: true } : l))
      );

      awardProgress(80, 75);
      soundEngine.playChoreSync();
      showToast(
        `VERIFIED (${verificationHash}): ${prop.title}. Archive Vault unlocked & LAST_OPERATOR_LOG_184 detected!`
      );
    },
    [awardProgress, emailProposals, emails, showToast]
  );

  // ==========================================================================
  // ARCHIVE VAULT, FINANCIAL CONTROL, SYSTEMS REPAIR & UPGRADES HANDLERS
  // ==========================================================================
  const handleImportArchiveFiles = useCallback(async (rawInputs: RawFileInput[]) => {
    const res = await fetch('/api/archive/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: rawInputs }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.files)) {
        setArchiveFiles((prev) => [...data.files, ...prev]);
      }
    }
  }, []);

  const handleOverrideFileFolder = useCallback((fileId: string, folder: ArchiveFileCategory) => {
    setArchiveFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, manualFolderOverride: folder } : f))
    );
  }, []);

  const handleExecuteArchiveBatch = useCallback(
    (mode: 'organize_all' | 'quarantine_duplicates') => {
      setArchiveFiles((prev) =>
        prev.map((f) => {
          if (mode === 'quarantine_duplicates' && f.duplicateStatus === 'exact_hash_duplicate') {
            return { ...f, status: 'quarantined' };
          }
          if (mode === 'organize_all' && f.duplicateStatus === 'unique') {
            return { ...f, status: 'organized' };
          }
          return f;
        })
      );
      setSaveState((prev) => ({
        ...prev,
        verifiedOperationsCount: prev.verifiedOperationsCount + 1,
        filesOrganizedCount: prev.filesOrganizedCount + archiveFiles.length,
        currentScene:
          prev.currentScene === 'scene_7_archive_intro'
            ? 'scene_8_mystery_log'
            : prev.currentScene,
      }));
      awardProgress(90, 90);
      soundEngine.playChoreSync();
      showToast(
        mode === 'quarantine_duplicates'
          ? 'Exact SHA-256 duplicates safely moved to recoverable Quarantine.'
          : 'Approved Archive Vault folder routing executed (+90 CR).'
      );
    },
    [archiveFiles.length, awardProgress, showToast]
  );

  const handleAnalyzeFinanceCsv = useCallback(async (csvText: string) => {
    const res = await fetch('/api/finance/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    }
  }, []);

  const handleApproveFinanceAudit = useCallback(() => {
    setTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        status: t.isDuplicate || t.isUnusual ? 'flagged' : 'approved',
      }))
    );
    setSaveState((prev) => ({
      ...prev,
      verifiedOperationsCount: prev.verifiedOperationsCount + 1,
      transactionsAuditedCount: prev.transactionsAuditedCount + transactions.length,
    }));
    awardProgress(75, 85);
    showToast('Financial Control audit verified: Duplicate & outlier transactions flagged (+85 CR).');
  }, [awardProgress, showToast, transactions.length]);

  const handleRunCodeLint = useCallback(async (code: string) => {
    setCodeText(code);
    const res = await fetch('/api/systems/lint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeText: code }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.diagnostics)) {
        setDiagnostics(data.diagnostics);
      }
    }
  }, []);

  const handleApproveCodeFix = useCallback(
    (diagId: string) => {
      setDiagnostics((prev) =>
        prev.map((d) => (d.id === diagId ? { ...d, status: 'approved_fixed' } : d))
      );
      setSaveState((prev) => ({
        ...prev,
        verifiedOperationsCount: prev.verifiedOperationsCount + 1,
        lintIssuesResolvedCount: prev.lintIssuesResolvedCount + 1,
      }));
      awardProgress(45, 45);
      showToast('Code diff patch approved & verified (+45 CR).');
    },
    [awardProgress, showToast]
  );

  const handlePurchaseUpgrade = useCallback(
    (upgradeId: string) => {
      const target = upgrades.find((u) => u.id === upgradeId);
      if (!target || target.unlocked || saveState.credits < target.costCredits) return;

      setUpgrades((prev) =>
        prev.map((u) => (u.id === upgradeId ? { ...u, unlocked: true, level: 1 } : u))
      );

      setSaveState((prev) => {
        const nextUnlocked = { ...prev.unlockedUpgrades, [upgradeId]: 1 };
        const hardwareCount = Object.keys(nextUnlocked).filter((k) =>
          ['power_infrastructure', 'server_capacity', 'processing_speed', 'department_automation'].includes(
            k
          )
        ).length;
        const nextTier: 1 | 2 | 3 =
          hardwareCount >= 2 ? 3 : prev.mainGeneratorOnline || hardwareCount >= 1 ? 2 : 1;

        return {
          ...prev,
          credits: prev.credits - target.costCredits,
          unlockedUpgrades: nextUnlocked,
          facilityTier: nextTier,
          doorsOpen:
            upgradeId === 'power_infrastructure' ||
            upgradeId === 'smart_archive' ||
            upgradeId === 'department_automation'
              ? {
                  ...prev.doorsOpen,
                  door_cmd_archive: true,
                  door_cmd_finance: true,
                  door_cmd_systems: true,
                }
              : prev.doorsOpen,
        };
      });

      soundEngine.playChoreSync();
      showToast(`Installed Upgrade: ${target.name}!`);
    },
    [saveState.credits, showToast, upgrades]
  );

  // ==========================================================================
  // NOVA AI CHAT & MAYA INTERCOM HANDLERS
  // ==========================================================================
  const handleSendNovaQuestion = useCallback(
    async (question: string, explicitEmail?: ParsedEmailItem) => {
      const userMsg: NovaChatMessage = {
        id: `usr_${Date.now()}`,
        sender: 'operator',
        timestampIso: new Date().toISOString(),
        text: question,
      };
      setNovaMessages((prev) => [...prev, userMsg]);

      const selectedEmail =
        explicitEmail || emails.find((e) => e.id === selectedEmailId) || emails[0] || null;

      try {
        const res = await fetch('/api/nova/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            saveState,
            selectedEmail,
            emails,
            files: archiveFiles,
            transactions,
            diagnostics,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setNovaMessages((prev) => [
            ...prev,
            {
              id: `nova_${Date.now()}`,
              sender: 'nova',
              timestampIso: new Date().toISOString(),
              text: data.replyText,
              engineBadge: data.engineBadge,
              facts: data.facts,
              assumptions: data.assumptions,
            },
          ]);
          return;
        }
      } catch {
        // Fallback to local deterministic responder
      }

      const local = generateNovaContextualResponse(question, {
        saveState,
        selectedEmail,
        emails,
        files: archiveFiles,
        transactions,
        diagnostics,
      });
      setNovaMessages((prev) => [
        ...prev,
        {
          id: `nova_${Date.now()}`,
          sender: 'nova',
          timestampIso: new Date().toISOString(),
          text: local.replyText,
          engineBadge: local.engineBadge,
          facts: local.facts,
          assumptions: local.assumptions,
        },
      ]);
    },
    [archiveFiles, diagnostics, emails, saveState, selectedEmailId, transactions]
  );

  const handleTalkToMayaOption = useCallback(
    (topic: 'comm_unlock' | 'operator_06' | 'archive_vault') => {
      setSaveState((prev) => ({
        ...prev,
        talkedToMaya: true,
        doorsOpen: { ...prev.doorsOpen, door_cmd_comm: true, door_cmd_archive: true },
        currentScene:
          prev.currentScene === 'scene_3_command' || prev.currentScene === 'scene_4_maya'
            ? 'scene_5_comm_restore'
            : prev.currentScene,
      }));

      const replies: Record<typeof topic, string> = {
        comm_unlock:
          "I've routed auxiliary bus power to the West Bulkhead. Head into the Communication Centre, flip the Sector Power Relay on the right wall, and boot the Email Intelligence Workstation.",
        operator_06:
          'Julian Vance—Operator 06—didn’t just vanish. Right before the Blackout hit, he discovered an unindexed purge command buried in NOVA’s optimization queue. Check under the South-West conduit in Central Command for his hidden voice recorder.',
        archive_vault:
          'The East Archive Vault holds 14,000 scattered corporate and municipal files. Use NOVA’s SHA-256 hash scanner to quarantine exact byte-duplicates, but never let an automated rule delete `.tmp` dumps or large video streams without checking them.',
      };

      setNovaMessages((prev) => [
        ...prev,
        {
          id: `maya_${Date.now()}`,
          sender: 'maya',
          timestampIso: new Date().toISOString(),
          text: replies[topic],
          engineBadge: 'MAYA CHEN // CHIEF SYSTEMS ENGINEER',
        },
      ]);
    },
    []
  );

  // Move player directly in front of the current scene's target station (Accessibility / Quick-Step)
  const handleStepToCurrentObjective = useCallback(() => {
    setSaveState((prev) => {
      if (prev.currentScene === 'scene_1_wakeup') {
        return {
          ...prev,
          doorsOpen: { ...prev.doorsOpen, door_maint_gen: true },
          playerPosition: [0, 1.7, 15.0],
          playerYaw: 0,
          currentScene: 'scene_2_generator',
        };
      }
      if (prev.currentScene === 'scene_2_generator') {
        return {
          ...prev,
          breakerSwitches: [true, true, true],
          mainGeneratorOnline: true,
          facilityTier: 2,
          departments: { ...prev.departments, central_command: 'online' },
          doorsOpen: { ...prev.doorsOpen, door_maint_gen: true, door_gen_cmd: true },
          playerPosition: [0, 1.7, 0.5],
          playerYaw: 0,
          currentScene: 'scene_3_command',
        };
      }
      if (prev.currentScene === 'scene_3_command') {
        return {
          ...prev,
          inspectedCommandTable: true,
          playerPosition: [3.2, 1.7, -2.0],
          playerYaw: -Math.PI / 2,
          currentScene: 'scene_4_maya',
        };
      }
      if (prev.currentScene === 'scene_4_maya') {
        return {
          ...prev,
          talkedToMaya: true,
          doorsOpen: { ...prev.doorsOpen, door_cmd_comm: true },
          playerPosition: [-21.5, 1.7, -4.0],
          playerYaw: Math.PI / 2,
          currentScene: 'scene_5_comm_restore',
        };
      }
      if (
        prev.currentScene === 'scene_5_comm_restore' ||
        prev.currentScene === 'scene_6_nova_analysis'
      ) {
        setWorkstationTab('comm_email');
        setScreenMode('workstation');
        return {
          ...prev,
          commPowerOnline: true,
          commTerminalActivated: true,
          departments: { ...prev.departments, communication_centre: 'online' },
          playerPosition: [-23.0, 1.7, -4.0],
          currentScene: 'scene_6_nova_analysis',
        };
      }
      if (prev.currentScene === 'scene_7_archive_intro') {
        setStoryLogs((logs) =>
          logs.map((l) => (l.id === 'log_184_mystery' ? { ...l, discovered: true } : l))
        );
        return {
          ...prev,
          doorsOpen: { ...prev.doorsOpen, door_cmd_archive: true },
          departments: { ...prev.departments, archive_vault: 'online' },
          playerPosition: [21.5, 1.7, -4.0],
          currentScene: 'scene_8_mystery_log',
        };
      }
      if (prev.currentScene === 'scene_8_mystery_log') {
        setWorkstationTab('story_logs');
        setScreenMode('workstation');
        return prev;
      }
      return prev;
    });
  }, []);

  // Global keyboard shortcuts (Escape, Tab, N, M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Escape') {
        if (screenMode === 'workstation') {
          setScreenMode('playing');
        } else if (screenMode === 'playing') {
          setScreenMode('paused');
        } else if (screenMode === 'paused') {
          setScreenMode('playing');
        }
      } else if (e.code === 'KeyN' && screenMode === 'playing') {
        e.preventDefault();
        setNovaDrawerOpen((prev) => !prev);
      } else if (e.code === 'Tab' && screenMode === 'playing') {
        e.preventDefault();
        setScreenMode('workstation');
      } else if (e.code === 'KeyM') {
        soundEngine.muted = !soundEngine.muted;
        setMuted(soundEngine.muted);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenMode]);

  const currentSceneObj = CHAPTER_1_SCENES[saveState.currentScene];
  const interactiveObjects = getFacilityInteractiveObjects(saveState);

  // Compute 10-segment fills for Space-Shooter-UI9 Health/Power and Energy/XP bars
  const powerSegmentsFilled = saveState.mainGeneratorOnline
    ? saveState.facilityTier >= 3
      ? 10
      : 8
    : 3 + saveState.breakerSwitches.filter(Boolean).length;
  const energySegmentsFilled = Math.max(
    2,
    Math.min(10, Math.round((saveState.xp / Math.max(1, saveState.xpToNext)) * 10))
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09151C] select-none">
      {/* ====================================================================
          PERSISTENT 3D FIRST-PERSON SPACESHIP ROTUNDA & FACILITY 07 VIEWPORT
      ==================================================================== */}
      <FacilityViewport3D
        saveState={saveState}
        isPausedOrModal={screenMode !== 'playing'}
        isCinematicCamera={screenMode === 'title' || screenMode === 'story_intro'}
        onUpdatePlayerTransform={(pos, yaw) => {
          setSaveState((prev) => ({
            ...prev,
            playerPosition: pos,
            playerYaw: yaw,
          }));
        }}
        onFocusObjectChange={setFocusedObject}
        onInteractWithObject={handleInteractWithObject}
      />

      {/* ====================================================================
          PART 3: CINEMATIC MAIN MENU OVERLAY (Space-Shooter-UI9 Kit)
      ==================================================================== */}
      {screenMode === 'title' && (
        <div className="fixed inset-0 z-20 flex items-center justify-start p-5 md:p-12 pointer-events-none bg-gradient-to-r from-[#07131A]/92 via-[#07131A]/50 to-transparent">
          <div className="w-full max-w-xl pointer-events-auto flex flex-col">
            {/* Chamfered Folder Tab */}
            <div>
              <div className="ss-folder-tab">
                <span>[x]</span>
                <span>FACILITY 07 · SPACESHIP COMMAND BRIDGE</span>
              </div>
            </div>

            <div className="ss-folder-body p-6 md:p-7 flex flex-col gap-5">
              {/* Riveted Space-Shooter-UI9 Title Banner */}
              <div className="ss-banner px-5 py-3 flex items-center justify-between gap-4 mx-2">
                <div className="flex items-center gap-3">
                  <svg width="38" height="38" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                    <polygon
                      points="22,2 40,12 40,32 22,42 4,32 4,12"
                      stroke="#1EE3CF"
                      strokeWidth="2"
                      fill="#0B1E26"
                    />
                    <circle cx="22" cy="22" r="7" stroke="#A3E635" strokeWidth="2" />
                    <circle cx="22" cy="22" r="2.5" fill="#1EE3CF" />
                  </svg>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#1EE3CF]">
                      YEAR 2096 · ORBITAL RECOVERY VESSEL 07
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-wider text-white leading-none mt-0.5">
                      LAST SHIFT
                    </h1>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#A3E635]">
                    THE LAST OPERATOR
                  </div>
                  <div className="text-xs font-mono text-amber-300 mt-0.5">★ ★ ★</div>
                </div>
              </div>

              <p className="text-sm md:text-base font-display text-[#E2F8F5]">
                &ldquo;Your digital world is falling apart. You have one shift to save it.&rdquo;
              </p>

              <p className="text-xs text-slate-300 leading-relaxed">
                Explore the 3D <strong className="text-white">Spaceship Command Rotunda</strong> &amp;
                connected sector bays. Restore substation power, awaken{' '}
                <strong className="text-[#1EE3CF]">NOVA AI</strong> above the central Earth
                holo-globe, connect your real Gmail inbox via read-only Google OAuth 2.0 for{' '}
                <strong className="text-[#A3E635]">Inbox Rescue</strong>, and uncover what happened
                to Operator 06.
              </p>

              {/* Spaceship Reference Blueprint Preview Strip */}
              <div className="grid grid-cols-2 gap-2.5 bg-[#07141B] p-2.5 rounded border border-[#1EE3CF]/35">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/c80b58250380253.6a47d90422454_c5d21db8.jpg"
                    alt="Spaceship Rotunda Bridge Architecture"
                    referrerPolicy="no-referrer"
                    className="w-16 h-11 object-cover rounded border border-[#1EE3CF]/60 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[#1EE3CF] truncate">
                      3D Rotunda Bridge
                    </div>
                    <div className="text-[11px] text-slate-300 leading-tight">
                      Earth Holo-Globe &amp; 12-Seg Console
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/Space-Shooter-UI9_a6c31201.webp"
                    alt="Space-Shooter-UI9 Tactical Interface"
                    referrerPolicy="no-referrer"
                    className="w-16 h-11 object-cover rounded border border-[#A3E635]/60 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase text-[#A3E635] truncate">
                      Tactical Ship HUD
                    </div>
                    <div className="text-[11px] text-slate-300 leading-tight">
                      Segmented Bars &amp; Bay Terminals
                    </div>
                  </div>
                </div>
              </div>

              {/* Numbered Space-Shooter-UI9 List Buttons (01, 02, 03, 04) */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    const fresh = createInitialFacilitySaveState();
                    setSaveState(fresh);
                    setScreenMode('story_intro');
                  }}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">01</span>
                    <span className="text-sm font-display font-bold tracking-wider uppercase text-white">
                      NEW GAME
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#1EE3CF]">
                    CHAPTER 01: THE BLACKOUT →
                  </span>
                </button>

                <button
                  type="button"
                  data-continue="true"
                  onClick={() => setScreenMode('playing')}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">02</span>
                    <span className="text-sm font-display font-bold tracking-wider uppercase text-white">
                      CONTINUE
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#A3E635]">
                    {hasSavedGame
                      ? `SCENE 0${CHAPTER_1_SCENES[saveState.currentScene].sceneNumber} (${CHAPTER_1_SCENES[saveState.currentScene].title})`
                      : 'ENTER FACILITY 07 DIRECTLY'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSaveState((prev) => ({
                      ...prev,
                      breakerSwitches: [true, true, true],
                      mainGeneratorOnline: true,
                      facilityTier: Math.max(prev.facilityTier, 2) as 1 | 2 | 3,
                      doorsOpen: {
                        ...prev.doorsOpen,
                        door_maint_gen: true,
                        door_gen_cmd: true,
                        door_cmd_comm: true,
                        door_cmd_archive: true,
                      },
                      playerPosition: [-3.8, 1.7, 2.2],
                      playerYaw: -0.52,
                      currentScene:
                        prev.currentScene === 'scene_1_wakeup' ||
                        prev.currentScene === 'scene_2_generator'
                          ? 'scene_3_command'
                          : prev.currentScene,
                    }));
                    setScreenMode('playing');
                  }}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">03</span>
                    <span className="text-sm font-display font-bold tracking-wider uppercase text-white">
                      COMMAND ROTUNDA BRIDGE
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-300">
                    EARTH HOLO-GLOBE &amp; BAYS →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">04</span>
                    <span className="text-sm font-display font-bold tracking-wider uppercase text-white">
                      SETTINGS
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">
                    AUDIO · CONTROLS · GOOGLE OAUTH
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          PART 4: CINEMATIC STORY INTRODUCTION ("YEAR: 2096 — THE BLACKOUT")
      ==================================================================== */}
      {screenMode === 'story_intro' && (
        <div
          role="dialog"
          aria-label="Story Introduction"
          className="fixed inset-0 z-20 flex items-center justify-center p-6 md:p-12 bg-[#07131A]/90 pointer-events-auto"
        >
          <div className="w-full max-w-2xl flex flex-col">
            <div>
              <div className="ss-folder-tab">
                <span>[x]</span>
                <span>EMERGENCY TRANSMISSION · CHAPTER 01</span>
              </div>
            </div>
            <div className="ss-folder-body p-7 md:p-9 flex flex-col gap-6">
              <div className="ss-banner px-6 py-3 flex items-center justify-between mx-2">
                <div>
                  <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#FACC15]">
                    YEAR: 2096
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-wider text-white mt-0.5">
                    THE BLACKOUT
                  </h2>
                </div>
                <span className="text-xs font-mono uppercase text-[#1EE3CF]">
                  VESSEL 07 // RECOVERY CORE
                </span>
              </div>

              <div className="space-y-3 text-sm md:text-base font-mono text-slate-200 leading-relaxed">
                <p className="text-white font-semibold">
                  &ldquo;Global digital infrastructure has collapsed.&rdquo;
                </p>
                <p>
                  &ldquo;Millions of messages, files and records lie buried inside dead servers.&rdquo;
                </p>
                <p className="text-[#1EE3CF]">
                  &ldquo;Spaceship Facility 07 is the last operational recovery hub.&rdquo;
                </p>
                <p className="text-[#FACC15]">
                  &ldquo;The previous operator vanished six months ago.&rdquo;
                </p>
                <p className="text-[#A3E635] font-bold text-lg pt-1">
                  &ldquo;Tonight, you take the last shift.&rdquo;
                </p>
              </div>

              <div className="p-4 rounded bg-[#07141B] border border-[#1EE3CF]/40 text-xs font-mono text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[#1EE3CF]">WAKE LOCATION:</span> Maintenance Bay 01
                </div>
                <div>
                  <span className="text-[#1EE3CF]">COMMAND BRIDGE:</span> Earth Holo-Globe Rotunda
                </div>
                <div>
                  <span className="text-[#1EE3CF]">MOVEMENT:</span> WASD + Mouse Look / Arrow Keys
                </div>
                <div>
                  <span className="text-[#1EE3CF]">INTERACT:</span> Press [E] or Click Physical Controls
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setScreenMode('title')}
                  className="ss-btn px-5 py-2.5 text-xs cursor-pointer"
                >
                  ← Back to Main Menu
                </button>
                <button
                  type="button"
                  data-enter-facility="true"
                  onClick={() => setScreenMode('playing')}
                  className="ss-btn w-full sm:w-auto px-7 py-3 text-xs md:text-sm cursor-pointer"
                >
                  Wake Up in Maintenance Bay 01 — Begin Shift →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          FIRST-PERSON 3D GAMEPLAY HUD (Space-Shooter-UI9 Kit)
      ==================================================================== */}
      {screenMode !== 'title' && screenMode !== 'story_intro' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
          {/* TOP PERIMETER BAR */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* Top-Left: Space-Shooter-UI9 Segmented Health/Power & Energy/XP Bars */}
            <div className="hud-panel rounded-md px-4 py-3 flex items-center gap-4 pointer-events-auto">
              <div className="flex flex-col gap-2">
                {/* Bar 1: Ship Power / Generator Points (Lime-Green Segmented Bar) */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full bg-[#0A1E26] border border-[#1EE3CF] flex items-center justify-center text-[11px] text-[#A3E635] font-bold"
                    title="Ship Generator Power"
                  >
                    ⚡
                  </span>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-display font-bold tracking-wider uppercase text-white">
                      <span>Power Points</span>
                      <span className="font-mono text-[#A3E635] ml-2">
                        TIER {saveState.facilityTier}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="ss-seg-track">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span
                            key={i}
                            className={`ss-seg-cell ${
                              i < powerSegmentsFilled ? 'ss-seg-cell-lime' : ''
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkstationTab('upgrades');
                          setScreenMode('workstation');
                        }}
                        title="Upgrade Ship Power & Hardware"
                        className="ss-icon-btn w-5 h-5 text-[11px] font-mono font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bar 2: Operator XP / NOVA Energy Points (Cyan-Purple Segmented Bar) */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full bg-[#0A1E26] border border-[#1EE3CF] flex items-center justify-center text-[11px] text-[#38BDF8] font-bold"
                    title="Operator Energy & XP"
                  >
                    ★
                  </span>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-display font-bold tracking-wider uppercase text-white">
                      <span>Energy Points · LVL {saveState.operatorLevel}</span>
                      <span className="font-mono text-[#1EE3CF] ml-2">
                        {saveState.credits} CR
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="ss-seg-track">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <span
                            key={i}
                            className={`ss-seg-cell ${
                              i < energySegmentsFilled ? 'ss-seg-cell-energy' : ''
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkstationTab('comm_email');
                          setScreenMode('workstation');
                        }}
                        title="Open Communication Centre"
                        className="ss-icon-btn w-5 h-5 text-[11px] font-mono font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-12 w-[1px] bg-[#1EE3CF]/30" />

              <div className="text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#1EE3CF]">
                  VERIFIED OPS
                </div>
                <div className="text-2xl font-display font-extrabold text-[#A3E635] tabular-nums leading-none mt-1">
                  {saveState.verifiedOperationsCount}
                </div>
              </div>
            </div>

            {/* Top-Center: Chamfered Folder-Tab Active Mission Objective */}
            <div className="max-w-xl flex-1 pointer-events-auto flex flex-col">
              <div className="flex items-center justify-between">
                <div className="ss-folder-tab">
                  <span>[x]</span>
                  <span>CHAPTER 01 · {currentSceneObj.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveState((prev) => ({
                        ...prev,
                        doorsOpen: {
                          ...prev.doorsOpen,
                          door_maint_gen: true,
                          door_gen_cmd: true,
                        },
                        playerPosition: [-3.8, 1.7, 2.2],
                        playerYaw: -0.52,
                      }));
                      showToast('Stepped to Spaceship Central Command Rotunda Bridge.');
                    }}
                    className="ss-btn px-2.5 py-1 text-[10px] cursor-pointer"
                  >
                    Rotunda Bridge
                  </button>
                  <button
                    type="button"
                    onClick={handleStepToCurrentObjective}
                    className="ss-btn px-2.5 py-1 text-[10px] cursor-pointer"
                  >
                    Step to Objective →
                  </button>
                </div>
              </div>
              <div className="ss-folder-body px-3.5 py-1.5">
                <div className="text-xs font-semibold text-white line-clamp-1">
                  {currentSceneObj.objectiveText}
                </div>
                <div className="text-[11px] font-mono text-[#1EE3CF] mt-0.5 line-clamp-1">
                  NOVA: {currentSceneObj.novaBroadcast}
                </div>
              </div>
            </div>

            {/* Top-Right: Space-Shooter-UI9 Beveled Action & Square Icon Buttons */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                data-open-terminals="true"
                onClick={() => setScreenMode('workstation')}
                className="ss-btn px-3.5 py-2.5 text-xs cursor-pointer"
              >
                [TAB] Sector Terminals
              </button>
              <button
                type="button"
                onClick={() => setNovaDrawerOpen((prev) => !prev)}
                className="ss-btn px-3.5 py-2.5 text-xs cursor-pointer"
              >
                [N] NOVA AI ({novaMessages.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.muted = !soundEngine.muted;
                  setMuted(soundEngine.muted);
                }}
                aria-label="Toggle Audio Mute"
                className="ss-icon-btn px-3 py-2.5 text-xs font-mono cursor-pointer"
              >
                {muted ? 'MUTE' : 'AUDIO'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setScreenMode((prev) => (prev === 'paused' ? 'playing' : 'paused'))
                }
                className="ss-icon-btn px-3 py-2.5 text-xs font-mono cursor-pointer"
              >
                [ESC]
              </button>
            </div>
          </div>

          {/* CENTER RETICLE & RAYCAST INTERACTION PROMPT */}
          <div className="flex flex-col items-center justify-center pointer-events-none my-auto">
            <div
              className={`h-3.5 w-3.5 rounded-full border-2 ${
                focusedObject
                  ? 'border-[#A3E635] bg-[#A3E635]/30 scale-125'
                  : 'border-[#1EE3CF]/60 bg-[#1EE3CF]/10'
              }`}
            />
            {focusedObject && (
              <button
                type="button"
                onClick={() => handleInteractWithObject(focusedObject)}
                className="mt-3 px-5 py-2.5 hud-panel rounded-md text-center pointer-events-auto cursor-pointer"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#FACC15]">
                  {focusedObject.room} · INTERACT [PRESS E OR CLICK]
                </div>
                <div className="text-sm font-display font-bold text-white mt-0.5">
                  {focusedObject.label}
                </div>
                <div className="text-[11px] text-[#1EE3CF]">{focusedObject.sublabel}</div>
              </button>
            )}
            {toastBanner && (
              <div className="mt-3 px-5 py-2 ss-banner text-xs font-mono text-[#A3E635]">
                {toastBanner}
              </div>
            )}
          </div>

          {/* BOTTOM QUICK-INTERACT MACHINERY BAR & CONTROLS */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="hud-panel rounded-md px-3.5 py-2 text-[11px] font-mono text-slate-200 pointer-events-auto">
              <span className="text-[#1EE3CF]">POS:</span> (
              {saveState.playerPosition[0].toFixed(1)}, {saveState.playerPosition[2].toFixed(1)}) ·{' '}
              <span className="text-[#A3E635]">CONTROLS:</span> WASD Move · Shift Sprint · Mouse
              Drag Look · E Interact
            </div>

            {/* Direct Physical Station Buttons for Current Progression */}
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              {interactiveObjects.slice(0, 11).map((obj, idx) => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => handleInteractWithObject(obj)}
                  className="ss-btn px-2.5 py-1.5 text-[10px] font-mono cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#FACC15] font-bold">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{obj.label.split('[')[0].trim()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DIEGETIC WORKSTATION TERMINAL MODAL
      ==================================================================== */}
      {screenMode === 'workstation' && (
        <WorkstationModal
          activeTab={workstationTab}
          onSelectTab={setWorkstationTab}
          onClose={() => setScreenMode('playing')}
          saveState={saveState}
          emails={emails}
          selectedEmailId={selectedEmailId}
          onSelectEmail={setSelectedEmailId}
          emailProposals={emailProposals}
          onImportRawEmls={handleImportRawEmls}
          onOverrideEmailCategory={handleOverrideEmailCategory}
          onEmailSingleAction={handleEmailSingleAction}
          onBulkEmailAction={handleBulkEmailAction}
          onUndoEmailAction={handleUndoEmailAction}
          canUndoEmail={emailUndoStack.length > 0}
          onApproveEmailProposal={handleApproveEmailProposal}
          onAskNovaAboutEmail={(email, promptText) => {
            setNovaDrawerOpen(true);
            handleSendNovaQuestion(promptText, email);
          }}
          archiveFiles={archiveFiles}
          onImportArchiveFiles={handleImportArchiveFiles}
          onOverrideFileFolder={handleOverrideFileFolder}
          onExecuteArchiveBatch={handleExecuteArchiveBatch}
          transactions={transactions}
          onAnalyzeFinanceCsv={handleAnalyzeFinanceCsv}
          onApproveFinanceAudit={handleApproveFinanceAudit}
          codeText={codeText}
          diagnostics={diagnostics}
          onRunCodeLint={handleRunCodeLint}
          onApproveCodeFix={handleApproveCodeFix}
          upgrades={upgrades}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          storyLogs={storyLogs}
          onCompleteMysteryScene8={() => {
            setSaveState((prev) => ({
              ...prev,
              currentScene: 'chapter_1_complete',
            }));
            setScreenMode('chapter_complete');
          }}
          gmailConnectedEmail={gmailConnectedEmail}
          gmailAuthError={gmailAuthError}
          gmailLoading={gmailLoading}
          onConnectGoogleGmail={handleConnectGmail}
          onFetchGmailInbox={handleRefreshGmail}
          onDisconnectGoogleGmail={handleDisconnectGmail}
        />
      )}

      {/* ====================================================================
          SETTINGS MODAL (ACCESSIBLE FROM MAIN MENU)
      ==================================================================== */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-label="Game Settings"
          className="fixed inset-0 z-50 bg-[#07131A]/90 flex items-center justify-center p-6 pointer-events-auto"
        >
          <div className="w-full max-w-lg flex flex-col">
            <div>
              <div className="ss-folder-tab">
                <span>[x]</span>
                <span>OPTIONS &amp; CONFIGURATION</span>
              </div>
            </div>
            <div className="ss-folder-body p-6 flex flex-col gap-4">
              <div className="ss-banner px-4 py-2.5 flex items-center justify-between mx-2">
                <h2 className="text-lg font-display font-bold uppercase tracking-wider text-white">
                  OPERATOR SETTINGS
                </h2>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="ss-btn px-3 py-1 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded bg-[#07141B] border border-[#1EE3CF]/35">
                  <div>
                    <div className="text-white font-semibold">Synthesized Spaceship Audio</div>
                    <div className="text-[11px] text-slate-400">
                      WebAudio generator hum, breaker latches, and terminal telemetry
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.muted = !soundEngine.muted;
                      setMuted(soundEngine.muted);
                    }}
                    className="ss-btn px-3 py-1.5 text-xs cursor-pointer"
                  >
                    {muted ? 'OFF' : 'ON'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded bg-[#07141B] border border-[#1EE3CF]/35">
                  <div>
                    <div className="text-white font-semibold">Google OAuth 2.0 Gmail Link</div>
                    <div className="text-[11px] text-slate-400">
                      {gmailConnectedEmail
                        ? `Connected: ${gmailConnectedEmail} (gmail.readonly)`
                        : 'Not connected — Connect inside 02. Communication Centre'}
                    </div>
                  </div>
                  {gmailConnectedEmail ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGmail}
                      className="px-3 py-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#1EE3CF]">STANDBY</span>
                  )}
                </div>

                <div className="p-3 rounded bg-[#07141B] border border-[#1EE3CF]/35 space-y-1 text-slate-300">
                  <div className="text-[#1EE3CF] font-semibold">First-Person 3D Spaceship Controls</div>
                  <div>• W / A / S / D + Shift: Walk &amp; Sprint across Sector Bays</div>
                  <div>• Mouse Drag / Pointer Lock / Left &amp; Right Arrows: Camera Look</div>
                  <div>• [E] or Left-Click Prompt: Operate Doors, Breakers, Levers &amp; Consoles</div>
                  <div>• [TAB]: Sector Workstation Terminals · [N]: NOVA AI Drawer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          NOVA AI & ENGINEER MAYA COMMUNICATION DRAWER
      ==================================================================== */}
      <NovaDrawer
        open={novaDrawerOpen}
        onClose={() => setNovaDrawerOpen(false)}
        messages={novaMessages}
        onSendQuestion={(q) => handleSendNovaQuestion(q)}
        geminiConnected={geminiConnected}
        onTalkToMayaOption={handleTalkToMayaOption}
      />

      {/* ====================================================================
          PAUSE MENU MODAL
      ==================================================================== */}
      {screenMode === 'paused' && (
        <div
          role="dialog"
          aria-label="Pause Menu"
          className="fixed inset-0 z-40 bg-[#07131A]/90 flex items-center justify-center p-6 pointer-events-auto"
        >
          <div className="w-full max-w-md flex flex-col">
            <div>
              <div className="ss-folder-tab">
                <span>[x]</span>
                <span>SIMULATION PAUSED</span>
              </div>
            </div>
            <div className="ss-folder-body p-6 flex flex-col gap-4">
              <div className="ss-banner px-4 py-2 text-center mx-2">
                <h2 className="text-xl font-display font-bold uppercase tracking-wider text-white">
                  OPERATOR STANDBY
                </h2>
              </div>
              <p className="text-xs text-slate-300 text-center">
                Progress is automatically saved to local storage ({saveState.savedAtIso.slice(0, 19)}{' '}
                UTC).
              </p>
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setScreenMode('playing')}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">01</span>
                    <span className="text-xs font-display font-bold uppercase">
                      Resume Shift [ESC]
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScreenMode('workstation')}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">02</span>
                    <span className="text-xs font-display font-bold uppercase">
                      Open Sector Workstation Terminals
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fresh = createInitialFacilitySaveState();
                    setSaveState(fresh);
                    setScreenMode('playing');
                  }}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">03</span>
                    <span className="text-xs font-display font-bold uppercase text-rose-300">
                      Reset Chapter 1 Progress
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScreenMode('title')}
                  className="ss-list-btn cursor-pointer"
                >
                  <div className="flex items-center">
                    <span className="ss-list-badge">04</span>
                    <span className="text-xs font-display font-bold uppercase text-slate-300">
                      Return to Main Menu
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CHAPTER 01 COMPLETE ("VICTORY") RESULTS MODAL
      ==================================================================== */}
      {screenMode === 'chapter_complete' && (
        <div
          role="dialog"
          aria-label="Chapter 01 Complete Mission Results"
          className="fixed inset-0 z-40 bg-[#07131A]/92 flex items-center justify-center p-6 pointer-events-auto"
        >
          <div className="w-full max-w-2xl flex flex-col">
            <div>
              <div className="ss-folder-tab">
                <span>[x]</span>
                <span>CHAPTER 01 COMPLETE · THE AWAKENING</span>
              </div>
            </div>
            <div className="ss-folder-body p-7 flex flex-col gap-5">
              <div className="text-center text-xs font-mono text-[#FACC15] tracking-[0.35em]">
                ★ ★ ★ ★ ★
              </div>
              <div className="ss-banner px-6 py-3 text-center mx-4">
                <h2 className="text-2xl md:text-3xl font-display font-extrabold uppercase tracking-widest text-white">
                  VICTORY · ROTUNDA OPERATIONAL
                </h2>
              </div>
              <div className="p-4 rounded bg-rose-950/30 border border-rose-500/40 text-xs font-mono text-rose-200 leading-relaxed">
                <div>DECRYPTED PACKET: LAST_OPERATOR_LOG_184</div>
                <div className="mt-1 text-white font-sans text-sm italic">
                  &ldquo;If anyone is listening... don’t let the system finish what it started. Buried
                  inside the unread commercial streams and duplicate archive dumps are the original
                  Evacuation &amp; Asset Transfer ledgers from the night of the Blackout.&rdquo;
                </div>
                <div className="mt-2 text-[#FACC15]">
                  NOVA SYSTEM LOG: &ldquo;No anomalous audio packet detected. Resuming standard
                  recovery operations.&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded bg-[#07141B] border border-[#1EE3CF]/40">
                  <div className="text-[10px] font-mono text-slate-400">VERIFIED OPS</div>
                  <div className="text-xl font-display font-bold text-[#1EE3CF] tabular-nums">
                    {saveState.verifiedOperationsCount}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#07141B] border border-[#1EE3CF]/40">
                  <div className="text-[10px] font-mono text-slate-400">EMAILS PROCESSED</div>
                  <div className="text-xl font-display font-bold text-white tabular-nums">
                    {saveState.emailsProcessedCount}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#07141B] border border-[#1EE3CF]/40">
                  <div className="text-[10px] font-mono text-slate-400">OPERATOR LEVEL</div>
                  <div className="text-xl font-display font-bold text-[#A3E635] tabular-nums">
                    LVL {saveState.operatorLevel}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#07141B] border border-[#1EE3CF]/40">
                  <div className="text-[10px] font-mono text-slate-400">CREDITS</div>
                  <div className="text-xl font-display font-bold text-[#FACC15] tabular-nums">
                    {saveState.credits} CR
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScreenMode('workstation');
                    setWorkstationTab('comm_email');
                  }}
                  className="ss-btn px-4 py-2.5 text-xs cursor-pointer"
                >
                  Open Sector Terminals
                </button>
                <button
                  type="button"
                  onClick={() => setScreenMode('playing')}
                  className="ss-btn px-5 py-2.5 text-xs cursor-pointer"
                >
                  Continue Exploring Spaceship 07 (Free Mode)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

