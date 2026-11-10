# BisonRides Frontend

## Running the frontend

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

From the `Frontend` folder:

```bash
cp .env.example .env.local   # then set API_KEY (ask the team)
npm install
npm run dev
```

## TODO: Maps and address search

### What's done in the frontend

**Maps (Leaflet + OpenStreetMap).** Clicking a ride on the dashboard opens a pop-up with the ride's details and a map. The map shows where the ride starts, campus, and a dashed straight line between them. After a search, a map also appears above the results showing where every matching ride starts. Clicking a dot on it opens that ride. The **Map** page (`/map`, the button next to "Find a ride") lists every upcoming ride on the left and shows all of them on a map on the right; hovering a card highlights its dot and the other way round. The map code is in `src/components/RideMap.tsx`. It's loaded through `LazyRideMap.tsx` so Leaflet only downloads when a map is first shown.

**Address suggestions while typing.** When you type at least 3 letters into "Leaving from" on Post Ride or Edit Ride, or "From" or "To" on the dashboard search, a list of real addresses in Manitoba drops down, e.g. *Administration Building, 66 Chancellors Circle, Winnipeg, R3T 2N2*. Picking one gives us its exact coordinates. The suggestions come from [Photon](https://photon.komoot.io), which is free, needs no API key and uses the same OpenStreetMap data as the map. We didn't use Nominatim for this because its rules don't allow search-as-you-type. The code is in `src/components/AddressInput.tsx` and `src/lib/places.ts`.

- **Post Ride:** the driver has to pick an address from the list. We send its coordinates as `origin_point`, so we no longer guess coordinates from whatever text was typed. We also send the full address as `origin_label`.
- **Edit Ride:** the box starts with the ride's current place name. Leaving it alone keeps the same start. If the driver changes it, they have to pick a new address from the list, and we send its coordinates and `origin_label` the same way.
- **Clicking a ride:** your own ride opens Edit Ride like before. Anyone else's opens the details pop-up with the map.
- **Dashboard search:** if the rider picks a "From" address, we show rides that start within 5 km of it, nearest first. If they pick a "To" address, we show rides that end within 5 km of it. Each picked address gets a marker and a 5 km circle on the map. If they just type text without picking, that field matches ride names like before.
- **Where rides end:** the backend doesn't store a destination yet, so the frontend assumes every ride ends at the Fort Garry campus. Picking "University of Manitoba" near Fort Garry matches every ride. Picking somewhere else, like the Bannatyne campus or Polo Park, matches none, which is correct for now.

All of this works with the backend as it is today. Nothing in the backend has to change for it to run, and nothing errors.

### What the backend still needs to do

**Save the address the driver picked (`origin_label`).** The frontend already sends `origin_label` when posting or editing a ride, but the backend doesn't save it yet. It just ignores the field. Because of that, ride cards show a rough area name like "Regent" instead of the address the driver chose. We get that name by looking up the coordinates again in every rider's browser, which is slow and not very accurate. To fix it:

1. Add an `origin_label` text column (up to 255 characters, allowed to be empty) to the `Ride` model in `backend/models.py`.
2. Add `origin_label: str | None = None` to `CreateRideBody`, `RideOut` and `UpdateRideBody` in `backend/schemas.py`.
3. Pass `origin_label=body.origin_label` when creating the `Ride` in `backend/routers/rides.py`. Editing already copies every field that was sent, so `PATCH` works once the field is in `UpdateRideBody`.
4. Add a test that posts a ride with a label and gets the same label back.
5. **Update existing databases by hand.** `create_all` only creates missing tables, and never adds a new column to a table that already exists. On any database that already has a `rides` table (local copies and the deployed one), run `ALTER TABLE rides ADD COLUMN origin_label VARCHAR(255);`, or drop the table and let it be recreated.

Once that's done, the frontend shows the saved address automatically. Then `src/lib/geocode.ts` (the coordinates → name lookup) and the code that calls it in `src/hooks/useRides.ts` and `src/pages/EditRidePage.tsx` can be deleted.

**Later: destinations other than campus.** If rides should be able to go somewhere other than campus, the backend needs a `destination_point` (same GeoJSON format as `origin_point`) and a `destination_label`, saved the same way as above and returned in `RideOut`. The frontend already reads `destination_point` if it's there and searches by it. Post Ride would then also get a "Going to" address field like "Leaving from".

**Later:** `destination_label` is sent the same way and is also ignored for now. Real driving routes, distances and arrival times, instead of the straight dashed line, will come from OpenRouteService through the backend.
