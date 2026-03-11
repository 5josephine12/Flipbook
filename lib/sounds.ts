'use client'

// Web Audio API sound effects for tactile UI feedback
// Generates sounds programmatically - no external audio files needed

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      console.warn('Web Audio API not supported')
      return null
    }
  }
  
  // Resume if suspended (browsers require user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  
  return audioContext
}

type SoundType = 'click' | 'toggle' | 'success' | 'soft'

interface SoundConfig {
  frequency: number
  duration: number
  volume: number
  type: OscillatorType
  attack: number
  decay: number
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  // Subtle mechanical click - like a physical button
  click: {
    frequency: 1800,
    duration: 0.04,
    volume: 0.08,
    type: 'square',
    attack: 0.001,
    decay: 0.03,
  },
  // Softer toggle sound
  toggle: {
    frequency: 1200,
    duration: 0.05,
    volume: 0.06,
    type: 'sine',
    attack: 0.002,
    decay: 0.04,
  },
  // Positive confirmation
  success: {
    frequency: 880,
    duration: 0.08,
    volume: 0.07,
    type: 'sine',
    attack: 0.005,
    decay: 0.07,
  },
  // Very soft tap
  soft: {
    frequency: 2200,
    duration: 0.025,
    volume: 0.04,
    type: 'sine',
    attack: 0.001,
    decay: 0.02,
  },
}

export function playSound(type: SoundType = 'click'): void {
  const ctx = getAudioContext()
  if (!ctx) return
  
  const config = soundConfigs[type]
  const now = ctx.currentTime
  
  // Create oscillator for the click tone
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.type = config.type
  oscillator.frequency.setValueAtTime(config.frequency, now)
  
  // Quick pitch drop for more natural click feel
  oscillator.frequency.exponentialRampToValueAtTime(
    config.frequency * 0.5,
    now + config.duration
  )
  
  // Envelope: quick attack, fast decay
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(config.volume, now + config.attack)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration)
  
  // Add subtle noise for texture (like a real mechanical click)
  if (type === 'click' || type === 'soft') {
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3
    }
    
    const noiseSource = ctx.createBufferSource()
    const noiseGain = ctx.createGain()
    noiseSource.buffer = noiseBuffer
    noiseGain.gain.setValueAtTime(config.volume * 0.15, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)
    
    noiseSource.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noiseSource.start(now)
  }
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.start(now)
  oscillator.stop(now + config.duration)
}

// Sound preference management
const SOUND_ENABLED_KEY = 'flipbook-sounds-enabled'

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SOUND_ENABLED_KEY)
  return stored !== 'false' // Default to true
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
}

// Play sound only if enabled
export function playSoundIfEnabled(type: SoundType = 'click'): void {
  if (isSoundEnabled()) {
    playSound(type)
  }
}
