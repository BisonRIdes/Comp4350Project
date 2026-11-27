// Distinct colours for rides shown together, so each card in the list matches its route on the map
// and no two active rides ever share the same (or nearly identical) colour.

// Turns an id into a non-negative integer; the same id always gives the same number.
function hash(text: string) {
  let value = 0
  for (const char of text) value = (Math.imul(value, 31) + char.charCodeAt(0)) | 0
  return Math.abs(value)
}

// Shortest distance around the 360° hue wheel.
function hueDistance(a: number, b: number) {
  const diff = Math.abs(a - b)
  return Math.min(diff, 360 - diff)
}

const LIGHTNESS_STEPS = [42, 32, 52]
const SATURATION_STEPS = [70, 85, 55]

// Assigns a unique colour to every ride id in `rideIds`, ensuring no two rides on screen at the
// same time get the same colour (and keeping hues spaced apart so colours stay easy to tell apart).
export function rideColors(rideIds: readonly string[]): Map<string, string> {
  const uniqueIds = [...new Set(rideIds)].sort()
  const colors = new Map<string, string>()
  const usedColors = new Set<string>()
  const usedHues: number[] = []

  // Keep hues at least up to 25° apart when there's room around the 360° wheel.
  const minHueGap = Math.min(25, Math.floor(240 / Math.max(uniqueIds.length, 1)))

  for (const id of uniqueIds) {
    const baseHue = (hash(id) * 137.508) % 360
    let chosenHue = Math.round(baseHue) % 360

    // Step by the golden angle if another active ride already took a nearby hue.
    for (let attempt = 0; attempt < 36; attempt++) {
      const candidate = Math.round(baseHue + attempt * 137.508) % 360
      if (usedHues.every((used) => hueDistance(used, candidate) >= minHueGap)) {
        chosenHue = candidate
        break
      }
    }

    // Guarantee exact colour uniqueness even if hundreds of rides are displayed at once.
    let step = 0
    let color = `hsl(${chosenHue} 70% 42%)`
    while (usedColors.has(color)) {
      step++
      const hue = (chosenHue + step) % 360
      const lightness = LIGHTNESS_STEPS[Math.floor(step / 360) % LIGHTNESS_STEPS.length]
      const saturation = SATURATION_STEPS[Math.floor(step / (360 * LIGHTNESS_STEPS.length)) % SATURATION_STEPS.length]
      color = `hsl(${hue} ${saturation}% ${lightness}%)`
      if (step > 3600) {
        // Fallback that can never collide.
        color = `hsl(${hue} 70% ${42 + step * 0.001}%)`
      }
    }

    usedHues.push(chosenHue)
    usedColors.add(color)
    colors.set(id, color)
  }

  return colors
}
