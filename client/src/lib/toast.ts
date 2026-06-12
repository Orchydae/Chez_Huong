/*
 * Minimal toast store — no library. toast.success/error pushes a message;
 * ToastHost (components/ui/ToastHost.tsx) subscribes and renders. Replaces
 * the old client's alert() calls.
 */

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

function push(kind: Toast['kind'], message: string): void {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), 5000);
}

export function dismiss(id: number): void {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
};
