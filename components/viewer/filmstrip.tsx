'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useSpring, useMotionValue, useAnimationFrame, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transformGaussian } from '@/lib/motion-utils'
import { haptic } from '@/lib/haptics'
import type { GifFrame } from '@/lib/gif-types'

// Filmstrip constants - responsive sizes
const getFilmstripConfig = (isMobile: boolean) => ({
  thumbnailWidth: isMobile ? 56 : 72,
  thumbnailHeight: isMobile ? 42 : 54,
  gap: isMobile ? 6 : 8,
})

const ROTATION_INTENSITY = 65 // max rotation in degrees
const SCALE_BOOST = 0.15 // how much larger the focused item gets

interface FilmstripProps {
  frames: GifFrame[]
  currentFrame: number
  onFrameSelect: (index: number) => void
  className?: string
}

export function Filmstrip({ frames, currentFrame, onFrameSelect, className }: FilmstripProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerLeft, setContainerLeft] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  
  // Get responsive config
  const config = getFilmstripConfig(isMobile)
  const THUMBNAIL_WIDTH = config.thumbnailWidth
  const THUMBNAIL_HEIGHT = config.thumbnailHeight
  const GAP = config.gap
  const ITEM_STEP = THUMBNAIL_WIDTH + GAP
  
  // Track mouse position relative to container
  const mouseX = useMotionValue(0)
  const scrollX = useMotionValue(0)
  const isHovering = useRef(false)
  
  // Update container measurements and detect mobile
  useEffect(() => {
    if (!containerRef.current) return
    
    const updateMeasurements = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerWidth(rect.width)
        setContainerLeft(rect.left)
        setIsMobile(window.innerWidth < 640)
      }
    }
    
    updateMeasurements()
    const observer = new ResizeObserver(updateMeasurements)
    observer.observe(containerRef.current)
    window.addEventListener('scroll', updateMeasurements)
    window.addEventListener('resize', updateMeasurements)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateMeasurements)
      window.removeEventListener('resize', updateMeasurements)
    }
  }, [])
  
  // Track mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    isHovering.current = true
    mouseX.set(e.clientX - containerLeft)
  }, [mouseX, containerLeft])
  
  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    // Reset to follow current frame when not hovering
    mouseX.set(-9999)
  }, [mouseX])
  
  // Track scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      scrollX.set(containerRef.current.scrollLeft)
    }
  }, [scrollX])
  
  // Auto-scroll to keep current frame visible - instant with slight smoothing
  useEffect(() => {
    if (!containerRef.current || frames.length === 0) return
    
    const container = containerRef.current
    const targetScroll = currentFrame * ITEM_STEP - containerWidth / 2 + THUMBNAIL_WIDTH / 2
    const maxScroll = container.scrollWidth - containerWidth
    const clampedTarget = Math.max(0, Math.min(targetScroll, maxScroll > 0 ? maxScroll : 0))
    
    // Very fast scroll - 50ms max
    const startScroll = container.scrollLeft
    const distance = clampedTarget - startScroll
    if (Math.abs(distance) < 2) return // Skip tiny movements
    
    const duration = Math.min(50, Math.abs(distance) * 0.15)
    const startTime = performance.now()
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 2) // Quadratic ease-out
      container.scrollLeft = startScroll + distance * eased
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }
    
    requestAnimationFrame(animateScroll)
  }, [currentFrame, frames.length, containerWidth, ITEM_STEP, THUMBNAIL_WIDTH])
  
  if (frames.length === 0) return null
  
  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className={cn(
          "flex items-center gap-2 overflow-x-auto py-6",
          "scroll-smooth",
          "[&::-webkit-scrollbar]:hidden",
        )}
        style={{ 
          perspective: 1000,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
      >
        {/* Spacer to prevent first frame from being cropped */}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
        {frames.map((frame, index) => (
          <FilmstripFrame
            key={index}
            frame={frame}
            index={index}
            currentFrame={currentFrame}
            mouseX={mouseX}
            scrollX={scrollX}
            isHovering={isHovering}
            containerPadding={0}
            thumbnailWidth={THUMBNAIL_WIDTH}
            thumbnailHeight={THUMBNAIL_HEIGHT}
            itemStep={ITEM_STEP}
            onClick={() => onFrameSelect(index)}
          />
        ))}
        {/* Spacer to prevent last frame from being cropped */}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
      </div>
    </div>
  )
}

interface FilmstripFrameProps {
  frame: GifFrame
  index: number
  currentFrame: number
  mouseX: ReturnType<typeof useMotionValue<number>>
  scrollX: ReturnType<typeof useMotionValue<number>>
  isHovering: React.MutableRefObject<boolean>
  containerPadding: number
  thumbnailWidth: number
  thumbnailHeight: number
  itemStep: number
  onClick: () => void
}

