## Product Vision

***BisonRides*** is a ridesharing application designed to help university 
students get to campus efficiently and reliably. Drivers can post the 
routes they regularly take to campus, along with an initial price they 
consider reasonable for providing a ride. Riders can browse available 
routes and request to join a driver’s trip, while the built-in price 
negotiation system allows both parties to settle on a mutually acceptable 
fare. If none of the available routes meet a rider’s needs, they can 
create a custom ride request that is visible to drivers, who can choose 
to accept it. The application also allows riders and drivers to 
communicate directly when arranging rides or discussing specific 
accommodations, ensuring both parties can clearly communicate their 
needs before the trip. 

The primary target audience for ***BisonRides*** is university students, 
specifically those who do not have reliable access to a personal 
vehicle, a driver’s license, or a convenient public transportation 
option. ***BisonRides*** is particularly useful for students who live in areas 
without access to public transportation or who, for personal reasons, do 
not feel comfortable using public transit. By connecting these students 
with other university students who are already travelling to campus, 
***BisonRides*** provides an additional transportation option that can better 
accommodate individual schedules and circumstances.

***BisonRides*** provides students with a flexible and reliable alternative 
to public transit, which can be especially valuable during winter months 
or for students who need to arrive on campus early in the morning for 
classes or exams. Compared with public transit, car rides can provide a 
faster and more direct means of transportation, helping students arrive 
on campus more efficiently and reliably. The application also provides 
an opportunity for students with vehicles to earn additional income by 
offering rides while encouraging carpooling among students. By increasing 
the number of students sharing rides, ***BisonRides*** can help reduce the 
number of individual vehicles travelling to campus, potentially 
decreasing traffic congestion and transportation-related carbon 
emissions. This can contribute to cleaner air and more sustainable 
transportation while providing students with a convenient way to travel. 

The success of ***BisonRides*** will be measured using several indicators of 
user satisfaction and adoption. The project will be considered successful 
if it achieves the following goals: it maintains an average user 
rating of at least 4 out of 5 stars, and a user study indicates that 
***BisonRides*** is the preferred ridesharing application among participating 
University of Manitoba students.

## Initial non-functional expectations

- **Performance**: Usable speeds. Embedded map and algorithms should not be noticable bottlenecks in frontend and backend performance respectively.

- **Reliability**: Should work reliably without crashing.

- **Security**: Safe storage of credentials/secrets. Especially payment information and user email lists.

- **Accessibility**: Follow best practices i.e. alt text on any image.

- **Availability**: Render loads in 1 minute. Should be usable from both mobile and desktop devices.

## Initial technology and platform decisions

### 1. Frontend
 
#### React + TypeScript + Vite
- **Why:** React has the ecosystem we need (Leaflet bindings, Stripe Elements), and most of the team already knows it. TypeScript catches mismatched API shapes at compile time. This matters because the frontend and backend are built by different people. Vite gives fast dev-server reloads and a simple production build that outputs static files.
#### Leaflet + OpenStreetMap tiles
- **Why:** Leaflet is open source, lightweight and free. It has no API key and no billing account, and it handles everything we need: markers for drivers and riders, drawing a route line, and live marker movement. OpenStreetMap tiles work with it out of the box.
- **Alternatives considered:** Google Maps and Mapbox were rejected because they need a billing account or API key and have usage-based pricing.
#### Vercel (frontend hosting)
- **Why:** The built frontend is just static files, which Vercel serves from a CDN. It deploys automatically from GitHub and creates a preview URL for every pull request, so reviewers can try UI changes before merging.
 
### 2. Backend
 
#### Python + FastAPI
- **Why:** FastAPI is async-native. Async lets one process handle all of this without blocking. Pydantic models validate every request automatically. FastAPI also generates OpenAPI/Swagger documentation from the code, which directly meets the course requirement for well-documented interfaces. Python is the language the whole team is strongest in.
#### SQLAlchemy (ORM)
- **Why:** SQLAlchemy is the standard Python ORM. Its models keep database access in one layer, separate from business logic, which meets the course rule that persistence stays separate from application logic. GeoAlchemy2 extends it to PostGIS types. Alembic handles schema migrations so every environment has the same schema.
#### REST
- **Why:** Ordinary actions such as signing up, requesting a ride or viewing history are request/response, so they fit REST.
#### Docker on Render (backend hosting)
- **Why:** The same Docker image runs on our laptops, in CI and in production, which avoids "works on my machine" problems. Render runs long-lived containers. Serverless platforms such as Vercel Functions time out and can't hold persistent sockets. Render also provides managed Redis (Render Key Value) in the same platform.
 
### 3. Data
 
