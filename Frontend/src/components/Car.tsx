import { useId, type SVGProps } from 'react'

/* ----------------------------------------------------------------------------
 * Car illustration
 * ------------------------------------------------------------------------- */

const carTones = {
  white: { top: '#ffffff', mid: '#f1f1f4', bottom: '#c9c9cf', trim: '#8e8e93', highlight: 0.9 },
  silver: { top: '#ececf0', mid: '#c4c4c9', bottom: '#86868b', trim: '#5a5a5e', highlight: 0.7 },
  black: { top: '#5c5c60', mid: '#2c2c2e', bottom: '#0e0e10', trim: '#000000', highlight: 0.2 },
}

export type CarTone = keyof typeof carTones

const carBody =
  'M24 118 C18 112 18 94 22 86 C26 80 40 76 60 74 L76 72 C94 56 114 41 136 37 C164 32 200 32 220 36 C240 40 258 56 274 66 C306 70 350 74 368 80 C380 86 382 100 380 110 C379 116 376 120 370 120 L340 120 A35 35 0 0 0 270 120 L130 120 A35 35 0 0 0 60 120 L30 120 C27 120 25 119 24 118 Z'
const carGlass = 'M84 69 C100 56 117 45 139 41 C165 37 195 37 216 41 C234 45 250 56 263 68 Z'
const seatPositions = [226, 150, 120]

function Wheel({ cx }: { cx: number }) {
  return (
    <g transform={`translate(${cx} 120)`}>
      <g>
        <circle r="27" fill="#1d1d1f" />
        <circle r="23.5" fill="none" stroke="#3a3a3c" strokeWidth="1.5" />
        <circle r="18" fill="#d1d1d6" />
        <circle r="18" fill="none" stroke="#f5f5f7" strokeWidth="1.5" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <path key={angle} d="M-2.6 -4 L-4 -16 L4 -16 L2.6 -4 Z" fill="#8e8e93" transform={`rotate(${angle})`} />
        ))}
        <circle r="5" fill="#636366" />
        <circle r="2" fill="#d1d1d6" />
      </g>
    </g>
  )
}

export function Car({
  tone = 'white',
  passengers = 1,
  ...svgProps
}: { tone?: CarTone; passengers?: number } & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const colors = carTones[tone]
  const id = (name: string) => `${uid}-${name}`

  return (
    <svg viewBox="10 26 380 134" overflow="visible" aria-hidden="true" {...svgProps}>
      <defs>
        <linearGradient id={id('body')} x1="0" y1="34" x2="0" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors.top} />
          <stop offset="0.55" stopColor={colors.mid} />
          <stop offset="1" stopColor={colors.bottom} />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="38" x2="0" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eef0f3" />
          <stop offset="1" stopColor="#b9bcc3" />
        </linearGradient>
        <radialGradient id={id('light')}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e5e5ea" />
        </radialGradient>
        <clipPath id={id('glass-clip')}>
          <path d={carGlass} />
        </clipPath>
        <filter id={id('shadow')} x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <ellipse cx="200" cy="148" rx="182" ry="7" fill="#000" opacity="0.22" filter={`url(#${id('shadow')})`} />

      {[95, 305].map((cx) => (
        <path key={cx} d={`M${cx - 35} 120 A35 35 0 0 1 ${cx + 35} 120 Z`} fill="#1d1d1f" />
      ))}

      <path d={carBody} fill={`url(#${id('body')})`} stroke={colors.trim} strokeOpacity="0.25" strokeWidth="1" />

      <path d={carGlass} fill={`url(#${id('glass')})`} stroke={colors.trim} strokeOpacity="0.5" strokeWidth="1.5" />
      <g clipPath={`url(#${id('glass-clip')})`}>
        {seatPositions.slice(0, passengers).map((x) => (
          <g key={x} fill="#3a3a3c">
            <circle cx={x} cy="56" r="8.5" />
            <ellipse cx={x} cy="72" rx="15" ry="9" />
          </g>
        ))}
        <path d="M114 70 L156 36 L170 36 L128 70 Z" fill="#fff" opacity="0.45" />
        <path d="M192 70 L226 36 L234 36 L200 70 Z" fill="#fff" opacity="0.3" />
      </g>
      <rect x="169" y="34" width="8" height="38" fill={`url(#${id('body')})`} />

      <path d="M30 86 C110 80 280 78 372 86" fill="none" stroke="#fff" strokeOpacity={colors.highlight} strokeWidth="2" />
      <g fill="none" stroke={colors.trim} strokeOpacity="0.35" strokeWidth="1.2">
        <path d="M104 72 L106 84" />
        <path d="M173 72 L173 118" />
        <path d="M262 68 L262 116" />
        <path d="M132 115 L268 115" />
        <path d="M352 111 L378 111" />
        <path d="M22 108 L50 108" />
      </g>
      <rect x="140" y="82" width="14" height="3.5" rx="1.75" fill={colors.trim} opacity="0.6" />
      <rect x="220" y="82" width="14" height="3.5" rx="1.75" fill={colors.trim} opacity="0.6" />

      <path
        d="M260 64 C261 58 272 57 275 62 L273 68 L262 68 Z"
        fill={`url(#${id('body')})`}
        stroke={colors.trim}
        strokeOpacity="0.4"
      />
      <path
        d="M360 83 C369 83 376 86 379 92 L363 93 C360 90 359 86 360 83 Z"
        fill={`url(#${id('light')})`}
        stroke={colors.trim}
        strokeOpacity="0.6"
      />
      <path d="M20 86 L34 85 C35 88 35 93 33 96 L19 96 C18 93 18 89 20 86 Z" fill="#3a3a3c" />

      <Wheel cx={95} />
      <Wheel cx={305} />
    </svg>
  )
}

