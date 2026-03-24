import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface PromoteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  stagingRowCount?: number;
}

export default function PromoteModal({ open, onClose, onConfirm, stagingRowCount }: PromoteModalProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onClose]);

  const canConfirm = input === 'PROMOTE' && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !loading && onClose()}>
      <div
        className="bg-surface border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
            <ShieldAlert size={20} className="text-amber-400" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tighter">Promote to Production</h3>
        </div>

        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
          This will replace the live claims.csv with the current staging version. All Fairday users will see the updated data immediately.
        </p>

        {stagingRowCount !== undefined && (
          <div className="mb-4 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-xl">
            <span className="text-amber-400 font-black text-sm">{stagingRowCount}</span>
            <span className="text-zinc-500 text-xs ml-2">claims in staging</span>
          </div>
        )}

        <div className="mb-6">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">
            Type PROMOTE to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type PROMOTE to confirm"
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/30 transition-colors disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canConfirm) handleConfirm();
            }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="bg-white/5 text-zinc-400 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-amber-500 text-dark font-black rounded-xl px-6 py-2.5 text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Promoting...
              </>
            ) : (
              'Promote'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
