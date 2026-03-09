// Shared types for GIF handling

export interface GifFrame {
  bitmap: ImageBitmap
  delay: number
  index: number
}

export interface GifMetadata {
  width: number
  height: number
  frameCount: number
  totalDuration: number
  fileName: string
  fileSize: number
}

export interface GifData {
  metadata: GifMetadata
  frames: GifFrame[]
}

export interface HighlightItem {
  id: string
  metadata: GifMetadata
  frames: ArrayBuffer[] // Stored as PNG blobs for persistence
  coverFrameIndex: number
  createdAt: number
  title: string
}

export type ViewMode = 'flipbook' | 'scrub' | 'playback'

export type AnimationMode = 'classic' | 'waterfall'

export type FlipDirection = 'forward' | 'backward'

export interface FlipState {
  currentFrame: number
  flipProgress: number // 0-1 for partial flip animation
  isFlipping: boolean
  direction: FlipDirection
  velocity: number
}
