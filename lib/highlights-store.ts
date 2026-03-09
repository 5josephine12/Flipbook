'use client'

import { get, set, del, keys } from 'idb-keyval'
import type { HighlightItem, GifMetadata, GifFrame } from './gif-types'

const HIGHLIGHTS_PREFIX = 'highlight_'

// Convert ImageBitmap to ArrayBuffer (PNG) for storage
async function bitmapToArrayBuffer(bitmap: ImageBitmap): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return blob.arrayBuffer()
}

// Convert ArrayBuffer back to ImageBitmap
async function arrayBufferToBitmap(buffer: ArrayBuffer): Promise<ImageBitmap> {
  const blob = new Blob([buffer], { type: 'image/png' })
  return createImageBitmap(blob)
}

export async function saveHighlight(
  metadata: GifMetadata,
  frames: GifFrame[],
  title?: string
): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  
  console.log('[v0] saveHighlight: Starting save for', title || metadata.fileName)
  console.log('[v0] saveHighlight: Number of frames', frames.length)
  
  // Convert all frames to ArrayBuffers
  const frameBuffers = await Promise.all(
    frames.map(frame => bitmapToArrayBuffer(frame.bitmap))
  )
  
  console.log('[v0] saveHighlight: Converted frames to ArrayBuffers')
  
  const highlight: HighlightItem = {
    id,
    metadata,
    frames: frameBuffers,
    coverFrameIndex: 0,
    createdAt: Date.now(),
    title: title || metadata.fileName.replace(/\.gif$/i, '')
  }
  
  await set(`${HIGHLIGHTS_PREFIX}${id}`, highlight)
  console.log('[v0] saveHighlight: Saved with key', `${HIGHLIGHTS_PREFIX}${id}`)
  
  // Verify it was saved
  const allKeys = await keys()
  console.log('[v0] saveHighlight: All keys after save', allKeys)
  
  return id
}

export async function getHighlight(id: string): Promise<{
  metadata: GifMetadata
  frames: GifFrame[]
  coverFrameIndex: number
  title: string
  createdAt: number
} | null> {
  const data = await get<HighlightItem>(`${HIGHLIGHTS_PREFIX}${id}`)
  if (!data) return null
  
  // Convert ArrayBuffers back to ImageBitmaps
  const frames: GifFrame[] = await Promise.all(
    data.frames.map(async (buffer, index) => ({
      bitmap: await arrayBufferToBitmap(buffer),
      delay: 100, // Default delay
      index
    }))
  )
  
  return {
    metadata: data.metadata,
    frames,
    coverFrameIndex: data.coverFrameIndex,
    title: data.title,
    createdAt: data.createdAt
  }
}

export async function getAllHighlights(): Promise<Array<{
  id: string
  metadata: GifMetadata
  frames: ImageBitmap[]
  title: string
  createdAt: number
}>> {
  console.log('[v0] getAllHighlights: Starting to load')
  const allKeys = await keys()
  console.log('[v0] getAllHighlights: All keys in IndexedDB', allKeys)
  const highlightKeys = allKeys.filter(
    key => typeof key === 'string' && key.startsWith(HIGHLIGHTS_PREFIX)
  )
  console.log('[v0] getAllHighlights: Highlight keys found', highlightKeys)
  
  const highlights = await Promise.all(
    highlightKeys.map(async key => {
      const data = await get<HighlightItem>(key as string)
      if (!data) return null
      
      // Load all frame bitmaps for auto-play
      const frames = await Promise.all(
        data.frames.map(buffer => arrayBufferToBitmap(buffer))
      )
      
      return {
        id: data.id,
        metadata: data.metadata,
        frames,
        title: data.title,
        createdAt: data.createdAt
      }
    })
  )
  
  return highlights
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteHighlight(id: string): Promise<void> {
  await del(`${HIGHLIGHTS_PREFIX}${id}`)
}

export async function updateHighlight(
  id: string,
  updates: { title?: string; coverFrameIndex?: number }
): Promise<void> {
  const data = await get<HighlightItem>(`${HIGHLIGHTS_PREFIX}${id}`)
  if (!data) return
  
  if (updates.title !== undefined) {
    data.title = updates.title
  }
  if (updates.coverFrameIndex !== undefined) {
    data.coverFrameIndex = updates.coverFrameIndex
  }
  
  await set(`${HIGHLIGHTS_PREFIX}${id}`, data)
}

// Default sample GIF URLs - beautiful anime and artistic GIFs
// These are shown instantly via <img> tags, no decoding needed
export const DEFAULT_GALLERY_GIFS = [
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fire-5fUk7oHKKSGGJ2HQtSJGQHFm7LJePi.gif', title: 'Fireworks' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MMx55H-eRHN4SksBzZnEaClgIvz0bpkvLlSHR.gif', title: 'Jiji' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%282%29-DAW5mO9hErAIzM7EKJxiajZpHzYG01.gif', title: 'Jellyfish' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/kimi4-lKjg0Bh1P1OfMliGGvKuAQAzrkvXm4.gif', title: 'Comet' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/24daa65b80a904cbfc425e5bb12b24dd-DSHd7re0GlRPwwkaCwgU4TsKSV793W.gif', title: 'Stars' },
  
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/yourname5-rNsvzu2xaPozopeuNyGI4ruEsVju8g.gif', title: 'Mitsuha' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cake-fR9y0G1TSrqWkValQzvYH8ZTibBKTK.gif', title: 'Cake' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2e9a2d99e9b3a32dcb4ae1c37820e260-czXRfiP1iIjC9KZYGDJRQzCW83R74R.gif', title: 'Magic Book' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/z-13Nrzw43vqijRLgticRZ6eMLDaqGnh.gif', title: 'Totoro' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/batman-RgEwRj8DlBql1ZZbn2b3j5zfpyjjiC.gif', title: 'Batman' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/inception-V6P3Y6KwgPhbs6uZUHhFtxlwNi65B9.gif', title: 'Inception' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/interstellar-ghCBKYJaKFLApSdIFjKZtuERCj1b4o.gif', title: 'Interstellar' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%282%29-VViIT5ziFOpKOiTDTBjrcI61uXyKA9.gif', title: 'Butterflies' },
  
  // Ghibli and anime collection (animated GIFs only)
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/spirited-away-anime-1NOlb2HK3olNitWlYdR2LdDGYc6JDP.gif', title: 'Spirited Away Doors' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/download-tEqmvDcumYNrfhvgEan8F81TazRYiG.gif', title: 'No-Face' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/source-dex8lNUn41iU8iZv1RTQNmAr4XMQgP.gif', title: 'Unicorn Gundam' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tumblr_9744c64e6df4946d99173deea2c56260_81175250_500-HOHCsCzEr5SbNPwTPPuSgALUYeBMTa.gif', title: 'Haku Flowers' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kikis%2BDelivery%2BService-7q6uyn4ynjF79elVTtAsPmxCPkyBkq.gif', title: 'Kiki Flying' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/studio-ghibli-gif-8-s8y2DdBXg9iWFAJv8TkYNWCU2c1omz.gif', title: 'Ponyo' },
  { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/arkerxx-jao-gundam3-pLE5A8lKfJynfEwOYPngZJuYnZc3GT.gif', title: 'Gundam Sketch' },
]
