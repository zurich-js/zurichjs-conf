/**
 * Toast Notification System
 *
 * Provides a context and components for displaying toast notifications.
 * Supports success, error, warning, and info variants with auto-dismiss.
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Per-type accents — matches the dark brand palette used across the cart UI.
// Background is consistent across types so the toast reads as a single
// component family; the left border + icon color carry the status meaning.
const variantStyles: Record<ToastType, { border: string; iconColor: string }> = {
  success: { border: 'border-l-brand-green', iconColor: 'text-brand-green' },
  error: { border: 'border-l-brand-red', iconColor: 'text-brand-red' },
  warning: { border: 'border-l-brand-orange', iconColor: 'text-brand-orange' },
  info: { border: 'border-l-brand-blue', iconColor: 'text-brand-blue' },
};

// Toast icons
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const className = `w-5 h-5 ${variantStyles[type].iconColor}`;
  switch (type) {
    case 'success':
      return <Check className={className} />;
    case 'error':
      return <X className={className} />;
    case 'warning':
      return <AlertTriangle className={className} />;
    case 'info':
      return <Info className={className} />;
  }
};

// Individual toast component
const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
  const { border } = variantStyles[toast.type];

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(onDismiss, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-start gap-3 p-4 rounded-2xl border border-brand-gray-dark border-l-4 ${border} bg-brand-gray-darkest shadow-xl shadow-black/40 w-full sm:max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        <ToastIcon type={toast.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-white">{toast.title}</p>
        {toast.message && (
          <p className="text-sm mt-1 text-brand-gray-light">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className="inline-flex items-center mt-3 px-3 py-1.5 text-xs font-bold rounded-full bg-brand-yellow-main text-brand-black hover:bg-brand-yellow-secondary transition-colors cursor-pointer"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-full text-brand-gray-light hover:text-brand-white hover:bg-white/5 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Toast container component
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div
      className="fixed left-3 right-3 top-20 sm:left-auto sm:right-4 sm:top-24 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: 'success', title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => addToast({ type: 'error', title, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ type: 'info', title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
