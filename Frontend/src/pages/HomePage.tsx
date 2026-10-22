import { Link } from 'react-router'
import { CarScene, type CarTone } from '../components/Car'
import { Icon } from '../components/Icon'
import { icons } from '../components/icons'
import { Navbar } from '../components/Navbar'
import { navLinks } from '../components/navLinks'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { bentoTile, headingClass, hoverTile, primaryButton, secondaryButton } from '../styles'

/* ----------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------- */

const rides: { from: string; time: string; driver: string; seats: number; share: string; distance: string; tone: CarTone }[] = [
  { from: 'St. Vital', time: '8:05 AM', driver: 'Alex', seats: 2, share: '$3.50', distance: '1.2 km away', tone: 'white' },
  { from: 'Transcona', time: '7:40 AM', driver: 'Jordan', seats: 1, share: '$4.75', distance: '3.4 km away', tone: 'black' },
  { from: 'The Maples', time: '8:20 AM', driver: 'Maya', seats: 3, share: '$5.00', distance: '0.8 km away', tone: 'silver' },
]

const painPoints = [
  { title: 'Bussing', icon: icons.bus, points: ['Traffic is terrible', 'Buses are full', "Doesn't go directly to campus", 'Waiting outside in the cold'] },
  { title: 'Driving alone', icon: icons.car, points: ['Gas is so expensive', 'Bored driving alone', 'Driving is tiring'] },
]

const costSplit = [
  { people: 1, cost: 14 },
  { people: 2, cost: 7 },
  { people: 3, cost: 4.67 },
  { people: 4, cost: 3.5 },
]

const pickups = [
  { place: 'St. Vital Centre', time: '8:05 AM' },
  { place: "Bishop Grandin & St. Mary's", time: '8:12 AM' },
  { place: 'University of Manitoba', time: '8:30 AM' },
]

const smallFeatures = [
  { icon: icons.route, title: 'Post your route.', text: 'Drivers share their departure times and routes to campus.' },
  { icon: icons.hand, title: 'Request a ride.', text: 'Riders post requests for when and where they need a lift.' },
  { icon: icons.card, title: 'Flexible payments.', text: 'Pay your share of the trip securely through the app.' },
]

const benefits = [
  { icon: icons.wallet, title: 'Save money', text: 'Split the cost of your daily commute instead of covering it all yourself.' },
  { icon: icons.leaf, title: 'Cut emissions', text: 'Fewer cars making the same trip means less pollution every morning.' },
  { icon: icons.road, title: 'Ease traffic', text: 'Shared rides take cars off the road and make getting to campus easier.' },
]

const steps = [
  { title: 'Sign up', text: 'Create an account as a rider or a driver.' },
  { title: 'Post or find a ride', text: 'Drivers post their routes. Riders search or post a request.' },
  { title: 'Ride together', text: 'Confirm the details, split the cost, and head to campus.' },
]