function FilmstripFrame({
  frame,
  index,
  currentFrame,
  mouseX,
  scrollX,
  isHovering,
  containerPadding,
  thumbnailWidth,
  thumbnailHeight,
  itemStep,
  onClick,
}: FilmstripFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isActive = index === currentFrame
  
  // Item center position (accounting for padding and scroll)
  const itemCenter = index * itemStep + thumbnailWidth / 2 + containerPadding
  
  // Spring-animated rotation and scale - instant response with physics
  const rotateY = useSpring(0, { stiffness: 2000, damping: 80, mass: 0.1 })
  const scale = useSpring(1, { stiffness: 2500, damping: 100, mass: 0.1 })
  const y = useSpring(0, { stiffness: 2500, damping: 100, mass: 0.1 })
  const brightness = useSpring(1, { stiffness: 3000, damping: 120, mass: 0.1 })
  
  // Create reactive filter string from brightness
  const filterStyle = useTransform(brightness, (b) => `brightness(${b})`)
  
  // Update rotation based on frame position relative to currentFrame
  // Frames that have passed flip to the left, upcoming frames stay flat
  useAnimationFrame(() => {
    const scroll = scrollX.get()
    const mouse = mouseX.get()
    const visualCenter = itemCenter - scroll
    
    // Distance from current frame (in frames)
    const frameDistance = index - currentFrame
    
    if (isHovering.current && mouse > 0) {
      // When hovering, use mouse proximity for flip effect
      const distance = mouse - visualCenter
      const gaussian = transformGaussian(distance, 80)
      
      // Only flip frames that are to the left of the mouse (already passed)
      // Frames to the right of mouse stay flat (not yet viewed)
      if (distance > 0) {
        // Frame is to the LEFT of mouse - it has been "passed", so flip it
        const flipAmount = Math.min(1, distance / 100)
        rotateY.set(-ROTATION_INTENSITY * flipAmount)
        brightness.set(0.3 + 0.15 * (1 - flipAmount)) // Dimmer for passed frames
      } else {
        // Frame is to the RIGHT of mouse - not yet passed, stay flat
        // Slight tilt toward the viewer as it approaches
        const approachAmount = transformGaussian(distance, 60)
        rotateY.set(15 * approachAmount) // Slight forward tilt
        brightness.set(0.4 + 0.6 * approachAmount) // Dim unless close to gate
      }
      
      // Scale and lift for frame closest to mouse (the "gate")
      const targetScale = 1 + SCALE_BOOST * gaussian
      scale.set(targetScale)
      y.set(-8 * gaussian)
      
      // Override brightness for the frame at the gate
      if (gaussian > 0.8) {
        brightness.set(1) // Full brightness at gate
      }
      
    } else {
      // Not hovering - use currentFrame as the "gate"
      // Frames before currentFrame have been viewed (flip them)
      // Frames after currentFrame are upcoming (keep flat)
      
      if (frameDistance < 0) {
        // Frame has been passed - flip it to the left
        // More flip for frames further in the past
        const flipAmount = Math.min(1, Math.abs(frameDistance) / 3)
        rotateY.set(-ROTATION_INTENSITY * flipAmount)
        scale.set(0.92)
        y.set(0)
        brightness.set(0.25 + 0.1 * (1 - flipAmount)) // Much dimmer for passed frames
      } else if (frameDistance === 0) {
        // Current frame - at the gate, fully visible and bright
        rotateY.set(0)
        scale.set(1.12)
        y.set(-6)
        brightness.set(1) // Full brightness - the spotlight
      } else {
        // Upcoming frame - flat, waiting to be viewed
        // Dimmed but less than passed frames
        const fadeAmount = Math.min(0.3, frameDistance * 0.06)
        rotateY.set(0)
        scale.set(0.98)
        y.set(0)
        brightness.set(0.45 - fadeAmount) // Dim but visible
      }
    }
  })
  
  // Draw frame to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame.bitmap) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = thumbnailWidth * 2
    canvas.height = thumbnailHeight * 2
    ctx.drawImage(frame.bitmap, 0, 0, canvas.width, canvas.height)
  }, [frame.bitmap, thumbnailWidth, thumbnailHeight])
  
  return (
    <motion.button
      onClick={() => { haptic('selection'); onClick() }}
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-sm",
        "border transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        isActive 
          ? "border-[var(--muted-foreground)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2),0_1px_0_0_rgba(255,255,255,0.3)_inset]" 
          : "border-[var(--border)] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1)]"
      )}
      style={{
        width: thumbnailWidth,
        height: thumbnailHeight,
        rotateY,
        scale,
        y,
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        zIndex: isActive ? 10 : 1,
        filter: filterStyle,
      }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Canvas with the actual frame */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover rounded-[2px]"
        style={{ transformStyle: 'preserve-3d' }}
      />
      
      {/* Frame number */}
      <span className={cn(
        "absolute bottom-1 right-2 text-[8px] font-mono tabular-nums transition-colors duration-200",
        isActive ? "text-white" : "text-white/60"
      )}>
        {String(index + 1).padStart(3, '0')}
      </span>
      
      {/* Active frame glow */}
      {isActive && (
        <motion.div
          className="absolute -inset-1 rounded-md pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.4)',
            transformStyle: 'preserve-3d',
          }}
        />
      )}
    </motion.button>
  )
}
