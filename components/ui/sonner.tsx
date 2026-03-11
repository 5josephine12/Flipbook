'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "!bg-gradient-to-b !from-[var(--shell)] !to-[var(--recess)]",
            "!border !border-[var(--border)]",
            "!rounded-xl",
            "!shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_8px_24px_-8px_rgba(0,0,0,0.2),0_4px_12px_-4px_rgba(0,0,0,0.1)]",
            "dark:!shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_8px_24px_-8px_rgba(0,0,0,0.4),0_4px_12px_-4px_rgba(0,0,0,0.3)]",
          ].join(" "),
          title: "!text-[var(--foreground)] !font-medium",
          description: "!text-[var(--muted-foreground)]",
          actionButton: [
            "!bg-gradient-to-b !from-[var(--module)] !to-[var(--card)]",
            "!text-[var(--foreground)] !font-medium",
            "!border-0 !rounded-lg",
            "!shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
            "dark:!shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]",
            "!transition-all !duration-200",
            "hover:!brightness-105",
          ].join(" "),
          cancelButton: "!text-[var(--muted-foreground)] !bg-transparent",
          success: "!border-[var(--led-active)]/20",
          error: "!border-red-500/20",
        },
      }}
      style={
        {
          '--normal-bg': 'var(--shell)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
