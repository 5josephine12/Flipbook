'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GifFrame, ViewMode, AnimationMode } from '@/lib/gif-types'
import { cn } from '@/lib/utils'
import { FlipbookPage } from './flipbook-page'

interface FlipbookProps {
  frames: GifFrame[]
  currentFrame: number
  flipProgress: number
  isFlipping: boolean
  direction: 'forward' | 'backward'
  mode: ViewMode
  animationMode?: AnimationMode
  onScroll: (deltaY: number) => void
  className?: string
}

export function Flipbook({
  frames,
  currentFrame,
  isFlipping,
  direction,
  animationMode = 'classic',
  onScroll,
  className
}: FlipbookProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [flyingFrames, setFlyingFrames] = useState<Array<{
    id: number
    frame: GifFrame
    frameIndex: number
    direction: 'forward' | 'backward'
    randomX?: number
    randomY?: number
    randomRotateX?: number
    randomRotateZ?: number
    randomScale?: number
    randomDuration?: number
  }>>([])
  const prevFrameRef = useRef(currentFrame)
  
  // Number of cascading frames to show in waterfall mode
  const WATERFALL_VISIBLE_COUNT = 5
  
  // Track flying cards for exit animations
  useEffect(() => {
    if (prevFrameRef.current !== currentFrame && frames[prevFrameRef.current]) {
      const diff = currentFrame - prevFrameRef.current
      const dir = diff > 0 ? 'forward' : 'backward'
      
      if (animationMode === 'waterfall') {
        // Waterfall mode: create cascading card that drops down
        const frameIdx = prevFrameRef.current
        if (frames[frameIdx]) {
          const newFlying = {
            id: Date.now() + Math.random(),
            frame: frames[frameIdx],
            frameIndex: frameIdx,
            direction: dir,
            randomX: (Math.random() - 0.5) * 8,
            randomY: 0,
            randomRotateX: 0,
            randomRotateZ: (Math.random() - 0.5) * 4,
            randomScale: 1,
            randomDuration: 0.5
          }
          
          // Keep more frames visible for waterfall cascade effect
          setFlyingFrames(prev => {
            const limited = prev.length >= WATERFALL_VISIBLE_COUNT ? prev.slice(-(WATERFALL_VISIBLE_COUNT - 1)) : prev
            return [...limited, newFlying]
          })
          
          // Longer cleanup for waterfall - let cards fully cascade out
          const flyingId = newFlying.id
          setTimeout(() => {
            setFlyingFrames(prev => prev.filter(f => f.id !== flyingId))
          }, 800)
        }
      } else {
        // Classic mode: single flying frame with peel animation
        const frameIdx = prevFrameRef.current
        if (frames[frameIdx]) {
          const randomX = (Math.random() - 0.5) * 20
          const randomY = (Math.random() - 0.5) * 8
          const randomRotateX = 70 + Math.random() * 15
          const randomRotateZ = (Math.random() - 0.5) * 5
          const randomScale = 0.85 + Math.random() * 0.1
          const randomDuration = 0.3 + Math.random() * 0.08
          
          const newFlying = {
            id: Date.now() + Math.random(),
            frame: frames[frameIdx],
            frameIndex: frameIdx,
            direction: dir,
            randomX,
            randomY,
            randomRotateX,
            randomRotateZ,
            randomScale,
            randomDuration
          }
          
          setFlyingFrames(prev => {
            const limited = prev.length >= 2 ? prev.slice(-1) : prev
            return [...limited, newFlying]
          })
          
          const flyingId = newFlying.id
          setTimeout(() => {
            setFlyingFrames(prev => prev.filter(f => f.id !== flyingId))
          }, 450)
        }
      }
    }
    prevFrameRef.current = currentFrame
  }, [currentFrame, frames, animationMode])
  
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
  
  // Classic flying card animation - realistic page flip: rotate first (peel), then lift away
  const getClassicFlyAnimation = (flying: typeof flyingFrames[0]) => ({
    initial: {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateZ: 0,
      scale: 1,
      opacity: 1,
    },
    animate: {
      x: (flying.direction === 'forward' ? -15 : 15) + (flying.randomX || 0) * 0.5,
      y: `${-90 + (flying.randomY || 0)}%`,
      rotateX: (flying.randomRotateX || 70) + 15,
      rotateZ: (flying.direction === 'forward' ? -1 : 1) * Math.abs(flying.randomRotateZ || 0),
      scale: flying.randomScale || 0.9,
      opacity: 0,
      transition: {
        duration: flying.randomDuration || 0.3,
        rotateX: { duration: (flying.randomDuration || 0.3) * 0.6, ease: [0.22, 1, 0.36, 1] },
        y: { duration: flying.randomDuration || 0.3, ease: [0.34, 1.2, 0.64, 1], delay: (flying.randomDuration || 0.3) * 0.1 },
        x: { duration: flying.randomDuration || 0.3, ease: [0.34, 1.2, 0.64, 1], delay: (flying.randomDuration || 0.3) * 0.1 },
        scale: { duration: (flying.randomDuration || 0.3) * 0.8, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: (flying.randomDuration || 0.3) * 0.6, delay: (flying.randomDuration || 0.3) * 0.3, ease: 'easeIn' }
      }
    }
  })
  
  // Waterfall/Giphoscope animation - cards cascade to the side like flipping pages
  const getWaterfallAnimation = (flying: typeof flyingFrames[0], index: number, total: number) => {
    // Each card in the cascade gets progressively more offset horizontally
    const cascadeOffsetX = (index + 1) * 15 // horizontal spacing between cards
    const cascadeOffsetY = (index + 1) * -8 // slight upward movement
    const rotateAmount = (flying.randomRotateZ || 0) + (index * 2) // rotation accumulation
    const scaleReduction = 1 - (index * 0.03) // cards get slightly smaller
    const opacityReduction = 1 - (index * 0.18) // cards fade as they cascade
    
    // Direction determines which side cards fly to
    const directionMultiplier = flying.direction === 'forward' ? -1 : 1
    
    return {
      initial: {
        x: 0,
        y: 0,
        rotateZ: 0,
        rotateY: 0,
        scale: 1,
        opacity: 1,
      },
      animate: {
        x: (cascadeOffsetX + (flying.randomX || 0)) * directionMultiplier,
        y: cascadeOffsetY + (flying.randomY || 0),
        rotateZ: rotateAmount * directionMultiplier * 0.5,
        rotateY: 25 * directionMultiplier, // slight 3D rotation like a page turning
        scale: scaleReduction,
        opacity: Math.max(0, opacityReduction),
        transition: {
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          x: { 
            duration: 0.45, 
            ease: [0.34, 1.2, 0.64, 1]
          },
          y: { duration: 0.4, ease: 'easeOut' },
          rotateZ: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          rotateY: { duration: 0.35, ease: 'easeOut' },
          opacity: { duration: 0.35, delay: 0.15, ease: 'easeIn' },
          scale: { duration: 0.4, ease: 'easeOut' }
        }
      }
    }
  }
  
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
        className="relative overflow-hidden"
        style={{ 
          aspectRatio,
          height: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Flying away frames - different animations based on mode */}
        <AnimatePresence>
          {flyingFrames.map((flying, index) => {
            const animation = animationMode === 'waterfall'
              ? getWaterfallAnimation(flying, index, flyingFrames.length)
              : getClassicFlyAnimation(flying)
            
            const transformOrigin = animationMode === 'waterfall' 
              ? 'center center' 
              : 'top center'
            
            return (
              <motion.div
                key={flying.id}
                initial={animation.initial}
                animate={animation.animate}
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  zIndex: 30 - index, // stack cards in order for waterfall
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                  transformOrigin
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
