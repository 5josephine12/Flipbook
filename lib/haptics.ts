// Haptic feedback utilities using the Vibration API
// Provides tactile feedback on supported devices (primarily mobile)

type HapticPattern = 'light' | 'medium' | 'heavy' | 'tick' | 'success' | 'error' | 'selection'

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  tick: 5,
  success: [10, 50, 20],
  error: [50, 30, 50, 30, 50],
  selection: 15,
}

// Check if haptics are supported
export function supportsHaptics(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

// Trigger haptic feedback
export function haptic(pattern: HapticPattern = 'light'): void {
  if (!supportsHaptics()) return
  
  try {
    navigator.vibrate(PATTERNS[pattern])
  } catch {
    // Silently fail if vibration is blocked
  }
}

// Throttled haptic for continuous interactions (like scrubbing)
let lastHapticTime = 0
const HAPTIC_THROTTLE = 50 // ms between haptics

export function hapticThrottled(pattern: HapticPattern = 'tick'): void {
  const now = Date.now()
  if (now - lastHapticTime < HAPTIC_THROTTLE) return
  lastHapticTime = now
  haptic(pattern)
}

// Haptic feedback based on frame changes during playback
let lastFrameHaptic = -1

export function hapticOnFrameChange(frameIndex: number): void {
  if (frameIndex === lastFrameHaptic) return
  lastFrameHaptic = frameIndex
  hapticThrottled('tick')
}

// Reset frame haptic tracking (call when stopping playback)
export function resetFrameHaptic(): void {
  lastFrameHaptic = -1
}
