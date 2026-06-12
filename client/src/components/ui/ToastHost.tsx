import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dismiss, subscribe, type Toast } from '../../lib/toast';

/** Renders toasts pushed via lib/toast.ts. Mounted once in the app shell. */
export default function ToastHost() {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map(item => (
        <div
          key={item.id}
          role="status"
          className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            item.kind === 'success' ? 'bg-forest' : 'bg-coral'
          }`}
        >
          {item.kind === 'success' ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{item.message}</span>
          <button
            type="button"
            aria-label={t('common.close')}
            // -m-2/p-2 grows the tap target to 32px without shifting the row
            // (the negative margin cancels the padding); fits inside the toast's
            // py-3/px-4 so it never overlaps a stacked toast
            className="-m-2 shrink-0 p-2 opacity-70 transition hover:opacity-100"
            onClick={() => dismiss(item.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
