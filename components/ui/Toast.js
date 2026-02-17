"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, { type = "success", duration = 4000, action } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration, action }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

const ICONS = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  undo: "↩",
};

const COLORS = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  undo: "border-red-500/30 bg-red-500/10 text-red-300",
};

const ICON_COLORS = {
  success: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
  info: "bg-blue-500/20 text-blue-400",
  undo: "bg-red-500/20 text-red-400",
};

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const handleAction = () => {
    if (toast.action?.onClick) {
      toast.action.onClick();
    }
    handleDismiss();
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
        COLORS[toast.type]
      } ${
        visible && !exiting
          ? "translate-x-0 opacity-100"
          : "translate-x-8 opacity-0"
      }`}
      style={{
        boxShadow:
          "0 0 20px rgba(0,0,0,0.4), inset 0 0 12px rgba(255,255,255,0.02)",
      }}
    >
      {/* Icon */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          ICON_COLORS[toast.type]
        }`}
      >
        {ICONS[toast.type]}
      </span>

      {/* Message */}
      <span className="text-sm font-medium text-zinc-200 mr-1">
        {toast.message}
      </span>

      {/* Action Button (e.g. Undo) */}
      {toast.action && (
        <button
          onClick={handleAction}
          className="cursor-pointer rounded-lg bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.15] transition-all active:scale-95"
        >
          {toast.action.label}
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="cursor-pointer ml-1 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
      >
        ✕
      </button>
    </div>
  );
}
