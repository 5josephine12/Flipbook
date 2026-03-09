'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { GifFrame, GifMetadata, GifData } from '@/lib/gif-types'

interface DecoderState {
  status: 'idle' | 'loading' | 'decoding' | 'ready' | 'error'
  progress: number // 0-100
  error: string | null
  metadata: GifMetadata | null
  frames: GifFrame[]
}

export function useGifDecoder() {
  const [state, setState] = useState<DecoderState>({
    status: 'idle',
    progress: 0,
    error: null,
    metadata: null,
    frames: []
  })
  
  const workerRef = useRef<Worker | null>(null)
  const framesRef = useRef<GifFrame[]>([])
  
  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])
  
  const decode = useCallback(async (file: File): Promise<GifData | null> => {
    // Reset state
    framesRef.current = []
    setState({
      status: 'loading',
      progress: 0,
      error: null,
      metadata: null,
      frames: []
    })
    
    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate()
    }
    
    return new Promise((resolve) => {
      // Create new worker
      const worker = new Worker(
        new URL('../lib/gif-decoder.worker.ts', import.meta.url),
        { type: 'module' }
      )
      workerRef.current = worker
      
      let metadata: GifMetadata | null = null
      
      worker.onmessage = async (e) => {
        const msg = e.data
        
        if (msg.type === 'metadata') {
          metadata = {
            ...msg.metadata,
            fileName: file.name,
            fileSize: file.size
          }
          setState(prev => ({
            ...prev,
            status: 'decoding',
            metadata
          }))
        }
        
        if (msg.type === 'frame') {
          // Convert ImageData to ImageBitmap for efficient rendering
          const bitmap = await createImageBitmap(msg.imageData)
          const frame: GifFrame = {
            bitmap,
            delay: msg.delay,
            index: msg.index
          }
          
          framesRef.current.push(frame)
          
          // Update progress
          const progress = metadata 
            ? Math.round((framesRef.current.length / metadata.frameCount) * 100)
            : 0
            
          setState(prev => ({
            ...prev,
            progress,
            frames: [...framesRef.current]
          }))
        }
        
        if (msg.type === 'complete') {
          setState(prev => ({
            ...prev,
            status: 'ready',
            progress: 100
          }))
          
          if (metadata) {
            resolve({
              metadata,
              frames: framesRef.current
            })
          } else {
            resolve(null)
          }
        }
        
        if (msg.type === 'error') {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: msg.message
          }))
          resolve(null)
        }
      }
      
      worker.onerror = (err) => {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: err.message || 'Worker error'
        }))
        resolve(null)
      }
      
      // Read file and send to worker
      file.arrayBuffer().then(buffer => {
        worker.postMessage({ type: 'decode', arrayBuffer: buffer }, [buffer])
      })
    })
  }, [])
  
  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' })
      workerRef.current.terminate()
      workerRef.current = null
    }
    setState({
      status: 'idle',
      progress: 0,
      error: null,
      metadata: null,
      frames: []
    })
  }, [])
  
  const reset = useCallback(() => {
    cancel()
  }, [cancel])
  
  const decodeFromUrl = useCallback(async (url: string): Promise<GifData | null> => {
    // Reset state
    framesRef.current = []
    setState({
      status: 'loading',
      progress: 0,
      error: null,
      metadata: null,
      frames: []
    })
    
    try {
      // Use our API route to fetch the GIF (handles CORS and social media detection)
      const response = await fetch('/api/fetch-gif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        const errorMessage = result.hint 
          ? `${result.error} ${result.hint}`
          : result.error || 'Failed to fetch GIF'
        throw new Error(errorMessage)
      }
      
      // Convert base64 back to File
      const binaryString = atob(result.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/gif' })
      const file = new File([blob], result.fileName, { type: 'image/gif' })
      
      return decode(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GIF from URL'
      setState(prev => ({
        ...prev,
        status: 'error',
        error: message
      }))
      return null
    }
  }, [decode])
  
  return {
    ...state,
    decode,
    decodeFromUrl,
    cancel,
    reset
  }
}
