import type { ReactNode } from 'react'
import { headingClass } from '../styles'
import { Reveal } from './Reveal'

export function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text?: string }) {
  return (
    <Reveal className="max-w-3xl">
      <p className="text-sm font-medium text-subtle">{eyebrow}</p>
      <h2 className={`mt-3 text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] ${headingClass}`}>{title}</h2>
      {text && <p className="mt-5 max-w-xl text-lg leading-relaxed text-subtle">{text}</p>}
    </Reveal>
  )
}
