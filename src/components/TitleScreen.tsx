import React, { useState } from 'react';
import {
  ChoreCategoryId,
  ChoreEngineState,
  formatBytes,
  formatMinutesSaved,
} from '../game/chores';

interface TitleScreenProps {
  choreState: ChoreEngineState;
  onSelectCategory: (id: ChoreCategoryId) => void;
  onAddCustomChore: (input: {
    categoryId: ChoreCategoryId;
    title: string;
    sourceDetail: string;
    targetAction: string;
    units: number;
  }) => Promise<void>;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  choreState,
  onSelectCategory,
  onAddCustomChore,
  onStartGame,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customAction, setCustomAction] = useState('');
  const [customUnits, setCustomUnits] = useState('45');
  const [formError, setFormError] = useState<string | null>(null);

  const categories = Object.values(choreState.queues);
  const activeQueue = choreState.queues[choreState.activeCategoryId];
  const pendingCount = activeQueue.items.filter((i) => i.status === 'pending').length;
  const resolvedCount = activeQueue.items.filter((i) => i.status === 'resolved').length;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedUnits = Number(customUnits);
    if (!customTitle.trim() || !customAction.trim() || !Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setFormError('Enter a batch name, resolution action, and positive item count.');
      return;
    }
    setFormError(null);
    try {
      await onAddCustomChore({
        categoryId: choreState.activeCategoryId,
        title: customTitle.trim(),
        sourceDetail: customSource.trim() || 'Manual Queue Injection',
        targetAction: customAction.trim(),
        units: parsedUnits,
      });
      setCustomTitle('');
      setCustomSource('');
      setCustomAction('');
      setShowAddForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not queue task.');
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between px-8 py-7 md:px-14 md:py-10">
      {/* Left-Third Asymmetric Negative-Space Composition (Leaves right 55% clear for live spaceship centerpiece) */}
      <div className="w-full max-w-[540px] pointer-events-auto flex flex-col gap-5 my-auto">
        {/* Custom Inline SVG Title Lockup */}
        <div className="select-none">
          <svg
            viewBox="0 0 520 118"
            className="w-full max-w-[490px] h-auto overflow-visible"
            role="img"
            aria-label="Last Shift: Signal Siege"
          >
            <defs>
              <linearGradient id="hullSilver" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#D5E6FF" />
                <stop offset="100%" stopColor="#7AA7FF" />
              </linearGradient>
              <linearGradient id="signalCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#39E7FF" />
                <stop offset="55%" stopColor="#278BFF" />
                <stop offset="100%" stopColor="#985BFF" />
              </linearGradient>
              <filter id="neonGlow" x="-15%" y="-20%" width="130%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#278BFF" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Top tactical frame bracket */}
            <path
              d="M4 18 L24 4 L196 4 L208 16 L490 16"
              fill="none"
              stroke="#39E7FF"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <polygon points="4,18 14,18 24,8 14,8" fill="#39E7FF" opacity="0.85" />
            <text
              x="32"
              y="13"
              fill="#39E7FF"
              fontFamily="JetBrains Mono, monospace"
              fontSize="10"
              fontWeight="700"
              letterSpacing="3.5"
            >
              ORBITAL CHORE EXECUTION INTERCEPTOR
            </text>

            {/* Main Title: LAST SHIFT */}
            <text
              x="4"
              y="68"
              fill="url(#hullSilver)"
              stroke="#050711"
              strokeWidth="6"
              paintOrder="stroke fill"
              filter="url(#neonGlow)"
              fontFamily="Outfit, sans-serif"
              fontSize="58"
              fontWeight="800"
              letterSpacing="2"
            >
              LAST SHIFT
            </text>

            {/* Subtitle Emblem: SIGNAL SIEGE */}
            <path
              d="M6 82 L318 82 L306 108 L6 108 Z"
              fill="#0B1225"
              stroke="#278BFF"
              strokeWidth="1.5"
            />
            <rect x="6" y="82" width="6" height="26" fill="#39E7FF" />
            <text
              x="22"
              y="100"
              fill="url(#signalCyan)"
              fontFamily="Outfit, sans-serif"
              fontSize="19"
              fontWeight="700"
              letterSpacing="5.5"
            >
              SIGNAL SIEGE
            </text>

            {/* Right wing telemetry ticks */}
            <g transform="translate(330, 88)">
              <rect x="0" y="0" width="18" height="4" fill="#39E7FF" opacity="0.9" />
              <rect x="24" y="0" width="12" height="4" fill="#278BFF" opacity="0.7" />
              <rect x="42" y="0" width="8" height="4" fill="#985BFF" opacity="0.6" />
              <text
                x="0"
                y="17"
                fill="#94A3B8"
                fontFamily="JetBrains Mono, monospace"
                fontSize="10"
                letterSpacing="1.2"
              >
                REAL-TIME BACKLOG PURGE
              </text>
            </g>
          </svg>
        </div>

        <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed max-w-[48ch]">
          Every enemy squadron you vaporize in the arena executes queued digital chores in the background—archiving thousands of unread emails, sorting messy folders, auditing receipts, and patching lint errors.
        </p>

        {/* Active Chore Queue Selector */}
        <div className="hud-panel rounded-xl p-4 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#39E7FF]">
              Select Background Chore Queue
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {choreState.totals.unitsResolved} resolved · {formatBytes(choreState.totals.bytesSaved)} cleaned
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Chore Mission Queue">
            {categories.map((cat) => {
              const isSelected = cat.id === choreState.activeCategoryId;
              const pendingUnits = cat.items
                .filter((i) => i.status === 'pending')
                .reduce((acc, i) => acc + i.units, 0);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#132042] border-[#39E7FF] shadow-[0_0_20px_rgba(57,231,255,0.2)]'
                      : 'bg-[#070B19]/80 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-white truncate">
                      {cat.name}
                    </span>
                    <span
                      className="text-[11px] font-mono tabular-nums shrink-0"
                      style={{ color: cat.accentColor }}
                    >
                      {pendingUnits.toLocaleString()} {cat.unitLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cat.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Preview of next 2 queued batches in selected sector */}
          <div className="bg-[#050711]/85 rounded-lg p-3 border border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-slate-300 whitespace-nowrap">
                {activeQueue.sectorName.split('·')[0].trim()} · {pendingCount} pending · {resolvedCount} resolved
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="text-xs font-mono text-[#39E7FF] hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {showAddForm ? 'Close Queue Form' : '+ Queue Custom Chore'}
              </button>
            </div>

            {showAddForm ? (
              <form onSubmit={handleCustomSubmit} className="flex flex-col gap-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="chore-title-input" className="sr-only">
                      Chore Batch Name
                    </label>
                    <input
                      id="chore-title-input"
                      type="text"
                      placeholder="Batch name (e.g. Old_PR_Alerts)"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B1225] border border-slate-700 rounded text-white focus:outline-none focus:border-[#39E7FF]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chore-units-input" className="sr-only">
                      Item Count
                    </label>
                    <input
                      id="chore-units-input"
                      type="number"
                      min={1}
                      max={5000}
                      placeholder="Count"
                      value={customUnits}
                      onChange={(e) => setCustomUnits(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B1225] border border-slate-700 rounded text-white font-mono tabular-nums focus:outline-none focus:border-[#39E7FF]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="chore-action-input" className="sr-only">
                    Target Action
                  </label>
                  <input
                    id="chore-action-input"
                    type="text"
                    placeholder="Action (e.g. Archive & label 2026_Tax)"
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-[#0B1225] border border-slate-700 rounded text-white focus:outline-none focus:border-[#39E7FF]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-[#278BFF] hover:bg-[#39E7FF] hover:text-[#050711] text-white rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Add Batch
                  </button>
                </div>
                {formError && <p className="text-xs text-rose-400">{formError}</p>}
              </form>
            ) : (
              <div className="flex flex-col gap-1.5">
                {activeQueue.items
                  .filter((i) => i.status === 'pending')
                  .slice(0, 2)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-slate-300 font-mono"
                    >
                      <span className="truncate max-w-[290px]">
                        Next: {item.title} ({item.targetAction})
                      </span>
                      <span className="text-[#39E7FF] tabular-nums shrink-0">
                        {item.units} {item.unitLabel}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Primary Launch CTA (<= 3 actions total on Title) */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="flex-1 py-3.5 px-6 rounded-lg bg-[#278BFF] hover:bg-[#39E7FF] text-[#050711] font-display font-extrabold text-base tracking-wider uppercase shadow-[0_0_28px_rgba(39,139,255,0.55)] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            Launch Sortie · Execute Queue
          </button>
          <div className="text-xs font-mono text-slate-400 tabular-nums leading-tight">
            <div>TIME SAVED</div>
            <div className="text-sm font-bold text-white">
              {formatMinutesSaved(choreState.totals.timeSavedSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Single flat borderless inline control hint in bottom safe margin */}
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 tracking-wide">
        <span>
          WASD / Arrows Move · Mouse Aim &amp; Fire · Space Phase Dash · Q Signal EMP · E Sync Beam · Esc Pause
        </span>
        <span className="hidden md:inline text-slate-500">
          {activeQueue.name} Ready
        </span>
      </div>
    </div>
  );
};
