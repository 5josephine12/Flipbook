'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { GifFrame } from '@/lib/gif-types'

interface FlipbookPageProps {
  frame: GifFrame
  className?: string
}

export function FlipbookPage({
  frame,
  className
}: FlipbookPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame.bitmap) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size to match bitmap
    canvas.width = frame.bitmap.width
    canvas.height = frame.bitmap.height
    
    // Clear and draw frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(frame.bitmap, 0, 0)
  }, [frame.bitmap])
  
  return (
    <canvas 
      ref={canvasRef}
      className={cn("block w-full h-full", className)}
      style={{
        imageRendering: 'auto',
        objectFit: 'contain'
      }}
    />
  )
}