/* ----------------------------------------------------------------------------
 * Car scene: cars parked on a road in front of a monochrome skyline
 * ------------------------------------------------------------------------- */

const groundY = 430
const wheelBaseY = 478
const farBuildings = [
  [0, 90, 150], [95, 60, 210], [160, 110, 120], [275, 70, 180], [350, 120, 140], [475, 55, 230], [535, 100, 160],
  [640, 80, 120], [725, 60, 200], [790, 130, 150], [925, 70, 240], [1000, 110, 130], [1115, 85, 190],
]
const nearBuildings = [[20, 130, 80], [160, 90, 110], [310, 160, 70], [690, 140, 95], [840, 70, 130], [920, 160, 75], [1090, 110, 105]]
const buildingWindows = nearBuildings.flatMap(([x, width, height]) => {
  const cells: [number, number][] = []
  for (let y = groundY - height + 14; y < groundY - 16; y += 20) {
    for (let wx = x + 12; wx < x + width - 14; wx += 18) cells.push([wx, y])
  }
  return cells
})
const trees = [128, 488, 640, 1070]

export type SceneCar = { tone: CarTone; passengers: number; x: number; width: number }

// The scene is cropped to its container (preserveAspectRatio slice), so cars should sit near the middle.
export function CarScene({
  cars,
  skyTop = '#fbfbfd',
  className = '',
}: {
  cars: SceneCar[]
  skyTop?: string
  className?: string
}) {
  const skyId = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-sky`

  return (
    <svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor="#ececf0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="560" fill={`url(#${skyId})`} />
      <circle cx="930" cy="160" r="90" fill="#e8e8ed" />

      <g fill="#e2e2e7">
        {farBuildings.map(([x, width, height]) => (
          <rect key={x} x={x} y={groundY - height} width={width} height={height} />
        ))}
      </g>
      <g fill="#d4d4d9">
        {nearBuildings.map(([x, width, height]) => (
          <rect key={x} x={x} y={groundY - height} width={width} height={height} rx="2" />
        ))}
        <rect x="265" y="260" width="36" height="170" />
        <path d="M265 260 L283 230 L301 260 Z" />
      </g>
      <circle cx="283" cy="286" r="8" fill="#fff" opacity="0.7" />
      <g fill="#fff" opacity="0.55">
        {buildingWindows.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="9" rx="1" />
        ))}
      </g>
      {trees.map((x) => (
        <g key={x}>
          <rect x={x - 2} y="398" width="4" height="32" fill="#bdbdc2" />
          <circle cx={x} cy="390" r="22" fill="#c9c9ce" />
        </g>
      ))}

      <rect y={groundY} width="1200" height="14" fill="#e5e5ea" />
      <rect y="444" width="1200" height="4" fill="#c7c7cc" />
      <rect y="448" width="1200" height="92" fill="#2c2c2e" />
      <g fill="#fff" opacity="0.7">
        {Array.from({ length: 8 }, (_, index) => (
          <rect key={index} x={index * 160 + 20} y="508" width="70" height="5" rx="2.5" />
        ))}
      </g>
      <rect y="540" width="1200" height="20" fill="#e5e5ea" />

      {cars.map((car) => (
        <Car
          key={car.x}
          tone={car.tone}
          passengers={car.passengers}
          x={car.x}
          y={wheelBaseY - (car.width * 121) / 380}
          width={car.width}
          height={(car.width * 134) / 380}
        />
      ))}
    </svg>
  )
}
