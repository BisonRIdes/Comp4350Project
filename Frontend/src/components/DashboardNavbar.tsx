import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { Icon } from './Icon'
import { icons } from './icons'
import { getUser, logout } from '../lib/auth'

const appLinks = [
  { to: '/post-ride', label: 'Post Ride' },
  { to: '/dashboard', label: 'Find Ride' },
  { to: '/map', label: 'Map' },
]

// Navbar for logged-in pages: logo, app links, and a profile menu.
export function DashboardNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const user = getUser()

  // Close the profile menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function signOut() {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/dashboard" className="font-serif text-2xl font-semibold tracking-tight text-ink">
          BisonRides
        </Link>

        <div className="flex items-center gap-1 sm:gap-6">
          <div className="flex items-center gap-1 text-[13px] sm:gap-2">
            {appLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors duration-300 ${
                    isActive ? 'bg-mist font-medium text-ink' : 'text-subtle hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-ink ring-1 ring-black/10 transition duration-300 ease-smooth hover:ring-black/30"
            >
              <Icon className="h-[18px] w-[18px]">{icons.user}</Icon>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl bg-white p-1.5 text-sm shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/10"
              >
                {user && (
                  <div className="mb-1 border-b border-black/5 px-3 pb-2.5 pt-2">
                    <p className="text-xs text-subtle">Signed in as</p>
                    <p className="truncate font-medium text-ink">{user.username}</p>
                  </div>
                )}
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-ink transition-colors duration-300 hover:bg-mist"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="block w-full rounded-xl px-3 py-2 text-left text-ink transition-colors duration-300 hover:bg-mist"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
