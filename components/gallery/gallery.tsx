'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, FolderOpen, Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { playSoundIfEnabled } from '@/lib/sounds'
import { getAllHighlights, deleteHighlight, DEFAULT_GALLERY_GIFS } from '@/lib/highlights-store'
import { HardwareButton3D } from '@/components/hardware-shell'
import { LoadingScreen } from '@/components/viewer/loading-screen'
import type { GifMetadata } from '@/lib/gif-types'

interface GalleryPreview {
  id: string
  metadata: GifMetadata
  frames: ImageBitmap[]
  title: string
  createdAt: number
}

interface GalleryProps {
  onSelect: (id: string) => void
  className?: string
  refreshTrigger?: number
}

// Individual auto-playing GIF card (for saved items with frames)
function GifCard({ 
  item, 
  onSelect, 
  onDelete,
  onDownload,
  index 
}: { 
  item: GalleryPreview
  onSelect: () => void
  onDelete: () => void
  onDownload: () => void
  index: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const isAnimationCompleteRef = useRef(false)
  
  // Set animation complete after entrance animation delay + duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      isAnimationCompleteRef.current = true
    }, (index * 40) + 500) // delay + duration in ms
    return () => clearTimeout(timeout)
  }, [index])
  
  // Auto-play animation
  useEffect(() => {
    if (item.frames.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % item.frames.length)
    }, 80) // ~12fps for smooth looping
    
    return () => clearInterval(interval)
  }, [item.frames.length])
  
  // Draw current frame
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !item.frames[currentFrame]) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const frame = item.frames[currentFrame]
    canvas.width = frame.width
    canvas.height = frame.height
    ctx.drawImage(frame, 0, 0)
  }, [currentFrame, item.frames])
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -12 }}
      transition={{ 
        delay: index * 0.04, 
        duration: 0.5, 
        ease: [0.32, 0.72, 0, 1]
      }}
      className="group relative break-inside-avoid"
      onMouseEnter={() => { setIsHovered(true); if (isAnimationCompleteRef.current) playSoundIfEnabled('hover') }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="relative overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        onClick={() => { playSoundIfEnabled('click'); if (isAnimationCompleteRef.current) onSelect() }}
        style={{
          boxShadow: isHovered 
            ? '0 20px 40px -12px rgba(0,0,0,0.2)' 
            : '0 4px 12px -4px rgba(0,0,0,0.08)'
        }}
      >
        {/* The GIF itself */}
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
        />
        
        {/* Subtle hover overlay with actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
            >
              {/* Action buttons */}
              <motion.div 
                className="absolute bottom-3 right-3 flex items-center gap-1.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1], delay: 0.05 }}
              >
                {/* Download button */}
                <div className="group/download">
                  <HardwareButton3D
                    variant="default"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload()
                    }}
                    hapticType="light"
                  >
                    <Download className="w-4 h-4 transition-all duration-200 group-hover/download:text-[#22c55e] group-hover/download:drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                  </HardwareButton3D>
                </div>
                {/* Delete button */}
                <div className="group/delete">
                  <HardwareButton3D
                    variant="default"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    hapticType="light"
                  >
                    <Trash2 className="w-4 h-4 transition-all duration-200 group-hover/delete:text-[#ef4444] group-hover/delete:drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                  </HardwareButton3D>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// Default GIF card using native <img> for instant display
