'use client'

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast, Upload, Maximize2, Minimize2, X, Layers, Wind, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useGifDecoder } from '@/hooks/use-gif-decoder'
import { useFlipbook } from '@/hooks/use-flipbook'
import { Flipbook } from '@/components/flipbook'
import { DropZone } from './drop-zone'
import { Filmstrip } from './filmstrip'
import { saveHighlight, deleteHighlight } from '@/lib/highlights-store'
import { haptic, hapticThrottled } from '@/lib/haptics'
import { playSoundIfEnabled } from '@/lib/sounds'
import { HardwareButton3D } from '@/components/hardware-shell'
import { KeyboardHint, ScrollHint, EscHint, Divider } from '@/components/ui/keyboard-hint'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { GifData, AnimationMode } from '@/lib/gif-types'

interface ViewerState {
  hasContent: boolean
  isSaved: boolean
  isLoading: boolean
  loadingProgress: number
}

interface ViewerProps {
  className?: string
  initialData?: GifData
  initialUrl?: string
  onGallerySaved?: () => void
  onStateChange?: (state: ViewerState) => void
}

export interface ViewerHandle {
  upload: () => void
  toggleFullscreen: () => void
  save: () => void
  canSave: boolean
  isSaved: boolean
  hasContent: boolean
}

const MIN_LOADING_DISPLAY_MS = 2500 // Minimum time to show loading animation (one full GIF cycle)

