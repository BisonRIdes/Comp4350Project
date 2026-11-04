# BisonRides Frontend

## Running the frontend

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

From the `Frontend` folder:

```bash
cp .env.example .env.local   # then set API_KEY (ask the team)
npm install
npm run dev
```

Then open http://localhost:5173.

To try payments, also set `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.local` to Stripe's test publishable key (`pk_test_...`), and set up the backend's Stripe keys (see "Payments" in `backend/README.md`). On Vercel, add the same variable: Vite puts it into the build, so redeploy after changing it.
