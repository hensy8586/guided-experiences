# Guided Experiences

Guided Experiences is a future platform for creators to publish location-based experiences, including walking tours, food tours, treasure hunts, and photography walks. People will be able to follow these experiences from their phones and discover places through local knowledge.

## Current milestone

This initial milestone is a mobile-responsive Mapbox prototype with opt-in live browser geolocation, one test destination, straight-line distance, and optional device heading. It does not include routing, accounts, data storage, or other future product functionality.

## Install dependencies

```bash
npm install
```

## Run the development server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Geolocation testing

Browser geolocation works on `localhost` during development. Deployed sites generally must be served over HTTPS before a browser will provide location access, so production field testing should use the deployed HTTPS site.

## Compass support

Device heading is an optional enhancement and varies by browser and hardware. iPhone Safari may require explicit motion and orientation permission, while many desktop browsers do not provide a useful compass heading. Test mobile heading behavior on the deployed HTTPS site.
