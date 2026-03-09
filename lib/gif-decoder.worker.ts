// GIF Decoder Web Worker
// Decodes GIF frames off the main thread for smooth performance

import { parseGIF, decompressFrames } from 'gifuct-js'

export interface GifFrame {
  imageData: ImageData
  delay: number
  disposalType: number
}

export interface GifMetadata {
  width: number
  height: number
  frameCount: number
  totalDuration: number
}

export type WorkerMessage =
  | { type: 'decode'; arrayBuffer: ArrayBuffer }
  | { type: 'cancel' }

export type WorkerResponse =
  | { type: 'metadata'; metadata: GifMetadata }
  | { type: 'frame'; index: number; imageData: ImageData; delay: number }
  | { type: 'complete' }
  | { type: 'error'; message: string }

let cancelled = false

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const message = e.data

  if (message.type === 'cancel') {
    cancelled = true
    return
  }

  if (message.type === 'decode') {
    cancelled = false
    
    try {
      const gif = parseGIF(message.arrayBuffer)
      const frames = decompressFrames(gif, true)
      
      if (frames.length === 0) {
        self.postMessage({ type: 'error', message: 'No frames found in GIF' } as WorkerResponse)
        return
      }
      
      const width = frames[0].dims.width
      const height = frames[0].dims.height
      const totalDuration = frames.reduce((sum, f) => sum + (f.delay || 100), 0)
      
      // Send metadata immediately
      self.postMessage({
        type: 'metadata',
        metadata: {
          width,
          height,
          frameCount: frames.length,
          totalDuration
        }
      } as WorkerResponse)
      
      // Create a canvas for compositing frames
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')!
      
      // Previous frame for disposal handling
      let previousImageData: ImageData | null = null
      
      for (let i = 0; i < frames.length; i++) {
        if (cancelled) return
        
        const frame = frames[i]
        const { dims, patch, disposalType } = frame
        
        // Handle disposal from previous frame
        if (i > 0) {
          const prevDisposal = frames[i - 1].disposalType
          if (prevDisposal === 2) {
            // Restore to background (clear)
            ctx.clearRect(0, 0, width, height)
          } else if (prevDisposal === 3 && previousImageData) {
            // Restore to previous
            ctx.putImageData(previousImageData, 0, 0)
          }
        }
        
        // Save current state if needed for disposal
        if (disposalType === 3) {
          previousImageData = ctx.getImageData(0, 0, width, height)
        }
        
        // Create ImageData from patch
        const patchData = new ImageData(
          new Uint8ClampedArray(patch),
          dims.width,
          dims.height
        )
        
        // Draw patch at correct position
        const tempCanvas = new OffscreenCanvas(dims.width, dims.height)
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(patchData, 0, 0)
        
        ctx.drawImage(tempCanvas, dims.left, dims.top)
        
        // Get full frame
        const fullFrame = ctx.getImageData(0, 0, width, height)
        
        // Send frame to main thread
        self.postMessage({
          type: 'frame',
          index: i,
          imageData: fullFrame,
          delay: frame.delay || 100
        } as WorkerResponse)
        
        // Small yield to allow message processing
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
      
      self.postMessage({ type: 'complete' } as WorkerResponse)
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to decode GIF'
      } as WorkerResponse)
    }
  }
}
