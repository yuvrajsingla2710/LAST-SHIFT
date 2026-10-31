import React from 'react';
import {
  ChoreCategoryId,
  ChoreEngineState,
  formatBytes,
  formatMinutesSaved,
} from '../game/chores';
import { GameStateMode, TACTICAL_UPGRADES, TacticalUpgrade } from '../game/rules';

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  score: number;
  bestScore: number;
  combo: number;
  wave: number;
  enemiesRemaining: number;
  level: number;
  xp: number;
  xpToNext: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  isVictory: boolean;
  clearTimeSeconds: number;
  sessionChoresResolved: number;
  sessionUnitsResolved: number;
  accuracyPct?: number;
  difficultyLabel?: 'ASSISTED' | 'NOMINAL' | 'OVERCLOCKED' | 'APEX_SIEGE';
  enemyHealthMultiplier?: number;
  spawnFrequency?: number;
}

export interface HudDomRefs {
  hpBarRef: React.RefObject<HTMLDivElement | null>;
  hpGhostRef: React.RefObject<HTMLDivElement | null>;
  shieldBarRef: React.RefObject<HTMLDivElement | null>;
  xpBarRef: React.RefObject<HTMLDivElement | null>;
  dashCdRef: React.RefObject<HTMLDivElement | null>;
  empCdRef: React.RefObject<HTMLDivElement | null>;
  syncCdRef: React.RefObject<HTMLDivElement | null>;
}

