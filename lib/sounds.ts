'use client'

// Web Audio API sound effects for tactile UI feedback
// Generates subtle, physical-feeling sounds - like keyboard presses and paper

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

export type SoundType = 'click' | 'toggle' | 'slide' | 'scrub' | 'filmstrip' | 'pageFlip' | 'soft'

// Create filtered noise for paper-like sounds
function createFilteredNoise(ctx: AudioContext, duration: number, highpass: number, lowpass: number): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  
  // Generate white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  const source = ctx.createBufferSource()
  source.buffer = buffer
  
  return source
}

// Subtle keyboard-like click for buttons
function playClick(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Very short noise burst - like a keyboard key bottoming out
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.008, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    // Shape the noise to have a sharp attack
    const envelope = Math.exp(-i / (ctx.sampleRate * 0.002))
    noiseData[i] = (Math.random() * 2 - 1) * envelope
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  // Bandpass filter for that plastic key sound
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3500
  filter.Q.value = 1.5
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.025, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.008)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

// Slightly different click for slider/toggle selection
function playToggle(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Two-part sound: soft thud + high click
  // Part 1: Low thud
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, now)
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.015)
  
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.02, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)
  
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.015)
  
  // Part 2: High click
  const clickBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.004, ctx.sampleRate)
  const clickData = clickBuffer.getChannelData(0)
  for (let i = 0; i < clickData.length; i++) {
    clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.001))
  }
  
  const clickSource = ctx.createBufferSource()
  clickSource.buffer = clickBuffer
  
  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 4000
  
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.018, now)
  
  clickSource.connect(highpass)
  highpass.connect(clickGain)
  clickGain.connect(ctx.destination)
  clickSource.start(now)
}

// Slide sound for animation mode changes
function playSlide(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Smooth whoosh with subtle pitch shift
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    const t = i / noiseData.length
    // Envelope that rises then falls
    const envelope = Math.sin(t * Math.PI) * 0.8
    noiseData[i] = (Math.random() * 2 - 1) * envelope
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  // Bandpass that sweeps
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(800, now)
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.03)
  filter.frequency.exponentialRampToValueAtTime(1200, now + 0.06)
  filter.Q.value = 2
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.012, now)
  gainNode.gain.linearRampToValueAtTime(0.015, now + 0.025)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

// Scrubber drag sound - subtle friction
function playScrub(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Very short textured sound
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.012, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004))
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2500
  filter.Q.value = 0.8
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.008, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.012)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

// Filmstrip frame selection - subtle tap
function playFilmstrip(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Light tap sound
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.006, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0015))
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 2000
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.015, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.006)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

// Paper flip sound - like turning a page
function playPageFlip(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  // Paper rustle - longer, textured noise
  const duration = 0.035 + Math.random() * 0.015 // Slight variation
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  
  for (let i = 0; i < noiseData.length; i++) {
    const t = i / noiseData.length
    // Paper-like envelope: quick attack, longer tail
    const envelope = t < 0.1 
      ? t * 10 
      : Math.exp(-(t - 0.1) * 8)
    // Add some crinkle texture
    const crinkle = Math.sin(i * 0.1) * 0.3 + 1
    noiseData[i] = (Math.random() * 2 - 1) * envelope * crinkle * 0.7
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  // Bandpass for paper-like quality
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(3000, now)
  filter.frequency.exponentialRampToValueAtTime(1500, now + duration)
  filter.Q.value = 0.5
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.02, now)
  gainNode.gain.linearRampToValueAtTime(0.025, now + 0.005)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

// Very soft sound for subtle interactions
function playSoft(ctx: AudioContext): void {
  const now = ctx.currentTime
  
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.005, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.001))
  }
  
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 3000
  
  const gainNode = ctx.createGain()
  gainNode.gain.setValueAtTime(0.01, now)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.005)
  
  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  noiseSource.start(now)
}

export function playSound(type: SoundType = 'click'): void {
  const ctx = getAudioContext()
  if (!ctx) return
  
  switch (type) {
    case 'click':
      playClick(ctx)
      break
    case 'toggle':
      playToggle(ctx)
      break
    case 'slide':
      playSlide(ctx)
      break
    case 'scrub':
      playScrub(ctx)
      break
    case 'filmstrip':
      playFilmstrip(ctx)
      break
    case 'pageFlip':
      playPageFlip(ctx)
      break
    case 'soft':
      playSoft(ctx)
      break
  }
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
