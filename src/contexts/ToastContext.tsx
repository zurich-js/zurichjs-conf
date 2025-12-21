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

// Toast icon styles
const iconStyles: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-orange-500',
  info: 'text-blue-500',
};

// Toast icons
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const className = `w-5 h-5 ${iconStyles[type]}`;
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
  const bgColors: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColors: Record<ToastType, string> = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-orange-800',
    info: 'text-blue-800',
  };

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(onDismiss, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${bgColors[toast.type]} max-w-md w-full`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">
        <ToastIcon type={toast.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${textColors[toast.type]}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-sm mt-1 ${textColors[toast.type]} opacity-80`}>{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className={`text-sm font-medium mt-2 underline hover:no-underline ${textColors[toast.type]} cursor-pointer`}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors cursor-pointer ${textColors[toast.type]}`}
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
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
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