function DefaultGifCard({ 
  url, 
  title,
  onSelect,
  onDownload,
  index 
}: { 
  url: string
  title: string
  onSelect: () => void
  onDownload: () => void
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isAnimationCompleteRef = useRef(false)
  
  // Set animation complete after entrance animation delay + duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      isAnimationCompleteRef.current = true
    }, (index * 40) + 500) // delay + duration in ms
    return () => clearTimeout(timeout)
  }, [index])
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -12 }}
      transition={{ 
        delay: index * 0.04, 
        duration: 0.5, 
        ease: [0.32, 0.72, 0, 1]
      }}
      className="group relative break-inside-avoid"
      onMouseEnter={() => { setIsHovered(true); if (isAnimationCompleteRef.current) playSoundIfEnabled('hover') }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="relative overflow-hidden cursor-pointer"
        whileHover={{ scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        onClick={() => { playSoundIfEnabled('click'); if (isAnimationCompleteRef.current) onSelect() }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title}
          className="w-full h-auto block transition-shadow duration-300"
          style={{ 
            boxShadow: isHovered 
              ? '0 20px 40px -12px rgba(0,0,0,0.2)' 
              : '0 4px 12px -4px rgba(0,0,0,0.08)'
          }}
        />
        
        {/* Download button */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="absolute bottom-3 right-3 group/download"
            >
              <HardwareButton3D
                variant="default"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload()
                }}
                hapticType="light"
              >
                <Download className="w-4 h-4 transition-all duration-200 group-hover/download:text-[#22c55e] group-hover/download:drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
              </HardwareButton3D>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export function Gallery({ onSelect, className, refreshTrigger }: GalleryProps) {
  const [items, setItems] = useState<GalleryPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  
  // Load gallery items
  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAllHighlights()
      setItems(data)
    } catch (error) {
      console.error('[v0] Failed to load gallery:', error)
      toast.error('Failed to load gallery')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    loadItems()
  }, [loadItems, refreshTrigger])
  
  const handleDeleteRequest = useCallback((id: string, title: string) => {
    setDeleteConfirm({ id, title })
  }, [])
  
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteHighlight(deleteConfirm.id)
      setItems(prev => prev.filter(h => h.id !== deleteConfirm.id))
      playSoundIfEnabled('toggle')
      toast.success('Removed from gallery')
      setDeleteConfirm(null)
    } catch {
      playSoundIfEnabled('click')
      toast.error('Failed to delete')
    }
  }, [deleteConfirm])
  
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null)
  }, [])
  
  // Handler for loading a default GIF into the flipbook
  const handleDefaultGifSelect = useCallback((url: string) => {
    // Pass the URL to the parent - it will fetch and decode on demand
    onSelect(`url:${url}`)
  }, [onSelect])
  
  // Handler for downloading a default GIF from URL
  const handleDefaultDownload = useCallback(async (url: string, title: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${title.replace(/\s+/g, '_')}.gif`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
      
      playSoundIfEnabled('toggle')
      toast.success('Downloaded GIF')
    } catch (error) {
      console.error('Download failed:', error)
      playSoundIfEnabled('click')
      toast.error('Failed to download')
    }
  }, [])
  
  // Handler for downloading a GIF
  const handleDownload = useCallback(async (item: GalleryPreview) => {
    try {
      // Create a canvas to capture first frame as a preview image
      // For full GIF export, we'd need gif.js or similar library
      // For now, download as animated WebP or first frame PNG
      const frames = item.frames
      if (frames.length === 0) {
        playSoundIfEnabled('click')
        toast.error('No frames to download')
        return
      }
      
      // Create canvas from first frame
      const firstFrame = frames[0]
      const canvas = document.createElement('canvas')
      canvas.width = firstFrame.width
      canvas.height = firstFrame.height
      const ctx = canvas.getContext('2d')!
      
      // Draw all frames to create an animated sequence
      // Since browsers don't natively support GIF encoding, we'll use the 
      // gif.js library dynamically or fall back to PNG
      
      // For now, download first frame as PNG with metadata in filename
      ctx.drawImage(firstFrame, 0, 0)
      
      canvas.toBlob((blob) => {
        if (!blob) {
          playSoundIfEnabled('click')
          toast.error('Failed to create download')
          return
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${item.title || 'gif'}_frame1.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        playSoundIfEnabled('toggle')
        toast.success('Downloaded first frame')
      }, 'image/png')
    } catch (error) {
      console.error('Download failed:', error)
      playSoundIfEnabled('click')
      toast.error('Failed to download')
    }
  }, [])
  
  if (isLoading) {
    return (
      <div className={cn("relative flex-1 w-full h-full", className)}>
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <LoadingScreen progress={100} />
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn("p-4 pb-24", className)}>
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-sm mx-4 p-6 rounded-2xl",
                // Match nav bar shell styling
                "bg-gradient-to-b from-[var(--shell)] to-[var(--recess)]",
                "border border-[var(--border)]",
                // Multi-layer shadow matching nav bar
                "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_-1px_2px_0_rgba(0,0,0,0.05)_inset,0_8px_32px_-8px_rgba(0,0,0,0.25),0_4px_12px_-4px_rgba(0,0,0,0.15)]",
                "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_2px_0_rgba(0,0,0,0.2)_inset,0_8px_32px_-8px_rgba(0,0,0,0.5),0_4px_12px_-4px_rgba(0,0,0,0.4)]"
              )}
            >
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                Delete this GIF?
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                Are you sure you want to remove this from your gallery? This action cannot be undone.
              </p>
              {/* Button container styled like nav tab container */}
              <div className="flex justify-end">
                <div 
                  className={cn(
                    "inline-flex items-center gap-1 p-1.5 rounded-xl",
                    "bg-[var(--recess)]",
                    "shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.1),inset_0_1px_2px_-1px_rgba(0,0,0,0.06)]",
                    "dark:shadow-[inset_0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_2px_-1px_rgba(0,0,0,0.2)]",
                  )}
                >
                <button
                  onClick={handleDeleteCancel}
                  className={cn(
                    "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleDeleteConfirm}
                  className={cn(
                    "relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                    "shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset,0_-1px_0_0_rgba(0,0,0,0.03)_inset,0_2px_6px_-2px_rgba(0,0,0,0.12),0_1px_3px_-1px_rgba(0,0,0,0.08)]",
                    "dark:from-[var(--module)] dark:to-[var(--card)]",
                    "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.1)_inset,0_2px_6px_-2px_rgba(0,0,0,0.3),0_1px_3px_-1px_rgba(0,0,0,0.2)]",
                    "text-[var(--foreground)]"
                  )}
                >
                  {/* Red LED indicator like nav tabs */}
                  <span 
                    className={cn(
                      "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full",
                      "bg-[#ef4444] shadow-[0_0_4px_1px_rgba(239,68,68,0.4)]"
                    )}
                  />
                  Delete
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Masonry-style gallery */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {/* User saved GIFs first */}
          {items.map((item, index) => (
            <GifCard
              key={item.id}
              item={item}
              onSelect={() => onSelect(item.id)}
              onDelete={() => handleDeleteRequest(item.id, item.title)}
              onDownload={() => handleDownload(item)}
              index={index}
            />
          ))}
          
          {/* Default sample GIFs - always visible */}
          {DEFAULT_GALLERY_GIFS.map((gif, index) => (
            <DefaultGifCard
              key={`default-${index}`}
              url={gif.url}
              title={gif.title}
              onSelect={() => handleDefaultGifSelect(gif.url)}
              onDownload={() => handleDefaultDownload(gif.url, gif.title)}
              index={items.length + index}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
