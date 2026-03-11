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
    phase?: 'front' | 'back' // for slide animation: starts in front, moves to back
  }>>([])
  const prevFrameRef = useRef(currentFrame)
  
  // Number of cascading frames to show in waterfall mode
  const WATERFALL_VISIBLE_COUNT = 5
  
  // Get max visible frames and cleanup time based on animation mode
  const getAnimationConfig = (mode: AnimationMode) => {
    switch (mode) {
      case 'waterfall':
        return { maxFrames: WATERFALL_VISIBLE_COUNT, cleanupTime: 800 }
      case 'slide':
        return { maxFrames: 3, cleanupTime: 550 }
      default:
        return { maxFrames: 2, cleanupTime: 450 }
    }
  }
  
  // Track flying cards for exit animations
  useEffect(() => {
    if (prevFrameRef.current !== currentFrame && frames[prevFrameRef.current]) {
      const diff = currentFrame - prevFrameRef.current
      const dir = diff > 0 ? 'forward' : 'backward'
      const frameIdx = prevFrameRef.current
      const config = getAnimationConfig(animationMode)
      
      if (frames[frameIdx]) {
        const newFlying = {
          id: Date.now() + Math.random(),
          frame: frames[frameIdx],
          frameIndex: frameIdx,
          direction: dir,
          randomX: (Math.random() - 0.5) * 8,
          randomY: (Math.random() - 0.5) * 6,
          randomRotateX: animationMode === 'classic' ? 70 + Math.random() * 15 : 0,
          randomRotateZ: (Math.random() - 0.5) * 4,
          randomScale: 0.9 + Math.random() * 0.08,
          randomDuration: 0.3 + Math.random() * 0.06,
          phase: 'front' as const // start in front for slide animation
        }
        
        setFlyingFrames(prev => {
          const limited = prev.length >= config.maxFrames ? prev.slice(-(config.maxFrames - 1)) : prev
          return [...limited, newFlying]
        })
        
        const flyingId = newFlying.id
        
        // For slide animation: transition from front to back after slide reaches max
        if (animationMode === 'slide') {
          setTimeout(() => {
            setFlyingFrames(prev => prev.map(f => 
              f.id === flyingId ? { ...f, phase: 'back' as const } : f
            ))
          }, 275) // 55% of 0.5s animation = when it starts returning
        }
        
        setTimeout(() => {
          setFlyingFrames(prev => prev.filter(f => f.id !== flyingId))
        }, config.cleanupTime)
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
  
  // Waterfall/Giphoscope animation - cards cascade down like a waterfall
  const getWaterfallAnimation = (flying: typeof flyingFrames[0], index: number) => {
    const cascadeOffset = index * 12
    const rotateAmount = (flying.randomRotateZ || 0) + (index * 1.5)
    const scaleReduction = 1 - (index * 0.02)
    const opacityReduction = 1 - (index * 0.15)
    
    return {
      initial: { x: 0, y: 0, rotateZ: 0, rotateX: -15, scale: 1, opacity: 1 },
      animate: {
        x: (flying.randomX || 0) + (flying.direction === 'forward' ? -3 : 3) * index,
        y: cascadeOffset + 120,
        rotateZ: rotateAmount * (flying.direction === 'forward' ? -1 : 1),
        rotateX: 5 + index * 2,
        scale: scaleReduction,
        opacity: Math.max(0, opacityReduction - 0.1),
        transition: {
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
          y: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
          rotateZ: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          rotateX: { duration: 0.4, ease: 'easeOut' },
          opacity: { duration: 0.4, delay: 0.2, ease: 'easeIn' },
          scale: { duration: 0.5, ease: 'easeOut' }
        }
      }
    }
  }
  
  // Slide animation - clean card dealing: lift, slide to side, settle behind
  const getSlideAnimation = (flying: typeof flyingFrames[0], index: number) => {
    const directionMultiplier = flying.direction === 'forward' ? -1 : 1
    const slideDistance = 55
    const liftAmount = -20 // lift up (negative = up)
    const settleAmount = 6 + index * 2 // settle behind stack
    
    return {
      initial: { 
        x: 0, 
        y: 0, 
        scale: 1, 
        opacity: 1
      },
      animate: {
        // Clean keyframe animation: lift -> slide out -> return behind
        x: [0, 0, slideDistance * directionMultiplier, 0],
        y: [0, liftAmount, liftAmount * 0.3, settleAmount],
        scale: [1, 1.01, 0.99, 0.97 - index * 0.01],
        opacity: [1, 1, 1, Math.max(0, 0.6 - index * 0.2)],
        transition: {
          duration: 0.5,
          times: [0, 0.15, 0.55, 1], // quick lift, hold slide, smooth return
          ease: 'easeInOut'
        }
      }
    }
  }
  
  // Get animation based on mode
  const getAnimation = (flying: typeof flyingFrames[0], index: number) => {
    switch (animationMode) {
      case 'waterfall':
        return getWaterfallAnimation(flying, index)
      case 'slide':
        return getSlideAnimation(flying, index)
      default:
        return getClassicFlyAnimation(flying)
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
        className="relative"
        style={{ 
          aspectRatio,
          height: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Flying away frames - different animations based on mode */}
        <AnimatePresence>
          {flyingFrames.map((flying, index) => {
            const animation = getAnimation(flying, index)
            
            const transformOrigin = animationMode === 'slide' 
              ? 'center center'
              : 'top center'
            
            // For slide mode: start in front, then move behind when phase changes
            // For other modes: cards fly in front throughout
            let zIndex: number
            if (animationMode === 'slide') {
              // Front phase: in front of current frame (z-index > 5)
              // Back phase: behind current frame (z-index < 5)
              zIndex = flying.phase === 'front' ? 10 - index : 4 - index
            } else {
              zIndex = 30 - index // always in front for classic/waterfall
            }
            
            return (
              <motion.div
                key={flying.id}
                initial={animation.initial}
                animate={animation.animate}
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  zIndex,
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
