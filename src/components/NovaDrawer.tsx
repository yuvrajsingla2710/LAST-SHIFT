import React, { useState } from 'react';
import { NovaChatMessage } from '../facility/types';

interface NovaDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: NovaChatMessage[];
  onSendQuestion: (question: string) => Promise<void>;
  geminiConnected: boolean;
  onTalkToMayaOption: (topic: 'comm_unlock' | 'operator_06' | 'archive_vault') => void;
}

const QUICK_PROMPTS = [
  'Is this a business email or advertisement?',
  'Which files are duplicates and why?',
  'Explain the duplicate financial transaction.',
  'What does the router code lint error mean?',
  'What is my current mission objective?',
];

export const NovaDrawer: React.FC<NovaDrawerProps> = ({
  open,
  onClose,
  messages,
  onSendQuestion,
  geminiConnected,
  onTalkToMayaOption,
}) => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setInput('');
    setBusy(true);
    try {
      await onSendQuestion(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="NOVA AI & Engineer Maya Communication Link"
      className="fixed right-4 top-20 bottom-20 w-full max-w-md z-30 flex flex-col pointer-events-auto"
    >
      <div>
        <div className="ss-folder-tab">
          <span>[x]</span>
          <span>NOVA AI CORE &amp; ENGINEER INTERCOM</span>
        </div>
      </div>

      <div className="ss-folder-body flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#08171F] border-b border-[#1EE3CF]/35 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#1EE3CF]">
              SPACESHIP ROTUNDA COMM LINK
            </div>
            <div className="text-[11px] font-mono text-slate-300 mt-0.5">
              Mode:{' '}
              {geminiConnected
                ? 'Server-Side Gemini + Rule Verification'
                : 'Honest Deterministic Rule Engine'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ss-btn px-2.5 py-1 text-xs cursor-pointer"
          >
            Close [N]
          </button>
        </div>

        {/* Engineer Maya Chen Quick Dialogue Bar */}
        <div className="px-4 py-2.5 bg-[#0A1D26] border-b border-[#1EE3CF]/30 flex flex-col gap-1.5">
          <div className="text-[10px] font-mono uppercase text-[#FACC15]">
            ENGINEER MAYA CHEN · DIRECT INTERCOM
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onTalkToMayaOption('comm_unlock')}
              className="ss-btn px-2 py-1 text-[10px] cursor-pointer"
            >
              01 Unlock Comm Bay
            </button>
            <button
              type="button"
              onClick={() => onTalkToMayaOption('operator_06')}
              className="ss-btn px-2 py-1 text-[10px] cursor-pointer"
            >
              02 Operator 06
            </button>
            <button
              type="button"
              onClick={() => onTalkToMayaOption('archive_vault')}
              className="ss-btn px-2 py-1 text-[10px] cursor-pointer"
            >
              03 Archive Vault
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded border text-xs ${
                m.sender === 'operator'
                  ? 'bg-[#14353E] border-[#1EE3CF]/60 text-white ml-6'
                  : m.sender === 'maya'
                  ? 'bg-amber-950/30 border-[#FACC15]/50 text-amber-100 mr-4'
                  : 'bg-[#07141B] border-[#1EE3CF]/30 text-slate-200 mr-4'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 mb-1">
                <span
                  className={
                    m.sender === 'nova'
                      ? 'text-[#1EE3CF] font-semibold'
                      : m.sender === 'maya'
                      ? 'text-[#FACC15] font-semibold'
                      : 'text-[#A3E635]'
                  }
                >
                  {m.sender === 'nova'
                    ? 'NOVA CORE'
                    : m.sender === 'maya'
                    ? 'MAYA CHEN (ENGINEER)'
                    : 'OPERATOR 07'}
                </span>
                {m.engineBadge && <span className="text-[9px] text-slate-400">{m.engineBadge}</span>}
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

              {m.facts && m.facts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1EE3CF]/25 text-[11px]">
                  <div className="font-mono text-[10px] text-[#A3E635] uppercase">
                    Verified Facts:
                  </div>
                  <ul className="list-disc list-inside text-slate-200 mt-0.5 space-y-0.5">
                    {m.facts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {m.assumptions && m.assumptions.length > 0 && (
                <div className="mt-1.5 text-[11px] text-slate-300">
                  <span className="font-mono text-[10px] text-[#38BDF8] uppercase">
                    Assumptions:{' '}
                  </span>
                  {m.assumptions.join(' ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Prompts */}
        <div className="px-3 py-2 bg-[#07141B] border-t border-[#1EE3CF]/30 flex gap-1.5 overflow-x-auto">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => onSendQuestion(qp)}
              className="px-2 py-1 rounded bg-[#0A1E26] border border-[#1EE3CF]/35 text-[10px] font-mono text-[#1EE3CF] hover:border-[#A3E635] shrink-0 cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-[#08171F] border-t border-[#1EE3CF]/35 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask NOVA to explain an email, file, or error..."
            className="flex-1 bg-[#07131A] border border-[#1EE3CF]/40 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A3E635]"
          />
          <button
            type="submit"
            disabled={busy}
            className="ss-btn px-3.5 py-1.5 text-xs cursor-pointer"
          >
            {busy ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};
