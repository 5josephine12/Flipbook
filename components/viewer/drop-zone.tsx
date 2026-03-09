'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileImage, AlertCircle, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HardwareButton3D } from '@/components/hardware-shell'

interface DropZoneProps {
  onFileSelect: (file: File) => void
  onUrlSubmit?: (url: string) => void
  onErrorReset?: () => void
  isLoading: boolean
  progress: number
  error: string | null
  className?: string
}

export function DropZone({
  onFileSelect,
  onUrlSubmit,
  onErrorReset,
  isLoading,
  progress,
  error,
  className
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'image/gif') {
      onFileSelect(file)
    }
  }, [onFileSelect])
  
  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'image/gif') {
      onFileSelect(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [onFileSelect])
  
  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (urlValue.trim() && onUrlSubmit) {
      onUrlSubmit(urlValue.trim())
      setUrlValue('')
      setShowUrlInput(false)
    }
  }, [urlValue, onUrlSubmit])
  
  return (
    <div className={cn("relative w-full h-full flex items-center justify-center p-8", className)}>
      <motion.div
        className={cn(
          "relative w-full max-w-md aspect-[4/3] rounded-2xl border-2 border-dashed",
          "flex flex-col items-center justify-center gap-4 p-8",
          "cursor-pointer transition-all duration-200",
          isDragOver 
            ? "border-[var(--foreground)] bg-[var(--module)]" 
            : "border-[var(--border)] hover:border-[var(--muted-foreground)] hover:bg-[var(--module)]/50",
          isLoading && "pointer-events-none"
        )}
        animate={{
          scale: isDragOver ? 1.02 : 1,
          borderColor: isDragOver ? 'var(--primary)' : undefined
        }}
        transition={{ duration: 0.15 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Loading book animation */}
              <div className="relative w-16 h-20">
                {/* Book pages stacking */}
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-x-0 bottom-0 h-16 bg-[var(--module)] rounded-sm border border-[var(--border)]"
                    style={{ 
                      transformOrigin: 'bottom center',
                      zIndex: 4 - i
                    }}
                    animate={{
                      rotateX: [0, -15, 0],
                      y: [0, -2, 0]
                    }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                ))}
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Developing...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {progress}% decoded
                </p>
              </div>
              
              {/* Progress bar */}
              <div className="w-full max-w-[200px] h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-center gap-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-destructive font-medium max-w-[280px]">{error}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different file or URL
                </p>
              </div>
              <HardwareButton3D
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onErrorReset?.()
                }}
                className="mt-2"
                hapticType="light"
              >
                Go back
              </HardwareButton3D>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <motion.div 
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center",
                  // Match HardwareButton3D default variant styling
                  "bg-gradient-to-b from-[var(--module)] to-[var(--card)]",
                  "border border-[var(--border)]",
                  // Multi-layer shadow for depth
                  "shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset,0_-1px_0_0_rgba(0,0,0,0.05)_inset,0_2px_4px_-1px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)]",
                  "dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_-1px_0_0_rgba(0,0,0,0.2)_inset,0_2px_4px_-1px_rgba(0,0,0,0.3),0_1px_2px_-1px_rgba(0,0,0,0.2)]"
                )}
                animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25 
                }}
              >
                {isDragOver ? (
                  <FileImage className="w-6 h-6 text-[var(--foreground)]" />
                ) : (
                  <Upload className="w-6 h-6 text-[var(--foreground)]" />
                )}
              </motion.div>
              
              <div>
                <p className="text-sm sm:text-base font-medium text-foreground">
                  {isDragOver ? 'Drop your GIF' : 'Drop a GIF to flip through it'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  or tap to browse
                </p>
              </div>
              
              {/* URL input toggle */}
              {onUrlSubmit && (
                <div className="w-full max-w-xs">
                  {showUrlInput ? (
                    <form onSubmit={handleUrlSubmit} className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="giphy.com, tenor.com, imgur..."
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        className="text-sm h-9"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={!urlValue.trim()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Load
                      </Button>
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowUrlInput(true)
                      }}
                      className="text-muted-foreground hover:text-foreground gap-2"
                    >
                      <Link className="w-4 h-4" />
                      <span>or paste a URL</span>
                    </Button>
                  )}
                </div>
              )}
              
              
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