#### Supabase (PostgreSQL + PostGIS)
- **Why:** Ride matching is a geospatial problem ("which available drivers are within X km of this rider?"). PostGIS answers that inside the database, using a spatial index and functions like `ST_DWithin`, instead of loading every driver into Python. Supabase gives us managed Postgres with PostGIS enabled, backups and a web dashboard for inspecting data, with no database server for us to run. It's relational, so trips, users and payments keep proper foreign-key integrity.
#### Supavisor connection pooling (over TLS)
- **Why:** Postgres can only hold a limited number of connections. Connecting through Supabase's pooler stops the backend from running out of connections when it restarts or scales. TLS encrypts all traffic between Render and Supabase.
#### Redis (Render Key Value)
- **Why:** We use Redis for three things:
  1. **Caching OpenRouteService responses** for route and ETA lookups we've already made, which keeps us inside ORS's free daily quota and cuts latency.
  2. **Holding current driver locations**, which change every few seconds. Writing every location update to Postgres would be wasteful; Redis keeps the latest position in memory, and only trip records are stored in Postgres.
  3. A base for **rate limiting** and, if needed later, **pub/sub** between multiple backend instances.
 
### 4. External services
 
#### OpenRouteService (routing)
- **Why:** It gives driving routes, distances and ETAs, which we need for showing the trip path, estimating fares and estimating arrival times. It's based on OpenStreetMap data, so it matches our map tiles, and it has a free tier that only needs an API key.
#### Stripe (test mode)
- **Why:** Stripe's test mode lets us build and demo a realistic payment flow with test cards and no real money. Payment confirmation arrives through **webhooks** sent from Stripe to our backend, so a trip is only marked paid when Stripe itself says so. We never trust the client to report that a payment succeeded. Stripe also handles card data, so card numbers never touch our servers, which keeps us out of PCI compliance scope.
#### Resend (email)
- **Why:** We need transactional email such as ride receipts and account verification. Resend has a simple HTTP API with a Python SDK and a free tier large enough for development and demos.
- **Alternatives considered:** Twilio SMS costs money per message and needs phone-number setup and verification; it is deferred as a possible later addition. Running our own SMTP server would cause deliverability problems.
 
### 5. Authentication
 
#### JWT (JSON Web Tokens)
- **Why:** The frontend (Vercel) and API (Render) are on different domains, which makes cookie-based sessions awkward. A JWT sent in the `Authorization` header works across domains. JWTs are stateless, so the backend doesn't need a session store. Each token carries the user's role (rider or driver) for permission checks.

### 6. CI/CD and code quality
 
#### GitHub Actions
- **Why:** Our code already lives on GitHub, so CI runs next to it with no separate service and is free for our usage. Pipelines are defined as YAML in the repo, so they are versioned and reviewed like code.
- **Pipeline:** On every pull request and push, CI runs the tests, SonarCloud analysis and Trivy scans. On merge to `main`, it also builds the Docker image, pushes it to Docker Hub and calls Render's deploy hook.
#### SonarCloud (on PR and push)
- **Why:** SonarCloud gives automated static analysis of our own code: bugs, code smells, duplication, security hotspots and test coverage. Its results appear directly on pull requests, and its quality gate can block a merge, so code quality is checked on every change rather than at the end of the project. It is free for public repositories.
- **Trade-offs:** It can produce false positives, so we'll tune rules as needed rather than ignoring the dashboard.
#### Trivy (on PR and push)
- **Why:** SonarCloud checks the code we write. Trivy checks what we depend on: known vulnerabilities (CVEs) in our Python packages, npm packages and the Docker base image. Together they cover both our own code and third-party code.
- **Decision:** Trivy is included. At first it only reports findings; once the baseline is clean, it will fail the build on critical vulnerabilities.
#### Docker Hub + Render deploy hook (continuous deployment)
- **Why:** CI builds the image only after the tests pass and pushes it to Docker Hub. It then calls Render's deploy hook, and Render deploys that exact image. The result is that only tested code reaches production, the image we tested is the image that runs, and rolling back means redeploying an earlier image tag.

## Lightweight Architecture Sketch

![Architecture sketch](../documents/ArchitectureDiagram.png)

## Additional process or protocol documentation

- 2 people review any PR before merge 

- Issues are dev tasks

- Branches resolve designated issues 

- `main` branch, `dev` branch, issue branches split from `dev` branch, infrequently carefully merge `dev` into `main` 

- `main` should always be a stable product

- Assign self to user stories with deadlines 

- Discussing tasks that need to get done on *Discord*, once decided self-assign those tasks on github 

- Create new issues as needed and assign to whoever makes sense and is available 

- Bigger issues can be discussed on *Discord* 