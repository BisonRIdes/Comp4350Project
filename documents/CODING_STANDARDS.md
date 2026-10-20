# Coding Standards

These standards apply to everyone working on BisonRides.

For branches, commits, pull requests and CI, see [GIT_STANDARDS.md](GIT_STANDARDS.md).

## Contents

1. [Tech stack](#1-tech-stack)
2. [General rules](#2-general-rules)
3. [SOLID principles](#3-solid-principles)
4. [Naming conventions](#4-naming-conventions)
5. [Formatting: line length, braces, spacing](#5-formatting)
6. [Comments](#6-comments)
7. [Access modifiers and encapsulation](#7-access-modifiers-and-encapsulation)
8. [Immutability and `final`](#8-immutability-and-final)
9. [Magic values, hardcoded values and constants](#9-magic-values-hardcoded-values-and-constants)
10. [Functions and methods](#10-functions-and-methods)
11. [Return statements](#11-return-statements)
12. [Conditionals: if-else vs match/switch, and `break`](#12-conditionals)
13. [Nested code](#13-nested-code)
14. [Boolean expressions](#14-boolean-expressions)
15. [Mathematical expressions and calculations](#15-mathematical-expressions-and-calculations)
16. [Class and component member order](#16-class-and-component-member-order)
17. [Error handling](#17-error-handling)
18. [Dependency management](#18-dependency-management)
19. [Changing these standards](#19-changing-these-standards)

---

## 1. Tech stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React, TypeScript, Vite, Leaflet | Vercel |
| Backend | Python, FastAPI (REST), SQLAlchemy, Pydantic | Render (Docker image) |
| Database | PostgreSQL | Supabase |
| Local unit tests | SQLite (in memory), pytest | Local and CI |
| Containers | Docker, Docker Compose for local development | |

## 2. General rules

- Plan before coding. Talk through the approach on Discord or in the issue first.
- Follow SOLID (see section 3). Keep functions small and focused on one job.
- Name things clearly. A good name beats a comment.
- Comment non-obvious code. Explain why, not what.
- No dead code, commented-out code, or leftover debug prints (`print`, `console.log`).
- Never hardcode secrets. Read them from environment variables.
- Leave code a little cleaner than you found it, but keep unrelated cleanup out of feature PRs.
- Let tools settle style. If `black`, `ruff`, ESLint or Prettier format it a certain way, that way is correct.

## 3. SOLID principles

### S: Single Responsibility

A module, class or function has one reason to change.

- Routes handle HTTP. Services hold business rules. Repositories talk to the database.
- Pricing, matching and seat counting each get their own module.

```python
# Bad: one function validates, prices, saves and emails
def book_ride(request): ...


# Good: each piece has one job, and the service coordinates them
def book_ride(ride_id: UUID, rider: User, db: Session) -> Booking:
    ride = ride_repository.get_for_update(db, ride_id)
    seat_rules.ensure_seat_available(ride)
    fare_cents = pricing.calculate_fare_cents(ride.distance_km)
    booking = booking_repository.create(db, ride, rider, fare_cents)
    notifications.send_booking_confirmation(booking)
    return booking
```

### O: Open/Closed

Code is open to extension and closed to modification. Add new behaviour by adding code, not by editing a growing `if` chain.

- Example: each notification channel (email via Resend, SMS via Twilio) implements a `Notifier` interface. A new channel is a new class, not a new branch in `send()`.

### L: Liskov Substitution

A subclass or implementation must work anywhere its parent or interface is expected.

- A `FakeNotifier` used in tests must accept the same inputs and return the same types as the real one.
- Do not override a method only to raise `NotImplementedError`.

### I: Interface Segregation

Keep interfaces small. No one should depend on methods they do not use.

- Prefer `RouteDistanceProvider` with one method over a large `MapsService` with ten.
- React components take only the props they need. Do not pass a whole `ride` object when the component only shows `departureTime`.

### D: Dependency Inversion

High-level code depends on abstractions, not concrete services.

- Inject dependencies with FastAPI `Depends` (database session, current user, external clients).
- The matching module takes plain data and functions. It does not import FastAPI, SQLAlchemy or the OpenRouteService client.

## 4. Naming conventions

| Thing | Python | TypeScript / React |
|---|---|---|
| Variables | `snake_case` | `camelCase` |
| Functions and methods | `snake_case`, start with a verb | `camelCase`, start with a verb |
| Constants | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| Classes | `PascalCase` | `PascalCase` |
| Types and interfaces | `PascalCase` | `PascalCase`, no `I` prefix |
| React components | n/a | `PascalCase` |
| React hooks | n/a | `useCamelCase` |
| Enums | `PascalCase` class, `UPPER_SNAKE_CASE` members | `PascalCase` type, string literal union preferred |
| Files and modules | `snake_case.py` | Components `PascalCase.tsx`, everything else `camelCase.ts` |
| Test files | `test_<module>.py` | `<Name>.test.ts(x)` |
| Private members | `_leading_underscore` | `private` keyword or not exported |
| DB tables and columns | `snake_case`, tables plural | n/a |
| URL paths | lowercase `kebab-case`, plural nouns | n/a |
| JSON fields | `camelCase` | `camelCase` |

Rules:

- Functions are verbs (`calculate_fare`, `fetchRides`). Variables and classes are nouns (`ride`, `BookingService`).
- Booleans read as a question: `is_full`, `has_paid`, `can_cancel`, `isLoading`.
- Collections are plural: `rides`, `bookingIds`.
- Put units in names when a number has units: `distance_km`, `duration_seconds`, `fare_cents`, `max_detour_minutes`.
- No unclear abbreviations. `ride_count`, not `rc`. Accepted short forms: `id`, `url`, `db`, `api`, `jwt`, `lat`, `lng`.
- Loop variables can be short only in very short loops (`for i in range(3)`). Otherwise use a real name: `for ride in rides`.
- Event handlers in React: `handleX` for the function, `onX` for the prop (`onSubmit={handleSubmit}`).

## 5. Formatting

### Line length

- Python: 100 characters.
- TypeScript: 100 characters.
- Long strings: split them with implicit concatenation (Python) or template literals (TS) instead of going over the limit.
- URLs in comments may go over the limit.

### Braces (TypeScript)

- Always use braces for `if`, `else`, `for` and `while`, even for one-line bodies.
- Opening brace goes on the same line (K&R style).
- `else` goes on the same line as the closing brace.

```ts
// Bad
if (!ride) return null;
if (isFull)
  showWarning();

// Good
if (!ride) {
  return null;
}
if (isFull) {
  showWarning();
} else {
  enableBooking();
}
```

Python has no braces. For brackets, when a call does not fit on one line, put one argument per line and add a trailing comma.

```python
booking = Booking(
    ride_id=ride.id,
    rider_id=rider.id,
    fare_cents=fare_cents,
)
```

### Vertical spacing

- Python: 2 blank lines between top-level functions and classes, 1 blank line between methods.
- TypeScript: 1 blank line between functions, components and class members.
- Inside a function, use single blank lines to separate logical steps (fetch, validate, compute, save). Never use 2 or more blank lines in a row inside a function.
- No blank line right after an opening brace or `def` line, or right before a closing brace.
- Group related lines together. Keep a variable's declaration close to where it is first used.
- Every file ends with exactly one newline.

### Whitespace micro-rules

- One space on each side of binary and comparison operators: `a + b`, `x == y`, `total = price * qty`.
- No space inside parentheses or brackets: `f(x)`, not `f( x )`; `items[0]`, not `items[ 0 ]`.
- One space after a comma, none before it: `f(a, b)`.
- No space between a function name and its opening parenthesis: `calculate(x)`.
- TS: one space after control keywords: `if (`, `for (`, `while (`, `switch (`.
- TS: spaces inside object braces and around the arrow: `{ lat, lng }`, `(x) => x * 2`.
- Python keyword arguments and defaults have no spaces around `=`: `f(limit=20)`, `def f(limit=20)`.
- Python annotated defaults do have spaces: `def f(limit: int = 20)`.
- Python: one space after the colon in annotations and dicts, none before: `seats: int`, `{"a": 1}`.
- Unary operators stick to their operand: `-x`, `!isFull`, `not is_full`.
- No trailing whitespace anywhere.

## 6. Comments

### Block and inline comments

Comments explain why. The code already shows what.

```python
# Bad: repeats the code
# add 1 to seats_taken
seats_taken += 1

# Bad: outdated, the limit is now 15
# max detour is 10 minutes
if detour_minutes > MAX_DETOUR_MINUTES:

# Bad: commented-out code. Git remembers it, so delete it.
# old_price = distance * 0.4

# Good: explains a decision that is not obvious from the code
# Round to 2 decimal places (about 1 km) so a rider's exact pickup point
# is not exposed before a driver accepts the request.
rounded = round_coordinate(lat, PUBLIC_COORDINATE_PRECISION)

# Good: warns about a non-obvious constraint
# SQLite ignores FOR UPDATE, so tests do not cover this lock.
# The integration test in tests/integration/test_booking_race.py does.
```

- Write comments as full sentences on their own line above the code.
- Use inline (end-of-line) comments rarely, and only for short notes.
- If you need a comment to explain what a block does, try extracting it into a well-named function first.
- Update or delete comments when you change the code they describe.

### Function and method comments

Python: every public function, class and module gets a docstring. Use Google style.

```python
def calculate_fare_cents(distance_km: float, seats: int) -> int:
    """Calculate the total fare for a booking.

    Args:
        distance_km: Driving distance of the rider's segment.
        seats: Number of seats booked. Must be at least 1.

    Returns:
        Total fare in cents, rounded to the nearest cent.

    Raises:
        ValueError: If seats is less than 1.
    """
```

- Private helpers (`_name`) need a docstring only if they are not obvious.
- Do not repeat the type hints in the docstring.

TypeScript: exported functions, hooks and non-trivial components get a TSDoc comment.

```ts
/**
 * Fetches open rides near a point, sorted by departure time.
 * @throws ApiError when the request fails.
 */
export async function fetchNearbyRides(point: LatLng, radiusKm: number): Promise<Ride[]> {
```

### TODO comments

- Format: `TODO(#issue-number): what needs doing`.
- Every TODO links to an open GitHub issue. A TODO without an issue gets lost.
- No `FIXME`, `HACK` or `XXX`. If something is broken, open an issue and add a TODO that links to it.
- Do not merge a TODO into `main` for something that blocks correctness or security.

```python
# Bad
# TODO fix this later

# Good
# TODO(#48): Replace straight-line distance with OpenRouteService distance.
```

## 7. Access modifiers and encapsulation

Python has no real access modifiers, so we use naming:

- `name`: public, part of the module or class API.
- `_name`: private to the module or class. Do not import or access it from outside, including from tests where possible.
- Do not use `__name` (name mangling) unless you need to avoid a clash in a subclass.
- Expose only what callers need. Keep helpers private.

TypeScript:

- Not exporting something is the main way to keep it private to a module.
- In classes, mark members `private` unless they need to be used outside. Use `protected` only if a subclass needs it.
- Do not use `public` explicitly; it is the default.
- Mark class fields `readonly` when they are not reassigned after construction.

## 8. Immutability and `final`

Default to values that do not change. Mutate only when there is a clear reason.

Python:

- Mark module constants with `Final`: `MAX_SEATS_PER_RIDE: Final = 7`.
- Use tuples or `frozenset` for fixed collections, not lists.
- Use `@dataclass(frozen=True)` or Pydantic `model_config = ConfigDict(frozen=True)` for value objects (coordinates, fare breakdowns, match results).
- Never use a mutable default argument.

```python
# Bad: the same list is shared across calls
def add_stop(stop: Stop, stops: list[Stop] = []) -> list[Stop]:

# Good
def add_stop(stop: Stop, stops: list[Stop] | None = None) -> list[Stop]:
    stops = [] if stops is None else stops
```

- Prefer returning a new value to changing an argument in place. If a function does mutate its input, say so in the name or docstring.

TypeScript:

- Use `const` by default. Use `let` only when the variable is reassigned. Never use `var`.
- Mark props types and fixed data `readonly` (`readonly Ride[]`, `Readonly<Props>`).
- Use `as const` for fixed lookup objects and literal arrays.
- Never mutate React state or props. Create a new object or array instead.

```ts
// Bad
rides.push(newRide);
setRides(rides);

// Good
setRides((prev) => [...prev, newRide]);
```

## 9. Magic values, hardcoded values and constants

A magic value is a literal number or string whose meaning is not obvious. Name it.

```python
# Bad
if detour > 15 and ride.seats_left < 8:

# Good
if detour_minutes > MAX_DETOUR_MINUTES and ride.seats_left <= MAX_SEATS_PER_RIDE:
```

- Fine without a name: `0`, `1`, `-1`, `""`, `True`/`False` when the meaning is obvious (`index + 1`, `count == 0`).
- Business rules (max seats, max detour, booking cutoff, rounding precision, page size) go in `app/core/constants.py` or `src/constants.ts`.
- Status values use enums, never raw strings: `RideStatus.OPEN`, not `"open"`.
- The same value is defined once. If the frontend and backend both need it, the backend owns it and exposes it through the API if needed.

Hardcoded values that depend on the environment never go in code:

- URLs, ports, hostnames, the Supabase URL, the API base URL, CORS origins, API keys, JWT secrets, Stripe keys.
- Backend: read them through one `Settings` class (`pydantic-settings`) in `app/core/config.py`. Nothing else reads `os.environ`.
- Frontend: read them from `import.meta.env.VITE_*` in one file (`src/config.ts`). Only public values go in frontend env vars, because everything in the frontend bundle is visible to users.
- Every variable is listed in `.env.example` with a fake value.

## 10. Functions and methods

- One job per function. If you need "and" to describe it, split it.
- Aim for under about 30 lines. Longer is a smell, not a hard rule.
- At most 4 parameters. Beyond that, pass a dataclass, Pydantic model or options object.
- Use keyword-only arguments in Python (`*`) when the meaning of a value is not clear at the call site.
- Avoid boolean flag parameters. Two clear functions are better than one with `is_admin=True`.

```python
# Bad: what does True mean?
get_rides(user, True)

# Good
get_rides(user, include_cancelled=True)  # keyword-only
get_cancelled_rides(user)  # or a separate function
```

- Functions that look like getters (`get_x`, `is_x`) must not have side effects.
- Business logic (matching, pricing, seat counts) is written as pure functions where possible: same input, same output, no I/O.
- Type hints on every Python parameter and return value. Explicit return types on every exported TypeScript function.

## 11. Return statements

- Use guard clauses: handle invalid cases first and return early.
- Do not use `else` after a `return`.
- A function always returns the same type. If it can return nothing, make that explicit (`-> Ride | None`, `Ride | undefined`).
- A function that returns a value on one path returns a value on every path. No implicit `None`.
- Return boolean expressions directly.
- Do not return error codes or `None` to signal failure in services. Raise a domain exception (see section 17).

```python
# Bad
def can_book(ride: Ride, seats: int) -> bool:
    if ride.status == RideStatus.OPEN:
        if ride.seats_left >= seats:
            return True
        else:
            return False
    else:
        return False


# Good
def can_book(ride: Ride, seats: int) -> bool:
    return ride.status == RideStatus.OPEN and ride.seats_left >= seats
```

## 12. Conditionals

### If-else vs match/switch

- Use `if`/`elif`/`else` for ranges, mixed conditions, or 1 to 2 branches.
- Use `match` (Python) or `switch` (TypeScript) when branching on one value, such as an enum or status, with 3 or more cases.
- Use a lookup dict or object when each case only maps to a value.

```python
# Lookup instead of branches
STATUS_LABELS: Final = {
    BookingStatus.PENDING: "Waiting for driver",
    BookingStatus.ACCEPTED: "Confirmed",
    BookingStatus.CANCELLED: "Cancelled",
}
```

- Every `match` has a `case _:` that raises for unknown values.
- Every TypeScript `switch` on a union type has an exhaustive `default` that fails to compile when a new value is added.

```ts
switch (booking.status) {
  case "pending":
    return <PendingBadge />;
  case "accepted":
    return <AcceptedBadge />;
  case "cancelled":
    return <CancelledBadge />;
  default: {
    const unhandled: never = booking.status;
    throw new Error(`Unhandled status: ${unhandled}`);
  }
}
```

### Break statements

- In a TypeScript `switch`, every case ends with `return`, `break` or `throw`. No fall-through, except for empty cases grouped together.
- In loops, use `break` and `continue` only when they make the loop clearer. Prefer built-ins that say what you mean: `any()`, `all()`, `next()` in Python; `find`, `some`, `every` in TypeScript.
- No labelled breaks.
- No `while True` without an obvious exit condition near the top of the loop.

```python
# Instead of a loop with a flag and break
first_open_ride = next((r for r in rides if r.status == RideStatus.OPEN), None)
```

## 13. Nested code

- Maximum 3 levels of nesting inside a function. Deeper code gets refactored.
- Flatten with guard clauses, early `continue`, and extracted helper functions.
- No nested ternaries. Use `if` statements or a lookup.
- Python comprehensions: at most one `for` and one `if`. Anything more becomes a loop or a helper.
- React: avoid deeply nested JSX conditionals. Return early for loading, error and empty states, or extract a subcomponent.

```python
# Bad
for ride in rides:
    if ride.status == RideStatus.OPEN:
        if ride.seats_left > 0:
            if within_detour(ride, pickup):
                matches.append(ride)

# Good
for ride in rides:
    if not is_bookable(ride):
        continue
    if within_detour(ride, pickup):
        matches.append(ride)
```

## 14. Boolean expressions

- Do not compare to `True` or `False`: `if is_full:`, not `if is_full == True:`.
- Python: compare to `None` with `is` / `is not`.
- TypeScript: always use `===` and `!==`. Never `==` or `!=`.
- Be careful with truthiness when `0` or `""` is a valid value. `seats_left = 0` is falsy.

```python
# Bad: treats 0 seats like a missing value
if not ride.seats_left:

# Good
if ride.seats_left == 0:
```

```ts
// Bad: replaces a valid 0 with the default
const seats = input.seats || 1;

// Good
const seats = input.seats ?? 1;
```

- Name complex conditions instead of writing them inline.

```python
is_departing_soon = ride.departure_time - now < BOOKING_CUTOFF
has_free_seat = ride.seats_left >= requested_seats
if is_departing_soon or not has_free_seat:
    raise BookingNotAllowedError(...)
```

- Avoid double negatives: `is_enabled`, not `is_not_disabled`.
- Use parentheses when mixing `and` and `or` (`&&` and `||`), even if precedence would work without them.

## 15. Mathematical expressions and calculations

- Money is stored and calculated as integer cents (`fare_cents: int`). Never use `float` for money. Stripe also uses cents.
- If a calculation needs fractions of a cent, use `Decimal` and round once at the end with a documented rounding rule.
- Distances in kilometres (`float`), durations in seconds or minutes (`int`). Put the unit in the name.
- Coordinates are `float`. All rounding of rider locations goes through one helper function.
- Never compare floats with `==`. Use `math.isclose()` or compare with a tolerance.
- Use `//` for integer division in Python on purpose, and `/` only when you want a float.
- Add parentheses when mixing operators so the order is clear to readers: `(base_fare + distance_km * RATE_PER_KM) * seats`.
- Break long formulas into named steps.

```python
# Bad
total = int(round((250 + d * 45) * s * 1.05))

# Good
per_seat_cents = BASE_FARE_CENTS + distance_km * RATE_PER_KM_CENTS
subtotal_cents = per_seat_cents * seats
total_cents = round(subtotal_cents * (1 + SERVICE_FEE_RATE))
```

- Dates and times are timezone-aware and stored in UTC. Convert to local time only in the frontend for display.
- Use library functions for maths you would otherwise write by hand (distance between coordinates, rounding). Put any custom formula (for example haversine) in one tested function.

## 16. Class and component member order

Python classes:

1. Docstring
2. Class constants
3. Class-level attributes or fields (dataclass and Pydantic fields)
4. `__init__`, then other dunder methods (`__repr__`, `__eq__`)
5. Class methods and static methods (factories such as `from_row`)
6. Properties
7. Public methods
8. Private methods (`_name`)

SQLAlchemy models:

1. `__tablename__` and `__table_args__` (constraints, indexes)
2. Primary key
3. Foreign keys
4. Other columns
5. `created_at`, `updated_at`
6. Relationships
7. Methods (keep these few; logic belongs in services)

TypeScript classes:

1. Static readonly constants
2. Readonly fields
3. Other fields
4. Constructor
5. Public methods
6. Private methods

React components:

1. Props type, declared above the component
2. Hooks: state, refs, context, custom hooks
3. Effects
4. Derived values
5. Event handlers
6. Early returns for loading, error and empty states
7. The main JSX `return`

## 17. Error handling

### Backend

- Services raise domain exceptions that describe the problem: `RideNotFoundError`, `RideFullError`, `BookingNotAllowedError`. They all inherit from one base `AppError`.
- Services never raise `HTTPException` and never know about status codes.
- One place in `app/main.py` turns domain exceptions into HTTP responses with the standard error shape shown below.

```python
class AppError(Exception):
    status_code: int = 500
    code: str = "INTERNAL_ERROR"


class RideFullError(AppError):
    status_code = 409
    code = "RIDE_FULL"


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": str(exc)}},
    )
```

- Never use a bare `except:`. Do not catch `Exception` unless you log it and re-raise or turn it into a clear error.
- Catch the most specific exception you can, as close to its cause as you can.
- Never swallow an error silently (`except: pass`).
- Unexpected errors return `500` with a generic message. Stack traces and SQL never reach the client. They go to the logs.
- Database writes run in a transaction. If anything fails, roll back.
- Calls to external services (OpenRouteService, Stripe, Resend, Twilio) have a timeout and are wrapped so their errors become our own exception types.
- Do not use exceptions for normal control flow (for example, checking whether a key exists).

### Frontend

- The `api/` layer throws a typed `ApiError` with `status`, `code` and `message` from the response body.
- Components never call `fetch` directly and never read raw responses.
- Every screen handles loading, empty and error states.
- Show users a friendly message based on the error `code`. Never show raw server messages or stack traces.
- An error boundary at the app root catches render errors.
- Never leave a promise without handling its rejection. No empty `catch {}` blocks.

## 18. Dependency management

- Adding a dependency needs a reason in the PR description. Check that it is maintained, widely used, has a compatible license, and that we cannot do the same thing in a few lines ourselves.
- Remove dependencies you stop using.
- Keep dependencies updated.

## 19. Changing these standards

Anyone can propose a change by opening a PR on this file. We decide by team vote. Review the standards at the start of each sprint.
