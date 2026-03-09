'use client'

import { useRef, useEffect } from 'react'
import type { GifFrame } from '@/lib/gif-types'

interface FilmstripThumbnailProps {
  frame: GifFrame
  className?: string
}

export function FilmstripThumbnail({ frame, className }: FilmstripThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame.bitmap) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size to match container (thumbnail size)
    canvas.width = 64
    canvas.height = 48
    
    // Draw bitmap scaled to fit
    ctx.drawImage(frame.bitmap, 0, 0, 64, 48)
  }, [frame.bitmap])
  
  return (
    <canvas 
      ref={canvasRef}
      className={className}
      width={64}
      height={48}
    />
  )
}
