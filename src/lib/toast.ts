export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let toastId = 0;
export const listeners: Array<(toast: ToastItem) => void> = [];

export function showToast(message: string, variant: ToastVariant = 'success') {
  const toast: ToastItem = { id: ++toastId, message, variant };
  listeners.forEach((fn) => fn(toast));
}
