"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.duration || 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: "success", title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: "error", title, message, duration: 6000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: "warning", title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: "info", title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  )
}

const icons: Record<ToastType, ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const styles: Record<ToastType, { bg: string, icon: string, border: string, glow: string }> = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-500/30",
    glow: "shadow-emerald-500/20"
  },
  error: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    icon: "text-rose-500 bg-rose-100 dark:bg-rose-500/20",
    border: "border-rose-200 dark:border-rose-500/30",
    glow: "shadow-rose-500/20"
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    icon: "text-amber-500 bg-amber-100 dark:bg-amber-500/20",
    border: "border-amber-200 dark:border-amber-500/30",
    glow: "shadow-amber-500/20"
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-500/10",
    icon: "text-sky-500 bg-sky-100 dark:bg-sky-500/20",
    border: "border-sky-200 dark:border-sky-500/30",
    glow: "shadow-sky-500/20"
  }
}

function ToastItem({ toast, onClose, style }: { toast: Toast, onClose: () => void, style?: React.CSSProperties }) {
  const { bg, icon, border, glow } = styles[toast.type]

  return (
    <div
      role="alert"
      style={style}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl min-w-[320px] max-w-md",
        "border backdrop-blur-sm",
        "animate-slide-in-right",
        "shadow-lg dark:shadow-xl",
        bg, border,
        `dark:${glow}`
      )}
    >
      {/* Icon */}
      <div className={cn("p-1.5 rounded-lg shrink-0", icon)}>
        {icons[toast.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{toast.message}</p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
