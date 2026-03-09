// Linear interpolation for smooth transitions
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

// Clamp a value between min and max
export function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(Math.max(value, min), max)
}

// Gaussian falloff for smooth proximity effects
// Returns a value from 0 to 1 based on distance, with smooth bell curve falloff
export function transformGaussian(
  distance: number,
  sigma: number = 80 // Controls width of the bell curve
): number {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma))
}

// Transform rotation based on distance with direction
// Returns rotation in degrees - items to the left rotate one way, to the right the other
export function transformRotation(
  distance: number,
  intensity: number = 85,
  sigma: number = 100
): number {
  // Gaussian falloff but preserving direction
  const gaussian = Math.exp(-(distance * distance) / (2 * sigma * sigma))
  // Direction: negative distance = rotate negative, positive = rotate positive
  const direction = distance > 0 ? 1 : -1
  // Invert: items far away rotate more, center stays flat
  return direction * intensity * (1 - gaussian)
}

// Transform scale based on distance with smooth falloff
export function transformScale(
  distance: number,
  initialValue: number,
  baseValue: number,
  intensity: number,
  distanceLimit: number = 100
): number {
  if (Math.abs(distance) > distanceLimit) {
    return initialValue
  }
  const normalizedDistance = initialValue - Math.abs(distance) / distanceLimit
  const scaleFactor = normalizedDistance * normalizedDistance
  return baseValue + intensity * scaleFactor
}
