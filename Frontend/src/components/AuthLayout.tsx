import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { headingClass } from '../styles'
import { CarScene, type SceneCar } from './Car'
import { Reveal } from './Reveal'

type AuthLayoutProps = {
  title: ReactNode
  subtitle: string
  children: ReactNode
  footer: ReactNode
  panelTitle: ReactNode
  panelText: string
  panelCars: SceneCar[]
}

// Split layout shared by the log in and sign up pages: form on the left, illustrated panel on the right.
export function AuthLayout({ title, subtitle, children, footer, panelTitle, panelText, panelCars }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh bg-white text-ink lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
          BisonRides
        </Link>

        <div className="flex flex-1 items-start justify-center py-12 sm:items-center">
          <div className="w-full max-w-sm">
            <Reveal>
              <h1 className={`text-[clamp(2.5rem,5vw,3.25rem)] leading-[1.02] ${headingClass}`}>{title}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-subtle">{subtitle}</p>
            </Reveal>
            <Reveal delay={100} className="mt-10">
              {children}
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-8 text-center text-sm text-subtle">{footer}</p>
            </Reveal>
          </div>
        </div>
      </div>

      <div className="hidden p-4 lg:block">
        <div className="sticky top-4 flex h-[calc(100svh-2rem)] flex-col overflow-hidden rounded-[2rem] bg-mist">
          <Reveal delay={150} className="px-12 pt-16">
            <h2 className={`max-w-md text-5xl leading-[1.02] ${headingClass}`}>{panelTitle}</h2>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-subtle">{panelText}</p>
          </Reveal>
          <CarScene cars={panelCars} skyTop="#f5f5f7" className="mt-auto block aspect-[5/4] min-h-0 w-full" />
        </div>
      </div>
    </div>
  )
}
