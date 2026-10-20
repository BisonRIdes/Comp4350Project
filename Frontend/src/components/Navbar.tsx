import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { navLinks } from './navLinks'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-20 border-b transition-[background-color,border-color] duration-500 ease-smooth ${
        scrolled ? 'border-black/5 bg-white/75 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-white'
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight text-ink">
          BisonRides
        </Link>
        <div className="hidden items-center gap-8 text-[13px] text-subtle md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors duration-300 hover:text-ink">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <Link to="/login" className="hidden text-subtle transition-colors duration-300 hover:text-ink sm:inline">
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-ink px-4 py-1.5 font-medium text-white transition duration-300 ease-smooth hover:bg-black active:scale-[0.97]"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  )
}
