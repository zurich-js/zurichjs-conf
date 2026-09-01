/**
 * Toast bridge for non-React modules.
 *
 * `query-client.ts` (and anything else outside the component tree) cannot call
 * `useToast()`. The ToastProvider registers its dispatcher here on mount, and
 * module-level code emits through `emitToast`. Before the provider mounts (or
 * on the server) emissions are silently dropped — the error is still logged
 * and captured by the caller; only the visual notice is skipped.
 */

export interface BusToast {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

type ToastDispatcher = (toast: BusToast) => void;

let dispatcher: ToastDispatcher | null = null;

/** Called by ToastProvider on mount/unmount. */
export function registerToastDispatcher(fn: ToastDispatcher | null): void {
  dispatcher = fn;
}

export function emitToast(toast: BusToast): void {
  dispatcher?.(toast);
}