interface GameHudProps {
  mode: GameStateMode;
  hud: HudSnapshot;
  domRefs: HudDomRefs;
  choreState: ChoreEngineState;
  muted: boolean;
  showManifestDrawer: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleManifest: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onSelectUpgrade: (upgrade: TacticalUpgrade) => void;
  onSelectCategory: (id: ChoreCategoryId) => void;
  onManualSyncPulse: () => void;
  onDashClick: () => void;
  onEmpClick: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  mode,
  hud,
  domRefs,
  choreState,
  muted,
  showManifestDrawer,
  onToggleMute,
  onTogglePause,
  onToggleManifest,
  onRestart,
  onReturnTitle,
  onSelectUpgrade,
  onSelectCategory,
  onManualSyncPulse,
  onDashClick,
  onEmpClick,
}) => {
  if (mode === 'title') return null;

  const activeQueue = choreState.queues[choreState.activeCategoryId];
  const pendingItems = activeQueue.items.filter((i) => i.status === 'pending');
  const resolvedItems = activeQueue.items.filter((i) => i.status === 'resolved');
  const completionPct =
    activeQueue.items.length > 0
      ? Math.round((resolvedItems.length / activeQueue.items.length) * 100)
      : 100;

  const isCriticalHp = hud.hp > 0 && hud.hp / hud.maxHp <= 0.3;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6">
      {/* Critical low-HP peripheral vignette */}
      {isCriticalHp && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 95px rgba(239, 68, 68, 0.42)',
          }}
        />
      )}

      {/* TOP PERIMETER ROW: Cluster 1 (Top-Left Hull & Wave) + Cluster 2 (Top-Right Chore Sync & Utility Controls) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Perimeter Cluster: Vitality Pips + Rally Bar + Wave Readout */}
        <div className="hud-panel rounded-lg px-4 py-3 flex items-center gap-5 pointer-events-auto">
          {/* Hull & Shield Bars */}
          <div className="flex flex-col gap-1.5 min-w-[185px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                HULL INTEGRITY
              </span>
              <span className="text-lg font-mono font-bold tabular-nums text-white hud-stroke">
                {Math.round(hud.hp)}/{Math.round(hud.maxHp)}
              </span>
            </div>
            {/* Health Bar with delayed trailing ghost bar */}
            <div className="relative h-2.5 w-full bg-[#050711] rounded overflow-hidden border border-slate-800">
              <div
                ref={domRefs.hpGhostRef}
                className="absolute inset-y-0 left-0 bg-amber-400/70 origin-left"
                style={{ width: '100%', transform: `scaleX(${Math.max(0, hud.hp / hud.maxHp)})` }}
              />
              <div
                ref={domRefs.hpBarRef}
                className="absolute inset-y-0 left-0 bg-[#39E7FF] origin-left"
                style={{ width: '100%', transform: `scaleX(${Math.max(0, hud.hp / hud.maxHp)})` }}
              />
            </div>

            {/* Shield Bar */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span>AEGIS SHIELD</span>
              <span className="tabular-nums text-[#985BFF] font-semibold">
                {Math.round(hud.shield)}/{Math.round(hud.maxShield)}
              </span>
            </div>
            <div className="relative h-1.5 w-full bg-[#050711] rounded overflow-hidden border border-slate-800">
              <div
                ref={domRefs.shieldBarRef}
                className="
                  absolute inset-y-0 left-0 bg-[#985BFF] origin-left
                "
                style={{
                  width: '100%',
                  transform: `scaleX(${Math.max(0, hud.shield / Math.max(1, hud.maxShield))})`,
                }}
              />
            </div>
          </div>

          <div className="h-11 w-[1px] bg-slate-800" />

          {/* Hero Wave & Adaptive Threat Readout (~3:1 scale hierarchy) */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                WAVE
              </div>
              <div className="text-2xl font-display font-extrabold tabular-nums text-[#39E7FF] hud-stroke leading-none mt-0.5">
                {hud.wave}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                HOSTILES
              </div>
              <div className="text-2xl font-display font-extrabold tabular-nums text-white hud-stroke leading-none mt-0.5">
                {hud.enemiesRemaining}
              </div>
            </div>
            <div className="hidden sm:flex flex-col justify-center border-l border-slate-800 pl-3">
              <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                PACING · {hud.accuracyPct ?? 100}% ACC
              </div>
              <div className="text-[11px] font-mono font-bold tabular-nums text-[#985BFF] mt-0.5">
                {hud.difficultyLabel ?? 'NOMINAL'} · {(hud.spawnFrequency ?? 0.77).toFixed(2)}/s
              </div>
            </div>
          </div>
        </div>

        {/* Center Boss Bar (Only visible when Boss is active on arena) */}
        {hud.bossName && hud.bossHp > 0 && (
          <div className="hud-panel-purple rounded-lg px-5 py-2.5 min-w-[320px] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#FF5722] font-bold tracking-wider">
                BOSS // {hud.bossName}
              </span>
              <span className="tabular-nums text-white">
                {Math.round(hud.bossHp)} / {Math.round(hud.bossMaxHp)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#050711] rounded overflow-hidden border border-rose-500/40">
              <div
                className="h-full bg-rose-500 origin-left"
                style={{
                  transform: `scaleX(${Math.max(0, hud.bossHp / Math.max(1, hud.bossMaxHp))})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Top-Right Perimeter Cluster: Score/Combo + Live Chore Execution Feed + Compact Square Icon Buttons */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <div className="hud-panel rounded-lg px-4 py-2.5 flex items-center gap-5">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                SCORE · {hud.combo}X COMBO
              </div>
              <div className="text-2xl font-mono font-bold tabular-nums text-white hud-stroke leading-tight">
                {Math.round(hud.score).toLocaleString()}
              </div>
            </div>

            <div className="h-9 w-[1px] bg-slate-800" />

            {/* Live Background Chore Pipeline Status */}
            <div className="min-w-[230px] max-w-[270px]">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                <span className="text-[#39E7FF] truncate">{activeQueue.name}</span>
                <span className="tabular-nums text-emerald-400 font-semibold">
                  {choreState.totals.unitsResolved.toLocaleString()} DONE ({completionPct}%)
                </span>
              </div>
              <div className="text-xs font-mono text-slate-200 truncate mt-0.5">
                {choreState.logs[0]
                  ? `✓ ${choreState.logs[0].title} (${choreState.logs[0].unitsResolved} ${choreState.logs[0].unitLabel})`
                  : pendingItems[0]
                  ? `Queued: ${pendingItems[0].title}`
                  : 'All Queues Synchronized'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                Saved {formatMinutesSaved(choreState.totals.timeSavedSeconds)} · {formatBytes(choreState.totals.bytesSaved)}
              </div>
            </div>
          </div>

          {/* Top-Right Utility Controls: Compact Clickable Square <svg> Icon Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Inspect Chore Manifest [L]"
              title="Chore Manifest [L]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleManifest();
              }}
              className="w-10 h-10 hud-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-[#39E7FF] hover:border-[#39E7FF] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12l2 2 4-4" stroke="#39E7FF" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              title="Mute / Unmute [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-10 h-10 hud-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-[#39E7FF] hover:border-[#39E7FF] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {muted ? (
                  <line x1="23" y1="9" x2="17" y2="15" stroke="#EF4444" />
                ) : (
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#39E7FF" />
                )}
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game [P]"
              title="Pause [P / Esc]"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="w-10 h-10 hud-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-[#39E7FF] hover:border-[#39E7FF] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart Sortie [R]"
              title="Restart [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-10 h-10 hud-panel rounded-lg flex items-center justify-center text-slate-200 hover:text-[#39E7FF] hover:border-[#39E7FF] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* OPTIONAL LIVE CHORE MANIFEST DRAWER (Toggled via [L] or Manifest button) */}
      {showManifestDrawer && mode === 'playing' && (
        <div className="self-end hud-panel rounded-xl p-4 w-full max-w-[420px] pointer-events-auto flex flex-col gap-3 max-h-[55vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#39E7FF]">
              Live Background Chore Execution Log
            </span>
            <button
              type="button"
              onClick={onToggleManifest}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              Close [L]
            </button>
          </div>

          <div className="flex gap-1.5">
            {(Object.keys(choreState.queues) as ChoreCategoryId[]).map((catId) => (
              <button
                key={catId}
                type="button"
                onClick={() => onSelectCategory(catId)}
                className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                  choreState.activeCategoryId === catId
                    ? 'bg-[#278BFF] text-white'
                    : 'bg-[#050711] text-slate-400 hover:text-white'
                }`}
              >
                {choreState.queues[catId].name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-mono">
            {choreState.logs.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/80 text-slate-200"
              >
                <span className="truncate text-emerald-400">✓ {entry.title}</span>
                <span className="tabular-nums text-slate-400 shrink-0">
                  +{entry.unitsResolved} {entry.unitLabel}
                </span>
              </div>
            ))}
            {choreState.logs.length === 0 && (
              <div className="text-slate-400 py-2">
                Destroy incoming hostiles or press [E] Sync Beam to execute your first chore batch.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM PERIMETER DOCK: Weapon & Ability Slots with [Key] bindings, Role Clues, and Live Cooldown Bars */}
      <div className="flex items-end justify-between gap-4">
        <div className="hud-panel rounded-lg px-4 py-2.5 flex items-center gap-4 pointer-events-auto">
          {/* Slot 1: Primary Cannon */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#050711] border border-[#39E7FF]/50 flex items-center justify-center text-xs font-mono font-bold text-[#39E7FF]">
              LMB
            </div>
            <div>
              <div className="text-xs font-semibold text-white whitespace-nowrap">
                Pulse Twin-Cannon
              </div>
              <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                Rapid Plasma · Auto-Aim / Cursor
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-slate-800" />

          {/* Slot 2: Phase Dash */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onDashClick();
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded bg-[#050711] border border-[#278BFF]/60 group-hover:border-[#39E7FF] flex items-center justify-center text-xs font-mono font-bold text-[#39E7FF]">
              SPC
            </div>
            <div className="min-w-[115px]">
              <div className="text-xs font-semibold text-white whitespace-nowrap">
                Phase Dash · I-Frames
              </div>
              <div className="h-1.5 w-full bg-[#050711] rounded overflow-hidden border border-slate-800 mt-1">
                <div
                  ref={domRefs.dashCdRef}
                  className="h-full bg-[#39E7FF] origin-left"
                  style={{ width: '100%', transform: 'scaleX(1)' }}
                />
              </div>
            </div>
          </button>

          <div className="h-7 w-[1px] bg-slate-800" />

          {/* Slot 3: Signal EMP Overdrive */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onEmpClick();
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded bg-[#050711] border border-[#985BFF]/60 group-hover:border-[#985BFF] flex items-center justify-center text-xs font-mono font-bold text-[#985BFF]">
              Q
            </div>
            <div className="min-w-[125px]">
              <div className="text-xs font-semibold text-white whitespace-nowrap">
                Signal EMP · Nova Purge
              </div>
              <div className="h-1.5 w-full bg-[#050711] rounded overflow-hidden border border-slate-800 mt-1">
                <div
                  ref={domRefs.empCdRef}
                  className="h-full bg-[#985BFF] origin-left"
                  style={{ width: '100%', transform: 'scaleX(1)' }}
                />
              </div>
            </div>
          </button>

          <div className="h-7 w-[1px] bg-slate-800" />

          {/* Slot 4: Direct Chore Sync Beam */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onManualSyncPulse();
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded bg-[#050711] border border-emerald-500/60 group-hover:border-emerald-400 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
              E
            </div>
            <div className="min-w-[125px]">
              <div className="text-xs font-semibold text-white whitespace-nowrap">
                Sync Beam · Batch Flush
              </div>
              <div className="h-1.5 w-full bg-[#050711] rounded overflow-hidden border border-slate-800 mt-1">
                <div
                  ref={domRefs.syncCdRef}
                  className="h-full bg-emerald-400 origin-left"
                  style={{ width: '100%', transform: 'scaleX(1)' }}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Bottom-Right Level / XP Progress */}
        <div className="hud-panel rounded-lg px-4 py-2.5 min-w-[210px] pointer-events-auto">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#39E7FF] font-bold">SHIP LEVEL {hud.level}</span>
            <span className="tabular-nums text-slate-400">
              {Math.round(hud.xp)}/{Math.round(hud.xpToNext)} XP
            </span>
          </div>
          <div className="h-2 w-full bg-[#050711] rounded overflow-hidden border border-slate-800 mt-1.5">
            <div
              ref={domRefs.xpBarRef}
              className="h-full bg-[#278BFF] origin-left"
              style={{
                width: '100%',
                transform: `scaleX(${Math.min(1, hud.xp / Math.max(1, hud.xpToNext))})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* SINGLE FOCUSED STATUS MODAL CARD: UPGRADE DRAFT / PAUSED / GAME OVER */}
      {mode === 'upgrade' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#050711]/80 pointer-events-auto p-6">
          <div
            role="dialog"
            aria-label="Wave Clear Tactical Upgrade"
            className="hud-panel rounded-2xl p-7 max-w-[680px] w-full flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-[#39E7FF]">
                  SECTOR WAVE {hud.wave - 1} CLEARED · CHORE SYNC COMPLETE
                </div>
                <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                  Select Interceptor System Augment
                </h2>
              </div>
              <div className="text-right font-mono text-xs text-slate-400 tabular-nums">
                <div>CHORES RESOLVED</div>
                <div className="text-base font-bold text-emerald-400">
                  {choreState.totals.unitsResolved.toLocaleString()} items
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {TACTICAL_UPGRADES.slice(0, 3).map((upg, idx) => (
                <button
                  key={upg.id}
                  type="button"
                  onClick={() => onSelectUpgrade(upg)}
                  className="text-left p-4 rounded-xl bg-[#070B19] border border-slate-800 hover:border-[#39E7FF] transition-all flex flex-col justify-between gap-3 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>AUGMENT 0{idx + 1}</span>
                      <span style={{ color: upg.accent }}>[{idx + 1}]</span>
                    </div>
                    <h3 className="text-base font-display font-bold text-white mt-1 group-hover:text-[#39E7FF]">
                      {upg.name}
                    </h3>
                    <div
                      className="text-xs font-mono mt-1"
                      style={{ color: upg.accent }}
                    >
                      {upg.roleClue}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {upg.description}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#39E7FF] group-hover:translate-x-1 transition-transform">
                    Install Augment &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#050711]/82 pointer-events-auto p-6">
          <div
            role="dialog"
            aria-label="Sortie Paused"
            className="hud-panel rounded-2xl p-7 max-w-[560px] w-full flex flex-col gap-5"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[#39E7FF]">
                INTERCEPTOR TELEMETRY HOLD
              </div>
              <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                Sortie Paused &amp; Chore Audit
              </h2>
            </div>

            {/* 3 Tabular-Nums Stat Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">SCORE</div>
                <div className="text-xl font-mono font-bold tabular-nums text-white mt-0.5">
                  {Math.round(hud.score).toLocaleString()}
                </div>
              </div>
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">CHORES RESOLVED</div>
                <div className="text-xl font-mono font-bold tabular-nums text-[#39E7FF] mt-0.5">
                  {choreState.totals.unitsResolved.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">DATA CLEANED</div>
                <div className="text-xl font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
                  {formatBytes(choreState.totals.bytesSaved)}
                </div>
              </div>
            </div>

            {/* Recent Background Chore Executions */}
            <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3.5 max-h-[160px] overflow-y-auto flex flex-col gap-1.5">
              <div className="text-xs font-mono text-slate-400 uppercase">
                Verified Background Executions ({choreState.totals.batchesResolved} batches)
              </div>
              {choreState.logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 truncate">
                    ✓ {log.title} · {log.actionTaken}
                  </span>
                  <span className="text-[#39E7FF] tabular-nums shrink-0">
                    {log.unitsResolved} {log.unitLabel}
                  </span>
                </div>
              ))}
              {choreState.logs.length === 0 && (
                <div className="text-xs font-mono text-slate-500">
                  No batches executed yet in this sortie.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex-1 py-3 px-4 rounded-lg bg-[#278BFF] hover:bg-[#39E7FF] text-[#050711] font-display font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
              >
                Resume Sortie
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="py-3 px-4 rounded-lg bg-[#070B19] hover:bg-slate-800 text-white border border-slate-700 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="py-3 px-4 rounded-lg bg-[#070B19] hover:bg-slate-800 text-slate-300 border border-slate-700 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Title
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#050711]/85 pointer-events-auto p-6">
          <div
            role="dialog"
            aria-label={hud.isVictory ? 'Sector Cleared Victory' : 'Signal Lost Game Over'}
            className="hud-panel rounded-2xl p-7 max-w-[560px] w-full flex flex-col gap-5"
          >
            <div>
              <div
                className={`text-xs font-mono uppercase tracking-widest ${
                  hud.isVictory ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hud.isVictory
                  ? 'ALL SECTOR WAVES NEUTRALIZED · BACKLOG PURGED'
                  : 'INTERCEPTOR HULL BREACHED · SHIFT TERMINATED'}
              </div>
              <h2 className="text-3xl font-display font-extrabold text-white mt-1">
                {hud.isVictory ? 'Shift Complete: Signal Restored' : 'Signal Siege: Hull Lost'}
              </h2>
            </div>

            {/* 3 Outcome-Matched Tabular-Nums Stat Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">
                  {hud.isVictory ? 'CLEAR TIME' : 'WAVE REACHED'}
                </div>
                <div className="text-xl font-mono font-bold tabular-nums text-white mt-0.5">
                  {hud.isVictory ? `${Math.round(hud.clearTimeSeconds)}s` : `Wave ${hud.wave}`}
                </div>
              </div>
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">SCORE / BEST</div>
                <div className="text-xl font-mono font-bold tabular-nums text-[#39E7FF] mt-0.5">
                  {Math.round(hud.score).toLocaleString()} / {Math.round(hud.bestScore).toLocaleString()}
                </div>
              </div>
              <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-400">CHORES EXECUTED</div>
                <div className="text-xl font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
                  {choreState.totals.unitsResolved.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-[#050711]/90 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between text-xs font-mono text-slate-300">
              <span>
                Real-World Time Saved: <strong className="text-white">{formatMinutesSaved(choreState.totals.timeSavedSeconds)}</strong>
              </span>
              <span>
                Storage Freed: <strong className="text-[#39E7FF]">{formatBytes(choreState.totals.bytesSaved)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestart();
                }}
                className="flex-1 py-3.5 px-5 rounded-lg bg-[#278BFF] hover:bg-[#39E7FF] text-[#050711] font-display font-extrabold text-sm uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
              >
                {hud.isVictory ? 'Play Again · Next Shift' : 'Try Again · Relaunch Sortie'}
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="py-3.5 px-5 rounded-lg bg-[#070B19] hover:bg-slate-800 text-slate-300 border border-slate-700 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
