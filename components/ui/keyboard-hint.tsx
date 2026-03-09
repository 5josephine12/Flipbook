'use client'

import { cn } from '@/lib/utils'

interface KeyboardHintProps {
  children: React.ReactNode
  className?: string
}

interface KbdProps {
  children: React.ReactNode
  className?: string
}

// Subtle kbd styling - just emphasizes the key, not interactive
function Kbd({ children, className }: KbdProps) {
  return (
    <kbd 
      className={cn(
        "font-medium text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </kbd>
  )
}

// Container for keyboard hints - simple supporting text
function KeyboardHint({ children, className }: KeyboardHintProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1",
        "text-xs text-[var(--muted-foreground)]",
        className
      )}
    >
      {children}
    </div>
  )
}

// Common hint patterns
function ScrollHint() {
  return (
    <span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
      Scroll to flip
    </span>
  )
}

function EscHint() {
  return (
    <>
      <Kbd>Esc</Kbd>
      <span className="font-['Helvetica','Arial',sans-serif] text-[var(--foreground)]/60">to exit</span>
    </>
  )
}

function ArrowHint() {
  return (
    <>
      <Kbd>←</Kbd>
      <Kbd>→</Kbd>
      <span className="font-['Helvetica','Arial',sans-serif] text-[var(--foreground)]/60">to navigate</span>
    </>
  )
}

function Divider() {
  return <span className="mx-1.5 text-[var(--foreground)]/30">|</span>
}

export { KeyboardHint, Kbd, ScrollHint, EscHint, ArrowHint, Divider }