function RideTile({ ride }: { ride: (typeof rides)[number] }) {
  return (
    <Link to="/signup" className={hoverTile}>
      <div className="relative overflow-hidden rounded-2xl">
        <CarScene
          cars={[{ tone: ride.tone, passengers: 4 - ride.seats, x: 310, width: 580 }]}
          className="block aspect-[4/3] w-full"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur">
          {ride.seats} {ride.seats === 1 ? 'seat' : 'seats'} left
        </span>
      </div>
      <div className="px-1 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-ink">{ride.from} → U of M</h3>
          <span className="shrink-0 rounded-lg bg-ink px-2 py-0.5 text-sm font-semibold text-white">{ride.share}</span>
        </div>
        <div className="mt-1 flex justify-between text-[15px] text-subtle">
          <p>Departs {ride.time}</p>
          <p>with {ride.driver}</p>
        </div>
        <p className="mt-1 text-sm text-neutral-400">{ride.distance}</p>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div id="top" className="min-h-svh bg-white text-ink">
      <Navbar />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-1.5 text-[13px] text-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              For University of Manitoba students
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className={`mx-auto mt-8 max-w-4xl text-[clamp(3.25rem,9vw,7rem)] leading-[0.95] ${headingClass}`}>
              The commute to campus, <em className="text-subtle">shared.</em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-subtle sm:text-xl">
              BisonRides connects students who need a ride with students already driving there. Riders get a better way
              to campus. Drivers split the cost of gas.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/signup" className={primaryButton}>
                Find a ride
                <Icon className="h-4 w-4">{icons.arrow}</Icon>
              </Link>
              <Link to="/signup" className={secondaryButton}>
                Offer a ride
              </Link>
            </div>
          </Reveal>
        </section>

        <section id="rides" className="bg-mist py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Rides" title="Heading to campus." text="A preview of what you'll find once you sign up." />
            <div className="-mx-3 mt-12 grid gap-2 sm:-mx-4 sm:grid-cols-2 lg:grid-cols-3">
              {rides.map((ride, index) => (
                <Reveal key={ride.from} delay={index * 100}>
                  <RideTile ride={ride} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <SectionHeading
            eyebrow="The problem"
            title={
              <>
                Getting to campus <em className="text-subtle">shouldn't</em> be this hard.
              </>
            }
          />
          <div className="mt-16 grid gap-12 border-t border-black/10 pt-12 md:grid-cols-2">
            {painPoints.map((group, index) => (
              <Reveal key={group.title} delay={index * 120}>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-subtle">{group.icon}</Icon>
                  <h3 className="text-xl font-semibold tracking-tight">{group.title}</h3>
                </div>
                <ul className="mt-6 space-y-4 text-lg text-subtle">
                  {group.points.map((point) => (
                    <li key={point} className="border-b border-black/5 pb-4">
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          <div className="mt-32 grid gap-4 md:grid-cols-2">
            <Reveal className="md:col-span-2">
              <h2 className={`mb-8 text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] ${headingClass}`}>
                So we brought them <em className="text-subtle">together.</em>
              </h2>
            </Reveal>
            <Reveal>
              <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-mist p-8 sm:p-10">
                <p className="text-sm font-medium text-subtle">For riders</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Instead of bussing</h3>
                <ul className="mt-6 space-y-3 text-lg text-subtle">
                  <li>Get a ride straight to campus</li>
                  <li>Pay a fraction of the price of gas</li>
                  <li>Save time on your commute</li>
                </ul>
                <div className="mt-auto pt-8">
                  <CarScene
                    cars={[{ tone: 'white', passengers: 3, x: 330, width: 540 }]}
                    className="block aspect-[16/9] w-full rounded-2xl"
                  />
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-10">
                <p className="text-sm font-medium text-neutral-400">For drivers</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Instead of driving alone</h3>
                <ul className="mt-6 space-y-3 text-lg text-neutral-400">
                  <li>Have part of your gas paid for</li>
                  <li>Meet people who also go to UM</li>
                </ul>
                <div className="mt-auto pt-8">
                  <CarScene
                    cars={[{ tone: 'silver', passengers: 1, x: 330, width: 540 }]}
                    className="block aspect-[16/9] w-full rounded-2xl"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="features" className="bg-mist py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Features" title="Everything you need to share the ride." />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <div className={bentoTile}>
                  <h3 className="text-2xl font-semibold tracking-tight">Fill the car, pay less.</h3>
                  <p className="mt-2 max-w-md text-subtle">
                    The more people in one car, the less each person pays. Here's a $14 trip split between riders.
                  </p>
                  <div className="mt-8 space-y-3">
                    {costSplit.map((row) => (
                      <div key={row.people} className="flex items-center gap-4 text-sm">
                        <span className="w-20 shrink-0 text-subtle">
                          {row.people} {row.people === 1 ? 'person' : 'people'}
                        </span>
                        <div className="h-3 flex-1 rounded-full bg-mist">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${(row.cost / 14) * 100}%` }} />
                        </div>
                        <span className="w-14 shrink-0 text-right font-semibold tabular-nums">${row.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className={bentoTile}>
                  <h3 className="text-2xl font-semibold tracking-tight">Coordinate directly.</h3>
                  <p className="mt-2 text-subtle">Message drivers to ask for detours or accommodations.</p>
                  <div className="mt-8 space-y-2 text-sm">
                    <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-mist px-4 py-2.5">
                      Could you pick me up at Bishop Grandin?
                    </p>
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">
                      Sure, it's on my way.
                    </p>
                  </div>
                </div>
              </Reveal>

              {smallFeatures.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 100}>
                  <div className={bentoTile}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist transition-colors duration-500 ease-smooth group-hover:bg-ink group-hover:text-white">
                      <Icon>{feature.icon}</Icon>
                    </span>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-2 text-subtle">{feature.text}</p>
                  </div>
                </Reveal>
              ))}

              <Reveal className="lg:col-span-3">
                <div className={`${bentoTile} grid items-center gap-8 md:grid-cols-2`}>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pickups along the way.</h3>
                    <p className="mt-3 max-w-sm text-subtle">
                      Find rides that pass near you, and hop on at a stop that works for you.
                    </p>
                  </div>
                  <ol className="rounded-2xl bg-mist p-6">
                    {pickups.map((stop, index) => {
                      const last = index === pickups.length - 1
                      return (
                        <li key={stop.place} className="relative flex gap-4 pb-6 last:pb-0">
                          {!last && (
                            <span className="absolute left-[7px] top-5 h-[calc(100%-12px)] border-l-2 border-dashed border-black/15" />
                          )}
                          <span
                            className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-ink ${last ? 'bg-ink' : 'bg-white'}`}
                          />
                          <div className="flex flex-1 justify-between gap-4">
                            <p className="font-medium">{stop.place}</p>
                            <p className="shrink-0 text-subtle tabular-nums">{stop.time}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="why" className="bg-ink py-24 text-white sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-3xl">
              <p className="text-sm font-medium text-neutral-400">Why BisonRides</p>
              <h2 className="mt-3 font-serif text-[clamp(2.5rem,5.5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
                Better for you. <em className="text-neutral-400">Better for Winnipeg.</em>
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-12 md:grid-cols-3">
              {benefits.map((benefit, index) => (
                <Reveal key={benefit.title} delay={index * 120} className="border-t border-white/15 pt-8">
                  <Icon className="h-7 w-7 text-neutral-400">{benefit.icon}</Icon>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{benefit.title}</h3>
                  <p className="mt-2 leading-relaxed text-neutral-400">{benefit.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <SectionHeading eyebrow="How it works" title="On the road in three steps." />
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 120} className="border-t border-black/10 pt-8">
                <span className="font-serif text-6xl font-semibold text-neutral-300">0{index + 1}</span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-subtle">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-mist px-6 pt-24 text-center sm:pt-32">
              <h2 className={`text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] ${headingClass}`}>
                Ready to share <em className="text-subtle">the ride?</em>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg text-subtle">
                Join other UM students making the commute cheaper, faster, and a lot less lonely.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/signup" className={primaryButton}>
                  Get started
                  <Icon className="h-4 w-4">{icons.arrow}</Icon>
                </Link>
                <a href="#how" className={secondaryButton}>
                  Learn more
                  <Icon className="h-4 w-4">{icons.chevron}</Icon>
                </a>
              </div>
              <CarScene
                cars={[
                  { tone: 'silver', passengers: 1, x: 170, width: 270 },
                  { tone: 'black', passengers: 2, x: 465, width: 270 },
                  { tone: 'white', passengers: 3, x: 760, width: 270 },
                ]}
                skyTop="#f5f5f7"
                className="-mx-6 mt-16 block aspect-[2/1] w-[calc(100%+3rem)] sm:aspect-[12/5]"
              />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
        <a href="#top" className="font-serif text-xl font-semibold text-ink">
          BisonRides
        </a>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-subtle">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors duration-300 hover:text-ink">
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
