'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GifFrame, ViewMode, FlipDirection } from '@/lib/gif-types'

interface FlipbookState {
  currentFrame: number
  flipProgress: number // 0 to 1 for animation
  isFlipping: boolean
  direction: FlipDirection
  velocity: number
}

interface UseFlipbookOptions {
  frames: GifFrame[]
  mode: ViewMode
  onFrameChange?: (frame: number) => void
}

export function useFlipbook({ frames, mode, onFrameChange }: UseFlipbookOptions) {
  const [state, setState] = useState<FlipbookState>({
    currentFrame: 0,
    flipProgress: 0,
    isFlipping: false,
    direction: 'forward',
    velocity: 0
  })
  
  const frameCount = frames.length
  const animationRef = useRef<number | null>(null)
  const lastScrollTime = useRef<number>(0)
  const accumulatedDelta = useRef<number>(0)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [scrollVelocity, setScrollVelocity] = useState(1) // normalized 0.2 to 2.0
  
  // Clamp frame to valid range
  const clampFrame = useCallback((frame: number) => {
    if (frameCount === 0) return 0
    return Math.max(0, Math.min(frameCount - 1, frame))
  }, [frameCount])
  
  // Go to specific frame with animation
  const goToFrame = useCallback((targetFrame: number, shouldAnimate = true) => {
    const clamped = clampFrame(targetFrame)
    
    if (!shouldAnimate || mode === 'scrub') {
      setState(prev => ({
        ...prev,
        currentFrame: clamped,
        flipProgress: 0,
        isFlipping: false
      }))
      onFrameChange?.(clamped)
      return
    }
    
    // Calculate direction and start flip animation
    const direction: FlipDirection = clamped > state.currentFrame ? 'forward' : 'backward'
    
    if (clamped === state.currentFrame) return
    
    setState(prev => ({
      ...prev,
      isFlipping: true,
      direction,
      flipProgress: 0
    }))
    
    // Animate flip
    const startTime = performance.now()
    const duration = 380 // ms for single flip
    
    const animateFlip = (time: number) => {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Custom easing: ease-in to midpoint, fast ease-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      if (progress < 1) {
        setState(prev => ({
          ...prev,
          flipProgress: eased
        }))
        animationRef.current = requestAnimationFrame(animateFlip)
      } else {
        setState(prev => ({
          ...prev,
          currentFrame: clamped,
          flipProgress: 0,
          isFlipping: false
        }))
        onFrameChange?.(clamped)
      }
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = requestAnimationFrame(animateFlip)
  }, [clampFrame, mode, state.currentFrame, onFrameChange])
  
  // Handle scroll input for flipping
  const handleScroll = useCallback((deltaY: number) => {
    if (frameCount === 0) return
    
    const now = performance.now()
    const timeDelta = now - lastScrollTime.current
    lastScrollTime.current = now
    
    // Accumulate scroll delta
    accumulatedDelta.current += deltaY
    
    // Lower threshold for smoother, more responsive flipping
    const threshold = 25
    
    if (Math.abs(accumulatedDelta.current) >= threshold) {
      const direction = accumulatedDelta.current > 0 ? 1 : -1
      const framesToFlip = Math.min(
        Math.floor(Math.abs(accumulatedDelta.current) / threshold),
        5
      )
      
      accumulatedDelta.current = accumulatedDelta.current % threshold
      
      const targetFrame = clampFrame(state.currentFrame + direction * framesToFlip)
      
      // Calculate velocity based on scroll speed (pixels per ms)
      const rawVelocity = Math.abs(deltaY) / Math.max(timeDelta, 8)
      
      // Only slow down animation when scrolling is VERY slow (deliberate, frame-by-frame)
      // Normal/fast scrolling keeps velocity at 1.0 for snappy animations
      // Very slow scroll (< 2 px/ms) = 0.4x to 0.8x speed (slower animation)
      // Normal scroll (>= 2 px/ms) = 1.0x speed (normal fast animation)
      let normalizedVelocity = 1.0
      if (rawVelocity < 2) {
        // Map 0-2 px/ms to 0.4-1.0 velocity
        normalizedVelocity = 0.4 + (rawVelocity / 2) * 0.6
      }
      
      setScrollVelocity(normalizedVelocity)
      
      setState(prev => ({
        ...prev,
        velocity: rawVelocity
      }))
      
      // Always animate smoothly (no animation skip)
      goToFrame(targetFrame, false)
    }
  }, [frameCount, clampFrame, state.currentFrame, goToFrame])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (frameCount === 0) return
    
    const isModified = e.metaKey || e.ctrlKey
    const isShift = e.shiftKey
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        if (isModified) {
          goToFrame(frameCount - 1)
        } else if (isShift) {
          goToFrame(state.currentFrame + 10)
        } else {
          goToFrame(state.currentFrame + 1)
        }
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        if (isModified) {
          goToFrame(0)
        } else if (isShift) {
          goToFrame(state.currentFrame - 10)
        } else {
          goToFrame(state.currentFrame - 1)
        }
        break
      case ' ':
        e.preventDefault()
        setIsPlaying(prev => !prev)
        break
    }
  }, [frameCount, goToFrame, state.currentFrame])
  
  // Playback loop - works in any mode now
  useEffect(() => {
    if (!isPlaying || frameCount === 0) {
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
      return
    }
    
    const currentDelay = frames[state.currentFrame]?.delay || 100
    const adjustedDelay = currentDelay / playbackSpeed
    
    playbackIntervalRef.current = setTimeout(() => {
      const nextFrame = (state.currentFrame + 1) % frameCount
      // During playback, always use normal velocity (1.0) for fast animations
      setScrollVelocity(1.0)
      setState(prev => ({
        ...prev,
        currentFrame: nextFrame
      }))
      onFrameChange?.(nextFrame)
    }, adjustedDelay)
    
    return () => {
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current)
      }
    }
  }, [isPlaying, frameCount, state.currentFrame, frames, playbackSpeed, onFrameChange])
  
  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return {
    ...state,
    frameCount,
    isPlaying,
    playbackSpeed,
    scrollVelocity,
    goToFrame,
    handleScroll,
    setIsPlaying,
    setPlaybackSpeed,
    nextFrame: () => goToFrame(state.currentFrame + 1),
    prevFrame: () => goToFrame(state.currentFrame - 1),
    firstFrame: () => goToFrame(0),
    lastFrame: () => goToFrame(frameCount - 1)
  }
}
