import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Override the panel max-width (default `max-w-md`) for wider dialogs. */
  panelClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Centered dialog over a dimmed backdrop. Closes on backdrop click and Esc. */
export default function Modal({ onClose, children, panelClassName = 'max-w-md' }: ModalProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  // Close only when the gesture STARTED on the backdrop — a text-selection
  // drag that starts in an input and ends outside must not discard the form.
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus lands on the dialog when it opens (so screen readers announce it and
  // Tab starts inside) and returns to the opener when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, []);

  // Keep Tab cycling inside the dialog — the page behind stays unreachable.
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      // backdrop is the scroll container; the panel's m-auto centers it when it
      // fits and top-aligns + scrolls when it's taller than the viewport (a tall
      // form on a short phone) so its top/bottom controls stay reachable
      className="fixed inset-0 z-50 flex overflow-y-auto bg-forest/60 p-4 backdrop-blur-sm"
      onMouseDown={e => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose();
        mouseDownOnBackdrop.current = false;
      }}
      onKeyDown={trapTab}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative m-auto w-full ${panelClassName} rounded-2xl bg-cream p-8 shadow-2xl outline-none`}
      >
        <button
          type="button"
          aria-label={t('common.close')}
          className="absolute top-4 right-4 rounded-full p-1.5 text-forest/50 transition hover:bg-forest/10 hover:text-forest"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