export const Viewer = forwardRef<ViewerHandle, ViewerProps>(function Viewer({ className, initialData, initialUrl, onGallerySaved, onStateChange }, ref) {
  const [isSaved, setIsSaved] = useState(false)
  const [gifData, setGifData] = useState<GifData | null>(initialData || null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const loadingStartTimeRef = useRef<number | null>(null)
  const [animationMode, setAnimationMode] = useState<AnimationMode>('classic')
  
  const decoder = useGifDecoder()
  
  // Use frames from decoder if actively decoding, otherwise from gifData
  const frames = decoder.status === 'decoding' || decoder.status === 'ready' 
    ? decoder.frames 
    : gifData?.frames || []
  
  const metadata = decoder.metadata || gifData?.metadata || null
  
  const flipbook = useFlipbook({
    frames,
    mode: 'flipbook', // Always flipbook mode now
    onFrameChange: () => hapticThrottled('tick')
  })
  
  const handleFileSelect = useCallback(async (file: File) => {
    setIsSaved(false)
    setShowLoadingScreen(true)
    loadingStartTimeRef.current = Date.now()
    
    try {
      const result = await decoder.decode(file)
      if (result) {
        // Ensure minimum loading display time
        const elapsed = Date.now() - (loadingStartTimeRef.current || 0)
        const remaining = MIN_LOADING_DISPLAY_MS - elapsed
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining))
        }
        setGifData(result)
      }
    } catch (err) {
      console.error('[v0] Error decoding file:', err)
    } finally {
      setShowLoadingScreen(false)
    }
  }, [decoder])
  
  const handleUrlSubmit = useCallback(async (url: string) => {
    setIsSaved(false)
    setShowLoadingScreen(true)
    loadingStartTimeRef.current = Date.now()
    
    try {
      const result = await decoder.decodeFromUrl(url)
      if (result) {
        // Ensure minimum loading display time
        const elapsed = Date.now() - (loadingStartTimeRef.current || 0)
        const remaining = MIN_LOADING_DISPLAY_MS - elapsed
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining))
        }
        setGifData(result)
      }
    } catch (err) {
      console.error('[v0] Error decoding URL:', err)
    } finally {
      setShowLoadingScreen(false)
    }
  }, [decoder])
  
  // Handle initialUrl prop - auto-load GIF from gallery default selection
  const processedUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (initialUrl && initialUrl !== processedUrlRef.current) {
      processedUrlRef.current = initialUrl
      handleUrlSubmit(initialUrl)
    }
  }, [initialUrl, handleUrlSubmit])
  
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [handleFileSelect])
  
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])
  
  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])
  
  const handleSave = useCallback(async () => {
    if (!metadata || frames.length === 0) return
    
    try {
      const savedId = await saveHighlight(metadata, frames)
      setIsSaved(true)
      haptic('success')
      playSoundIfEnabled('toggle')
      toast.custom((t) => (
        <div className={cn(
          "w-full max-w-sm p-4 rounded-2xl",
          "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
          "border border-[var(--border)]",
          "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_8px_32px_-8px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.15)]",
          "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_8px_32px_-8px_rgba(0,0,0,0.5),0_4px_12px_-4px_rgba(0,0,0,0.4)]"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]"
              )} />
              <span className="text-sm font-medium text-[var(--foreground)]">Saved to Gallery</span>
            </div>
            <div className={cn(
              "inline-flex items-center p-1 rounded-lg",
              "bg-[var(--recess)]",
              "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
              "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]",
            )}>
              <button
                onClick={async () => {
                  toast.dismiss(t)
                  try {
                    await deleteHighlight(savedId)
                    setIsSaved(false)
                    haptic('light')
                    playSoundIfEnabled('toggle')
                    toast.custom(() => (
                      <div className={cn(
                        "w-full max-w-sm p-4 rounded-2xl",
                        "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
                        "border border-[var(--border)]",
                        "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_8px_32px_-8px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.15)]",
                        "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_8px_32px_-8px_rgba(0,0,0,0.5),0_4px_12px_-4px_rgba(0,0,0,0.4)]"
                      )}>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]"
                          )} />
                          <span className="text-sm font-medium text-[var(--foreground)]">Removed from Gallery</span>
                        </div>
                      </div>
                    ), { duration: 2000 })
                    onGallerySaved?.()
                  } catch {
                    playSoundIfEnabled('click')
                    toast.error('Failed to undo')
                  }
                }}
                className={cn(
                  "relative flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                  "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                  "dark:from-[var(--module)] dark:to-[var(--card)]",
                  "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]",
                  "text-[var(--foreground)] hover:brightness-105"
                )}
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      ), { duration: 4000 })
      onGallerySaved?.()
    } catch {
      playSoundIfEnabled('click')
      toast.error('Failed to save')
    }
  }, [metadata, frames, onGallerySaved])
  
  const hasFrames = frames.length > 0
  
  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.({ 
      hasContent: hasFrames, 
      isSaved, 
      isLoading: showLoadingScreen,
      loadingProgress: decoder.progress
    })
  }, [hasFrames, isSaved, showLoadingScreen, decoder.progress, onStateChange])
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    upload: handleUploadClick,
    toggleFullscreen: toggleFullscreen,
    save: handleSave,
    canSave: hasFrames && !!metadata,
    isSaved,
    hasContent: hasFrames
  }), [handleUploadClick, toggleFullscreen, handleSave, hasFrames, metadata, isSaved])
  
  // Scrubber drag handling
  const handleScrubberInteraction = useCallback((clientX: number) => {
    if (!scrubberRef.current || frames.length === 0) return
    
    const rect = scrubberRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const progress = x / rect.width
    const targetFrame = Math.round(progress * (frames.length - 1))
    
    flipbook.goToFrame(targetFrame, false)
  }, [frames.length, flipbook])
  
  // Track previous frame for scrubber sound
  const prevScrubFrameRef = useRef<number>(-1)
  
  const handleScrubberPointerDown = useCallback((e: React.PointerEvent) => {
    setIsDraggingScrubber(true)
    haptic('light')
    playSoundIfEnabled('scrub')
    prevScrubFrameRef.current = flipbook.currentFrame
    e.currentTarget.setPointerCapture(e.pointerId)
    handleScrubberInteraction(e.clientX)
  }, [handleScrubberInteraction, flipbook.currentFrame])
  
  const handleScrubberPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingScrubber) return
    hapticThrottled('tick')
    // Only play scrub sound when frame changes
    if (flipbook.currentFrame !== prevScrubFrameRef.current) {
      playSoundIfEnabled('scrub')
      prevScrubFrameRef.current = flipbook.currentFrame
    }
    handleScrubberInteraction(e.clientX)
  }, [isDraggingScrubber, handleScrubberInteraction, flipbook.currentFrame])
  
  const handleScrubberPointerUp = useCallback(() => {
    setIsDraggingScrubber(false)
  }, [])
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (frames.length === 0) return
      
      switch (e.key) {
        case 'ArrowLeft':
          haptic('light')
          if (e.metaKey || e.ctrlKey) {
            flipbook.firstFrame()
          } else if (e.shiftKey) {
            flipbook.goToFrame(flipbook.currentFrame - 10, false)
          } else {
            flipbook.prevFrame()
          }
          e.preventDefault()
          break
        case 'ArrowRight':
          haptic('light')
          if (e.metaKey || e.ctrlKey) {
            flipbook.lastFrame()
          } else if (e.shiftKey) {
            flipbook.goToFrame(flipbook.currentFrame + 10, false)
          } else {
            flipbook.nextFrame()
          }
          e.preventDefault()
          break
        case ' ':
          haptic('medium')
          flipbook.setIsPlaying(!flipbook.isPlaying)
          e.preventDefault()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [frames.length, flipbook])
  
  const isLoading = decoder.status === 'loading' || decoder.status === 'decoding'
  const progress = hasFrames ? (flipbook.currentFrame + 1) / frames.length : 0
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Main stage */}
        <div className="flex-1 relative min-h-0">
          
          <AnimatePresence mode="wait">
            {!hasFrames && !isLoading ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <DropZone
                  onFileSelect={handleFileSelect}
                  onUrlSubmit={handleUrlSubmit}
                  onErrorReset={decoder.reset}
                  isLoading={isLoading}
                  progress={decoder.progress}
                  error={decoder.error}
                />
              </motion.div>
            ) : !showLoadingScreen && (
              <motion.div
                key="flipbook"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                className="absolute inset-0 flex items-center justify-center px-4 pt-14 pb-2"
              >
                <Flipbook
                  frames={frames}
                  currentFrame={flipbook.currentFrame}
                  flipProgress={flipbook.flipProgress}
                  isFlipping={flipbook.isFlipping}
                  direction={flipbook.direction}
                  mode="flipbook"
                  animationMode={animationMode}
                  scrollVelocity={flipbook.scrollVelocity}
                  onScroll={flipbook.handleScroll}
                  className="w-full h-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Decode progress indicator (when partially loaded) */}
          {isLoading && frames.length > 0 && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Loading... {decoder.progress}%
              </span>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".gif,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
        
        {/* Controls (bottom) - only show when frames are loaded */}
        <AnimatePresence>
          {hasFrames && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 px-4 py-2 pb-4"
            >
              <div className="max-w-3xl mx-auto space-y-3">
                {/* Filmstrip with proximity effects */}
                <Filmstrip
                  frames={frames}
                  currentFrame={flipbook.currentFrame}
                  onFrameSelect={(index) => flipbook.goToFrame(index, false)}
                />
                
                {/* Scrubber */}
                <div 
                  ref={scrubberRef}
                  className={cn(
                    "relative h-1.5 rounded-full cursor-pointer group",
                    "bg-[var(--recess)]",
                    "border border-[var(--border)]",
                    "shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.08)]",
                    "dark:shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.2)]",
                    isDraggingScrubber && "cursor-grabbing"
                  )}
                  onPointerDown={handleScrubberPointerDown}
                  onPointerMove={handleScrubberPointerMove}
                  onPointerUp={handleScrubberPointerUp}
                  onPointerLeave={handleScrubberPointerUp}
                >
                  {/* Progress fill */}
                  <motion.div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full",
                      "bg-gradient-to-r from-[var(--shell)] to-[var(--muted-foreground)]"
                    )}
                    initial={false}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: isDraggingScrubber ? 0 : 0.1 }}
                  />
                  
                  {/* Scrubber handle */}
                  <motion.div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full",
                      "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                      "border border-[var(--border)]",
                      "shadow-[0_1px_3px_0_rgba(0,0,0,0.15)]",
                      "opacity-0 group-hover:opacity-100 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      isDraggingScrubber && "opacity-100 scale-[1.4]"
                    )}
                    initial={false}
                    animate={{ left: `calc(${progress * 100}% - 6px)` }}
                    transition={{ 
                      type: isDraggingScrubber ? "tween" : "spring",
                      stiffness: 400,
                      damping: 30,
                      duration: isDraggingScrubber ? 0 : undefined
                    }}
                  />
                </div>
                
                {/* Frame counter */}
                <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] font-light tracking-wide">
                  <span className="font-mono tabular-nums">
                    {String(flipbook.currentFrame + 1).padStart(3, '0')} / {String(frames.length).padStart(3, '0')}
                  </span>
                  <KeyboardHint className="hidden sm:flex">
                    <ScrollHint />
                  </KeyboardHint>
                </div>
                
                {/* Playback controls */}
                <div className="flex items-center justify-between sm:justify-center w-full sm:gap-4">
                  {/* Animation mode slider */}
                  <div 
                    className={cn(
                      "flex items-center gap-0.5 p-1 rounded-[0.6em] flex-shrink-0",
                      "bg-[var(--recess)]",
                      "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
                      "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]"
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { haptic('selection'); playSoundIfEnabled('slide'); setAnimationMode('classic') }}
                          className={cn(
                            "relative flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 aspect-square rounded-[0.5em]",
                            "transition-colors duration-200",
                            animationMode === 'classic'
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {/* Sliding background */}
                          {animationMode === 'classic' && (
                            <motion.div
                              layoutId="animation-mode-slider"
                              className={cn(
                                "absolute inset-0 rounded-[0.5em]",
                                "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                                "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                                "dark:from-[var(--module)] dark:to-[var(--card)]",
                                "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]"
                              )}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={cn(
                              "absolute top-1 right-1 w-1.5 h-1.5 rounded-full transition-all duration-300 z-10",
                              animationMode === 'classic'
                                ? "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]"
                                : "bg-[var(--led-inactive)]"
                            )}
                          />
                          <Layers className="w-4 h-4 sm:w-[18px] sm:h-[18px] relative z-10" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Classic flip</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { haptic('selection'); playSoundIfEnabled('slide'); setAnimationMode('waterfall') }}
                          className={cn(
                            "relative flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 aspect-square rounded-[0.5em]",
                            "transition-colors duration-200",
                            animationMode === 'waterfall'
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {/* Sliding background */}
                          {animationMode === 'waterfall' && (
                            <motion.div
                              layoutId="animation-mode-slider"
                              className={cn(
                                "absolute inset-0 rounded-[0.5em]",
                                "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                                "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                                "dark:from-[var(--module)] dark:to-[var(--card)]",
                                "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]"
                              )}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={cn(
                              "absolute top-1 right-1 w-1.5 h-1.5 rounded-full transition-all duration-300 z-10",
                              animationMode === 'waterfall'
                                ? "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]"
                                : "bg-[var(--led-inactive)]"
                            )}
                          />
                          <Wind className="w-4 h-4 sm:w-[18px] sm:h-[18px] relative z-10" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Waterfall</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { haptic('selection'); playSoundIfEnabled('slide'); setAnimationMode('slide') }}
                          className={cn(
                            "relative flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0 aspect-square rounded-[0.5em]",
                            "transition-colors duration-200",
                            animationMode === 'slide'
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {/* Sliding background */}
                          {animationMode === 'slide' && (
                            <motion.div
                              layoutId="animation-mode-slider"
                              className={cn(
                                "absolute inset-0 rounded-[0.5em]",
                                "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                                "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                                "dark:from-[var(--module)] dark:to-[var(--card)]",
                                "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]"
                              )}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={cn(
                              "absolute top-1 right-1 w-1.5 h-1.5 rounded-full transition-all duration-300 z-10",
                              animationMode === 'slide'
                                ? "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]"
                                : "bg-[var(--led-inactive)]"
                            )}
                          />
                          <CreditCard className="w-4 h-4 sm:w-[18px] sm:h-[18px] relative z-10" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Slide</TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Navigation and playback buttons */}
                  <div className="flex items-center gap-0.5 sm:gap-1.5">
                    <div className="w-px h-5 sm:h-6 bg-border mx-2 sm:mx-3 flex-shrink-0" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HardwareButton3D 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 aspect-square"
                          hapticType="medium"
                          onClick={() => flipbook.firstFrame()}
                        >
                          <ChevronFirst className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </HardwareButton3D>
                      </TooltipTrigger>
                      <TooltipContent>First frame</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HardwareButton3D 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 aspect-square"
                          hapticType="light"
                          onClick={() => flipbook.prevFrame()}
                        >
                          <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </HardwareButton3D>
                      </TooltipTrigger>
                      <TooltipContent>Previous frame</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HardwareButton3D 
                          variant="default" 
                          size="icon" 
                          className="h-7 w-7 sm:h-11 sm:w-11 flex-shrink-0 aspect-square"
                          hapticType="medium"
                          onClick={() => flipbook.setIsPlaying(!flipbook.isPlaying)}
                        >
                          {flipbook.isPlaying ? (
                            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                          )}
                        </HardwareButton3D>
                      </TooltipTrigger>
                      <TooltipContent>{flipbook.isPlaying ? 'Pause' : 'Play'}</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HardwareButton3D 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 aspect-square"
                          hapticType="light"
                          onClick={() => flipbook.nextFrame()}
                        >
                          <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </HardwareButton3D>
                      </TooltipTrigger>
                      <TooltipContent>Next frame</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HardwareButton3D 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0 aspect-square"
                          hapticType="medium"
                          onClick={() => flipbook.lastFrame()}
                        >
                          <ChevronLast className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </HardwareButton3D>
                      </TooltipTrigger>
                      <TooltipContent>Last frame</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Fullscreen overlay */}
        <AnimatePresence>
          {isFullscreen && hasFrames && (
            <motion.div
              ref={fullscreenRef}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ 
                duration: 0.35, 
                ease: [0.32, 0.72, 0, 1]
              }}
              className="fixed inset-0 z-50 bg-background flex items-center justify-center p-12"
            >
              {/* Close button */}
              <HardwareButton3D
                variant="default"
                size="icon"
                onClick={toggleFullscreen}
                hapticType="light"
                className="absolute top-4 right-4 z-10"
              >
                <X className="w-5 h-5" />
              </HardwareButton3D>
              
              {/* Fullscreen flipbook */}
              <Flipbook
                frames={frames}
                currentFrame={flipbook.currentFrame}
                flipProgress={flipbook.flipProgress}
                isFlipping={flipbook.isFlipping}
                direction={flipbook.direction}
                mode="flipbook"
                animationMode={animationMode}
                scrollVelocity={flipbook.scrollVelocity}
                onScroll={flipbook.handleScroll}
                className="w-full h-full max-w-[80vw] max-h-[70vh]"
              />
              
              
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
})

Viewer.displayName = 'Viewer'
