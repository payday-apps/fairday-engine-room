import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { listeners, type ToastItem, type ToastVariant } from '../lib/toast';

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

const AUTO_DISMISS_MS: Record<ToastVariant, number | null> = {
  success: 4000,
  error: null,
  warning: null,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (toast: ToastItem) => {
      setToasts((prev) => [...prev, toast]);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const ms = AUTO_DISMISS_MS[toast.variant];
    if (ms) {
      const timer = setTimeout(() => onDismiss(toast.id), ms);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold shadow-2xl animate-[slideIn_0.2s_ease-out]',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
