'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GifFrame, ViewMode } from '@/lib/gif-types'
import { cn } from '@/lib/utils'
import { FlipbookPage } from './flipbook-page'

interface FlipbookProps {
  frames: GifFrame[]
  currentFrame: number
  flipProgress: number
  isFlipping: boolean
  direction: 'forward' | 'backward'
  mode: ViewMode
  onScroll: (deltaY: number) => void
  className?: string
}

export function Flipbook({
  frames,
  currentFrame,
  isFlipping,
  direction,
  onScroll,
  className
}: FlipbookProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [flyingFrames, setFlyingFrames] = useState<Array<{
    id: number
    frame: GifFrame
    direction: 'forward' | 'backward'
  }>>([])
  const prevFrameRef = useRef(currentFrame)
  
  // Track flying cards for exit animations - limit to 1 at a time for smoothness
  useEffect(() => {
    if (prevFrameRef.current !== currentFrame && frames[prevFrameRef.current]) {
      const diff = currentFrame - prevFrameRef.current
      const dir = diff > 0 ? 'forward' : 'backward'
      
      // Only create ONE flying frame per transition for clean animation
      const frameIdx = prevFrameRef.current
      if (frames[frameIdx]) {
        // Realistic page flip physics - peel then lift
        const randomX = (Math.random() - 0.5) * 20 // -10 to +10 (minimal sway)
        const randomY = (Math.random() - 0.5) * 8 // slight vertical variance
        const randomRotateX = 70 + Math.random() * 15 // 70-85 degrees (steep peel)
        const randomRotateZ = (Math.random() - 0.5) * 5 // -2.5 to +2.5 degrees
        const randomScale = 0.85 + Math.random() * 0.1 // 0.85-0.95 (less shrink)
        const randomDuration = 0.3 + Math.random() * 0.08 // 0.3-0.38s (consistent timing)
        
        const newFlying = {
          id: Date.now() + Math.random(),
          frame: frames[frameIdx],
          direction: dir,
          randomX,
          randomY,
          randomRotateX,
          randomRotateZ,
          randomScale,
          randomDuration
        }
        
        // Limit max flying frames to prevent accumulation
        setFlyingFrames(prev => {
          const limited = prev.length >= 2 ? prev.slice(-1) : prev
          return [...limited, newFlying]
        })
        
        // Clean up after animation completes
        const flyingId = newFlying.id
        setTimeout(() => {
          setFlyingFrames(prev => prev.filter(f => f.id !== flyingId))
        }, 450)
      }
    }
    prevFrameRef.current = currentFrame
  }, [currentFrame, frames])
  
  // Handle wheel/scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    onScroll(e.deltaY)
  }, [onScroll])
  
  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
  
  const currentFrameData = frames[currentFrame]
  
  if (!currentFrameData) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="text-muted-foreground">No frames loaded</div>
      </div>
    )
  }
  
  const aspectRatio = currentFrameData.bitmap.width / currentFrameData.bitmap.height
  
  // Flying card animation - realistic page flip: rotate first (peel), then lift away
  const getFlyAwayAnimation = (flying: typeof flyingFrames[0]) => ({
    initial: {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateZ: 0,
      scale: 1,
      opacity: 1,
    },
    animate: {
      x: (flying.direction === 'forward' ? -15 : 15) + flying.randomX * 0.5,
      y: `${-90 + flying.randomY}%`,
      rotateX: flying.randomRotateX + 15,
      rotateZ: (flying.direction === 'forward' ? -1 : 1) * Math.abs(flying.randomRotateZ),
      scale: flying.randomScale,
      opacity: 0,
      transition: {
        duration: flying.randomDuration,
        // Rotation happens immediately (page peeling), then position follows
        rotateX: { duration: flying.randomDuration * 0.6, ease: [0.22, 1, 0.36, 1] },
        y: { duration: flying.randomDuration, ease: [0.34, 1.2, 0.64, 1], delay: flying.randomDuration * 0.1 },
        x: { duration: flying.randomDuration, ease: [0.34, 1.2, 0.64, 1], delay: flying.randomDuration * 0.1 },
        scale: { duration: flying.randomDuration * 0.8, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: flying.randomDuration * 0.6, delay: flying.randomDuration * 0.3, ease: 'easeIn' }
      }
    }
  })
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {/* Card container - size based on available space while preserving aspect ratio */}
      <div 
        className="relative"
        style={{ 
          aspectRatio,
          height: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Flying away frames - flip from TOP edge with randomized physics */}
        <AnimatePresence>
          {flyingFrames.map((flying) => {
            const animation = getFlyAwayAnimation(flying)
            return (
              <motion.div
                key={flying.id}
                initial={animation.initial}
                animate={animation.animate}
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  zIndex: 30,
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                  transformOrigin: 'top center'
                }}
              >
                <FlipbookPage 
                  frame={flying.frame} 
                  className="w-full h-full"
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {/* Current frame - completely static, sits BEHIND flying pages */}
        <div 
          className="absolute inset-0"
          style={{ zIndex: 5 }}
        >
          <FlipbookPage 
            frame={currentFrameData} 
            className="w-full h-full"
          />
        </div>
        
        {/* Soft drop shadow */}
        <div 
          className="absolute bottom-0 left-[10%] right-[10%] h-4 translate-y-2 -z-10"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.06) 0%, transparent 70%)',
            filter: 'blur(6px)'
          }}
        />
      </div>
    </div>
  )
}
