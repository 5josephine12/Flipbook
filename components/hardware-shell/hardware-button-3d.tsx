'use client'

import { forwardRef, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'
import { playSoundIfEnabled, type SoundType } from '@/lib/sounds'

interface HardwareButton3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'primary' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection'
  soundType?: SoundType | 'none'
}

export const HardwareButton3D = forwardRef<HTMLButtonElement, HardwareButton3DProps>(
  ({ className, variant = 'default', size = 'md', hapticType = 'light', soundType = 'click', onClick, children, ...props }, ref) => {
    const [isPressed, setIsPressed] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const clickTimeoutRef = useRef<NodeJS.Timeout>()
    
    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      haptic(hapticType)
      // Play sound effect
      if (soundType !== 'none') {
        playSoundIfEnabled(soundType)
      }
      // Brief scale pulse on click
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
      onClick?.(e)
    }, [hapticType, soundType, onClick])
    
    const sizeClasses = {
      sm: 'h-[1.75em] px-[0.625em] text-[0.75em]',
      md: 'h-[2.25em] px-[1em] text-[0.875em]',
      lg: 'h-[2.75em] px-[1.5em] text-[1em]',
      icon: 'h-[2.25em] w-[2.25em]',
    }
    
    const variantClasses = {
      default: cn(
        // Base surface using design tokens
        "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
        // Border with depth
        "border border-[var(--border)]",
        // Multi-layer shadow for depth
        "shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_-1px_0_0_rgba(0,0,0,0.05)_inset,0_2px_4px_-1px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_2px_4px_-1px_rgba(0,0,0,0.3),0_1px_2px_-1px_rgba(0,0,0,0.2)]",
        // Hover lift
        "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_-1px_0_0_rgba(0,0,0,0.05)_inset,0_4px_8px_-2px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.08)]",
        "dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_4px_8px_-2px_rgba(0,0,0,0.4),0_2px_4px_-2px_rgba(0,0,0,0.3)]",
        // Pressed state
        "active:shadow-[0_1px_2px_0_rgba(0,0,0,0.1)_inset,0_0px_0_0_rgba(255,255,255,0)]",
        "active:bg-gradient-to-b active:from-[var(--recess)] active:to-[var(--module)]",
        // Text
        "text-[var(--foreground)]",
      ),
      ghost: cn(
        "bg-transparent",
        "hover:bg-[var(--module)]/50",
        "active:bg-[var(--recess)]/70",
        "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      ),
      primary: cn(
        // Primary button - uses shell gradient like nav bar
        "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
        // Border with depth
        "border border-[var(--border)]",
        // Multi-layer shadow matching nav bar
        "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_0_0_rgba(0,0,0,0.05)_inset,0_2px_6px_-2px_rgba(0,0,0,0.15),0_1px_3px_-1px_rgba(0,0,0,0.1)]",
        "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_2px_6px_-2px_rgba(0,0,0,0.4),0_1px_3px_-1px_rgba(0,0,0,0.3)]",
        // Text
        "text-[var(--foreground)]",
        // Hover lift
        "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.05)_inset,0_4px_10px_-2px_rgba(0,0,0,0.2),0_2px_5px_-2px_rgba(0,0,0,0.12)]",
        "dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_4px_10px_-2px_rgba(0,0,0,0.5),0_2px_5px_-2px_rgba(0,0,0,0.35)]",
      ),
      destructive: cn(
        // Destructive button - red warning
        "bg-gradient-to-b from-[#ef4444] to-[#dc2626]",
        "dark:from-[#dc2626] dark:to-[#b91c1c]",
        "border border-[#dc2626] dark:border-[#b91c1c]",
        // Shadows
        "shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_2px_6px_-1px_rgba(220,38,38,0.3),0_1px_3px_-1px_rgba(0,0,0,0.15)]",
        // Text
        "text-white",
        // Hover
        "hover:from-[#dc2626] hover:to-[#b91c1c]",
        "hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_4px_10px_-2px_rgba(220,38,38,0.4),0_2px_5px_-2px_rgba(0,0,0,0.2)]",
      ),
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          "relative inline-flex items-center justify-center gap-[0.5em]",
          "rounded-[0.5em] font-medium",
          // Smooth transitions with custom easing
          "transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a3a3a3] focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none",
          // Transform for press with smooth scale
          isPressed ? "translate-y-[1px] scale-[0.97]" : isHovered ? "scale-[1.02]" : "scale-100",
          // Size
          sizeClasses[size],
          // Variant
          variantClasses[variant],
          className
        )}
        style={{
          transitionProperty: 'transform, box-shadow, background, opacity',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsPressed(false); setIsHovered(false) }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

HardwareButton3D.displayName = 'HardwareButton3D'
