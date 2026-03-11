'use client'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Base toast container styling matching delete modal exactly
const toastContainerClass = cn(
  "w-full max-w-sm mx-4 p-6 rounded-2xl",
  "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
  "border border-[var(--border)]",
  "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_8px_32px_-8px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.15)]",
  "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_8px_32px_-8px_rgba(0,0,0,0.5),0_4px_12px_-4px_rgba(0,0,0,0.4)]"
)

// Simple message toast (success/info)
export function showToast(message: string, duration = 2000) {
  toast.custom(() => (
    <div className={toastContainerClass}>
      <p className="text-sm text-[var(--muted-foreground)]">
        {message}
      </p>
    </div>
  ), { duration })
}

// Error toast
export function showErrorToast(message: string, duration = 3000) {
  toast.custom(() => (
    <div className={toastContainerClass}>
      <p className="text-sm text-[var(--muted-foreground)]">
        {message}
      </p>
    </div>
  ), { duration })
}

// Toast with action button
export function showActionToast({
  message,
  actionLabel,
  onAction,
  cancelLabel = 'Dismiss',
  duration = 4000,
}: {
  message: string
  actionLabel: string
  onAction: () => void | Promise<void>
  cancelLabel?: string
  duration?: number
}) {
  toast.custom((t) => (
    <div className={toastContainerClass}>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        {message}
      </p>
      <div className="flex justify-end">
        <div className={cn(
          "inline-flex items-center gap-1 p-1.5 rounded-xl",
          "bg-[var(--recess)]",
          "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
          "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]",
        )}>
          <button
            onClick={() => toast.dismiss(t)}
            className={cn(
              "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t)
              await onAction()
            }}
            className={cn(
              "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
              "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
              "dark:from-[var(--module)] dark:to-[var(--card)]",
              "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]",
              "text-[var(--foreground)]"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  ), { duration })
}
