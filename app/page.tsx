'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Grid3X3, Upload, Maximize2, Bookmark, Info, X } from 'lucide-react'
import { Toaster } from 'sonner'

import { cn } from '@/lib/utils'
import { Viewer, type ViewerHandle } from '@/components/viewer'
import { LoadingScreen } from '@/components/viewer/loading-screen'
import { Gallery } from '@/components/gallery'
import { HardwareButton3D } from '@/components/hardware-shell'
import { getHighlight } from '@/lib/highlights-store'
import { haptic } from '@/lib/haptics'
import { playSoundIfEnabled } from '@/lib/sounds'
import type { GifData } from '@/lib/gif-types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Tab = 'viewer' | 'gallery'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('viewer')
  const [galleryRefresh, setGalleryRefresh] = useState(0)
  const [initialData, setInitialData] = useState<GifData | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  
  const viewerRef = useRef<ViewerHandle>(null)
  const [viewerState, setViewerState] = useState({ hasContent: false, isSaved: false, isLoading: false, loadingProgress: 0 })
  
  
  
  const handleGallerySaved = useCallback(() => {
    setGalleryRefresh(prev => prev + 1)
  }, [])
  
  const [initialUrl, setInitialUrl] = useState<string | null>(null)
  
  const handleGallerySelect = useCallback(async (id: string) => {
    if (id.startsWith('url:')) {
      const url = id.slice(4)
      setInitialUrl(url)
      setInitialData(null)
      setActiveTab('viewer')
      return
    }
    
    const data = await getHighlight(id)
    if (data) {
      setInitialUrl(null)
      setInitialData({
        metadata: data.metadata,
        frames: data.frames
      })
      setActiveTab('viewer')
    }
  }, [])
  

  
  return (
    <main className="h-screen flex flex-col bg-[var(--background)] noise-bg">
      {/* Content area - now first in flex order */}
      <div 
        className={cn(
          "flex-1 overflow-hidden relative order-1",
          activeTab === 'viewer' && "mx-3 mt-3 md:mx-4 md:mt-4"
        )}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Loading screen overlay - shown during GIF decoding, only on viewer tab */}
          <AnimatePresence>
            {activeTab === 'viewer' && viewerState.isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.32, 0.72, 0, 1]
                }}
                className="absolute inset-0 z-10 flex items-center justify-center"
              >
                <LoadingScreen progress={viewerState.loadingProgress} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            {activeTab === 'viewer' ? (
              <motion.div
                key="viewer"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ 
                  opacity: viewerState.isLoading ? 0 : 1, 
                  scale: 1, 
                  y: 0 
                }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                transition={{ 
                  duration: 0.35, 
                  ease: [0.32, 0.72, 0, 1]
                }}
                className="absolute inset-0"
              >
                <Viewer 
                  ref={viewerRef}
                  onGallerySaved={handleGallerySaved}
                  initialData={initialData || undefined}
                  initialUrl={initialUrl || undefined}
                  onStateChange={setViewerState}
                />
              </motion.div>
            ) : (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                transition={{ 
                  duration: 0.35, 
                  ease: [0.32, 0.72, 0, 1]
                }}
                className="absolute inset-0 overflow-auto"
              >
                <Gallery 
                  onSelect={handleGallerySelect}
                  refreshTrigger={galleryRefresh}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Hardware-style navigation bar - at bottom, scales on small screens */}
      <nav 
        className="relative flex-shrink-0 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 order-2"
        style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}
      >
        <div 
          className={cn(
            "flex items-center justify-between",
            "px-[0.5em] py-[0.4em] sm:px-[0.75em] sm:py-[0.5em] rounded-[0.75em] sm:rounded-[1em]",
            // Outer shell with depth
            "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
            "border border-[var(--border)]",
            // Multi-layer shadow for physical depth
            "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_4px_12px_-4px_rgba(0,0,0,0.15),0_2px_4px_-2px_rgba(0,0,0,0.1)]",
            "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_4px_12px_-4px_rgba(0,0,0,0.4),0_2px_4px_-2px_rgba(0,0,0,0.3)]",
          )}
        >
          {/* Left side: Tab buttons - segmented control style */}
          <div className="flex items-center gap-[0.375em]">
            <div 
              className={cn(
                "flex items-center gap-[0.125em] p-[0.25em] rounded-[0.375em] sm:rounded-[0.5em]",
                "bg-[var(--recess)]",
                "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
                "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]",
              )}
            >
              <button
                onClick={() => { haptic('selection'); playSoundIfEnabled('slide'); setActiveTab('viewer') }}
                className={cn(
                  "relative flex items-center gap-[0.375em] sm:gap-[0.5em] px-[0.75em] sm:px-[1em] py-[0.5em] rounded-[0.25em] sm:rounded-[0.375em] text-[1em] font-medium",
                  "transition-colors duration-200",
                  activeTab === 'viewer' 
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {/* Sliding background */}
                {activeTab === 'viewer' && (
                  <motion.div
                    layoutId="nav-slider"
                    className={cn(
                      "absolute inset-0 rounded-[0.25em] sm:rounded-[0.375em]",
                      "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                      "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                      "dark:from-[var(--module)] dark:to-[var(--card)]",
                      "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {/* LED indicator */}
                <span 
                  className={cn(
                    "absolute top-[0.25em] right-[0.25em] w-[0.375em] h-[0.375em] rounded-full transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] z-10",
                    activeTab === 'viewer' 
                      ? "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]" 
                      : "bg-[var(--led-inactive)]"
                  )}
                />
                <BookOpen className="w-[1em] h-[1em] relative z-10" />
                <span className="hidden xs:inline relative z-10">Flipbook</span>
              </button>
              
              <button
                onClick={() => { haptic('selection'); playSoundIfEnabled('slide'); setActiveTab('gallery') }}
                className={cn(
                  "relative flex items-center gap-[0.375em] sm:gap-[0.5em] px-[0.75em] sm:px-[1em] py-[0.5em] rounded-[0.25em] sm:rounded-[0.375em] text-[1em] font-medium",
                  "transition-colors duration-200",
                  activeTab === 'gallery' 
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {/* Sliding background */}
                {activeTab === 'gallery' && (
                  <motion.div
                    layoutId="nav-slider"
                    className={cn(
                      "absolute inset-0 rounded-[0.25em] sm:rounded-[0.375em]",
                      "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                      "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                      "dark:from-[var(--module)] dark:to-[var(--card)]",
                      "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {/* LED indicator */}
                <span 
                  className={cn(
                    "absolute top-[0.25em] right-[0.25em] w-[0.375em] h-[0.375em] rounded-full transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] z-10",
                    activeTab === 'gallery' 
                      ? "bg-[var(--led-active)] shadow-[0_0_4px_1px_rgba(74,222,128,0.4)]" 
                      : "bg-[var(--led-inactive)]"
                  )}
                />
                <Grid3X3 className="w-[1em] h-[1em] relative z-10" />
                <span className="hidden xs:inline relative z-10">Gallery</span>
              </button>
            </div>
          </div>
          
          {/* Right side: Action buttons - always visible */}
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center gap-[0.25em]">
              {/* Upload button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HardwareButton3D
                    variant="ghost"
                    size="icon"
                    onClick={() => viewerRef.current?.upload()}
                    hapticType="light"
                    disabled={activeTab !== 'viewer'}
                    className={cn(
                      activeTab !== 'viewer' && "opacity-30 pointer-events-none"
                    )}
                  >
                    <Upload className="w-[1em] h-[1em]" />
                  </HardwareButton3D>
                </TooltipTrigger>
                <TooltipContent>Upload GIF</TooltipContent>
              </Tooltip>
              
              {/* Fullscreen button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HardwareButton3D
                    variant="ghost"
                    size="icon"
                    onClick={() => viewerRef.current?.toggleFullscreen()}
                    hapticType="light"
                    disabled={activeTab !== 'viewer' || !viewerState.hasContent}
                    className={cn(
                      (activeTab !== 'viewer' || !viewerState.hasContent) && "opacity-30 pointer-events-none"
                    )}
                  >
                    <Maximize2 className="w-[1em] h-[1em]" />
                  </HardwareButton3D>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>
              
              {/* Save/Bookmark button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HardwareButton3D
                    variant="ghost"
                    size="icon"
                    onClick={() => viewerRef.current?.save()}
                    hapticType="medium"
                    disabled={activeTab !== 'viewer' || !viewerState.hasContent || viewerState.isSaved}
                    className={cn(
                      (activeTab !== 'viewer' || !viewerState.hasContent || viewerState.isSaved) && "opacity-30 pointer-events-none"
                    )}
                  >
                    <Bookmark className={cn("w-[1em] h-[1em]", viewerState.isSaved && "fill-current")} />
                  </HardwareButton3D>
                </TooltipTrigger>
                <TooltipContent>
                  {viewerState.isSaved ? 'Already saved' : 'Save to Gallery'}
                </TooltipContent>
              </Tooltip>
              
              {/* About button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <HardwareButton3D
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAbout(true)}
                    hapticType="light"
                  >
                    <Info className="w-[1em] h-[1em]" />
                  </HardwareButton3D>
                </TooltipTrigger>
                <TooltipContent>About</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </nav>
      
      <Toaster position="top-center" />
      
      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                "relative w-[94vw] max-w-2xl p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl",
                "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
                "border border-[var(--border)]",
                "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_12px_32px_-8px_rgba(0,0,0,0.25),0_4px_8px_-4px_rgba(0,0,0,0.15)]",
                "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_12px_32px_-8px_rgba(0,0,0,0.6),0_4px_8px_-4px_rgba(0,0,0,0.4)]",
                // Scale down on very small screens
                "max-h-[90vh]"
              )}
              style={{
                fontSize: 'clamp(10px, 2.5vw, 16px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Screen bezel - inner display area matching nav bar recess */}
              <div 
                className={cn(
                  "relative px-4 py-6 sm:px-8 sm:py-10 md:px-12 md:py-14 rounded-lg sm:rounded-xl overflow-hidden",
                  "bg-[var(--recess)]",
                  "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
                  "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]",
                  "noise-bg"
                )}
              >
                {/* Close button */}
                <HardwareButton3D
                  variant="default"
                  size="icon"
                  hapticType="medium"
                  onClick={() => setShowAbout(false)}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </HardwareButton3D>
                
                {/* Manifesto content - uses em units to scale with container font-size */}
                <div className="space-y-[1em] sm:space-y-[1.2em] md:space-y-[1.4em] text-[1em] sm:text-[0.95em] md:text-[0.9375em] leading-relaxed text-muted-foreground">
                  <h2 className="text-[1.4em] sm:text-[1.6em] md:text-[1.875em] font-normal text-foreground tracking-tight pr-6">
                    Digital Flipbook
                  </h2>
                  
                  <div className="space-y-[0.75em] sm:space-y-[0.85em] md:space-y-[1em]">
                    <p>
                      I built this because I wanted to slow down and appreciate GIFs the way they deserve. Frame by frame, like flipping through a physical flipbook. There is something magical about having control over the animation. I crave the tactility of physical forms of art and products that you rarely find in software—you can see this bleed through the microanimations, UI rendering, and texture throughout this project.
                    </p>
                    
                    <p>
                      What works best: GIFs with smooth motion, hand-drawn animations, stop-motion, or anything with satisfying frame-to-frame progression. Zoom-in sequences and subtle loops are particularly beautiful here.
                    </p>
                    
                    <p>
                      Scroll or drag the scrubber to flip through frames. Try the filmstrip to jump to specific moments. Save your favorites to build a collection. This is an invitation to play around.
                    </p>
                  </div>
                  
                  <div className="pt-[0.6em] sm:pt-[0.8em] md:pt-[1em] border-t border-[var(--border)]/50 space-y-[0.2em] sm:space-y-[0.3em]">
                    <p>
                      Built by{' '}
                      <a 
                        href="https://josephines.world" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-foreground hover:underline"
                      >
                        Josephine Ong
                      </a>
                    </p>
                    
                    <p>
                      Found a bug? Let me know{' '}
                      <a 
                        href="https://x.com/5josephine12" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-foreground hover:underline"
                      >
                        @5josephine12
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
