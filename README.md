# MycoJournal Pro

A data-driven mushroom grow journal for home growers and small farms. Track grow runs, log environmental readings and events, capture harvests (flushes), and view analytics by species.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file based on `.env.example` and add your Firebase config.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the app at the URL shown in your terminal (default is `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Firebase Setup

- Create a Firebase project.
- Enable Google Sign-In in **Authentication**.
- Create a Firestore database.
- Add the Firebase web app config values to your `.env` file.
- Deploy the Firestore rules in `firestore.rules`.

## Data Model (Firestore)

All user data is stored under:

```
users/{uid}/grows
users/{uid}/logs
users/{uid}/events
users/{uid}/harvests
users/{uid}/settings
```

If the collections are empty on first login, the app seeds your account with the demo data.

## Cloud-only Mode

This build requires Google sign-in. Data is stored in Firestore (no localStorage fallback).

## Seed Data

Two example grow runs (Blue Oyster and Lion's Mane) are preloaded with logs and a harvest to demonstrate the UI.
