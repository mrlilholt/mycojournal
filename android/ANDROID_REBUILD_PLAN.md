# MycoJournal Mobile Rebuild Plan

## Purpose

This document is the single source of truth for recreating the current web-based MycoJournal application as a production-ready mobile application for Android first, with iOS support planned from the same codebase.

The mobile app must:

- Preserve all existing functionality.
- Preserve all existing pages, flows, and data behaviors.
- Match the current visual design closely, while adapting interaction patterns where mobile usability requires it.
- Use the same backend environment and Firebase project as the current web app.
- Be built and validated linearly, with each screen, modal, and shared behavior tested before moving to the next step.
- Log UX or data issues discovered during implementation before reproducing them blindly.

## Product Constraints

- No pages are being removed.
- No functionality is being removed.
- Existing web behavior is the reference implementation.
- Mobile-first usability improvements are allowed when they reduce risk or improve usability on phones.
- Android is the first release target, but the architecture must also support iOS from the same codebase.

## Recommended Technical Direction

### Primary recommendation

Use React Native with Expo.

### Why

- The current app is already React-based.
- Shared domain logic can be reused or ported cleanly.
- Android and iOS can ship from one codebase.
- Firebase, Cloudinary, image capture, permissions, maps, and navigation all have mature React Native/Expo paths.
- This reduces rebuild cost compared with a Kotlin-first Android app followed by a separate iOS implementation.

### Mobile architecture target

- `android/` will contain the new mobile app workspace.
- Shared domain logic should be extracted into mobile-safe modules as early as possible.
- UI should be rebuilt natively for mobile screens, not wrapped from the web app.
- Web-only APIs must be replaced with mobile-safe equivalents.

## Current Web App Scope Summary

### Core data domains

- Authenticated user session
- Grows
- Logs
- Events
- Harvests
- Settings
- Foraging sessions
- Foraging finds
- Species presets and aliases

### Major web routes that require parity

- `/grows`
- `/grows/:id`
- `/new-grow`
- `/analytics`
- `/harvests`
- `/gallery`
- `/species`
- `/settings`
- `/forager`
- `/forager/:id`

### Shared behaviors that must be preserved

- Firebase auth gating
- Firestore live subscriptions
- First-run seed behavior
- Settings hydration and default merging
- Auto phase progression from grow logs
- Search across grows, sessions, and finds
- Photo compression, upload, preview, and deletion
- CSV export/import and JSON backup import/export
- Forager weather evaluation and location workflows
- Species resolution via aliases and iNaturalist

## Confirmed Platform Decisions

- Build target: Android first, then iOS from the same codebase
- Firebase: continue using the current Firebase project
- Mobile app setup: Android and iOS apps will be added to the same Firebase project
- Cloudinary delete strategy: keep current Netlify function unless mobile-specific backend needs prove materially better
- UI: stay visually close to the web app, but adapt for mobile patterns where needed
- Issue handling: log UX/data issues found during rebuild and propose corrections before reproducing them

## Non-Negotiable Delivery Rules

1. Work linearly.
2. Do not build later screens on top of unverified earlier screens.
3. Validate data writes and reads for every feature before moving on.
4. Track parity gaps and issues immediately.
5. Treat shared business logic as a first-class migration target, not an afterthought.

## Known Web-to-Mobile Adaptation Areas

### Authentication

Current web app uses Firebase Google popup auth.

Mobile replacement:

- Expo/AuthSession or Firebase-compatible native Google sign-in flow
- Firebase Android app registration
- Firebase iOS app registration later in the same project

### Browser-only APIs to replace

- `signInWithPopup`
- `window.confirm`
- `FileReader`
- browser file download behavior
- browser file input with `capture="environment"`
- `navigator.geolocation`
- service worker usage
- web-based routing assumptions

### Maps

Current web app uses Leaflet via `react-leaflet`.

Mobile replacement:

- native map implementation for Android/iOS, likely `react-native-maps`

### Photo handling

Current web app compresses images in canvas and uploads to Cloudinary.

Mobile replacement:

- mobile image picker / camera capture
- mobile-safe compression pipeline
- same Cloudinary target structure if possible
- same delete protection rules

### File import/export

Current web app exports CSV/JSON and imports CSV/JSON from local files.

Mobile replacement:

- native share/download/export flow
- native document picker for import
- parity for parsing and state replacement behavior

## Delivery Strategy

The rebuild will happen in three layers:

1. Foundation
2. Shared domain behavior
3. Screen-by-screen mobile UI implementation

No feature screen should be considered done unless all three layers are correct.

## Linear Build Plan

### Phase 0: Project setup and reference capture

Goal: establish the mobile workspace and preserve the web app as the parity reference.

Tasks:

- Create `android/` mobile workspace
- Initialize Expo React Native app
- Define folder structure for app screens, components, services, hooks, domain, and assets
- Capture route inventory and screen inventory from the web app
- Capture env variable inventory
- Define parity checklist template
- Define issue log template for UX/data discrepancies

Acceptance gate:

- Mobile workspace boots locally
- Routing shell exists
- Theme/tokens baseline exists
- Planning docs and parity checklists are in place

### Phase 1: Backend and configuration foundation

Goal: mobile app can authenticate and connect to the same backend safely.

Tasks:

- Register Android app in the existing Firebase project
- Prepare Firebase config for mobile app
- Plan and later register iOS app in the same Firebase project
- Implement env handling for shared config values
- Confirm Firestore collections and document shapes match the web app
- Decide whether Netlify function remains the delete endpoint for Cloudinary
- Verify mobile network access to Firebase, Cloudinary, Netlify, Open-Meteo, Nominatim, and iNaturalist

Acceptance gate:

- Mobile app reads env correctly
- Firebase initializes successfully
- Auth flow works on Android test device/emulator
- Firestore read/write smoke tests pass

### Phase 2: Shared domain layer migration

Goal: business rules exist in mobile-safe form before screen work starts.

Tasks:

- Port data model helpers
- Port date helpers
- Port units helpers
- Port grow phase logic
- Port harvest recommendation logic
- Port health scoring logic
- Port search logic
- Port species preset/default logic
- Port forager species alias and lookup orchestration
- Port import/export transforms where feasible
- Define central mobile store/state architecture

Acceptance gate:

- Shared logic tests or validation scripts cover critical transformations
- Sample data produces the same derived values as the web app
- Auto phase progression logic matches current behavior

### Phase 3: App shell and navigation

Goal: all top-level app structure is in place before feature screens are built.

Tasks:

- Build auth gate
- Build root navigation structure
- Build drawer/menu
- Build optional bottom tab navigation for high-frequency sections
- Build top-bar equivalents where needed
- Build account/settings entry points
- Define modal presentation strategy
- Define global search entry pattern for mobile

Acceptance gate:

- User can sign in and reach the main app shell
- Navigation reaches all planned top-level destinations
- Mobile navigation is usable one-handed on a phone

### Phase 4: Grow feature implementation

Goal: complete the primary grow-management workflow first.

Implementation order:

1. Grows list screen
2. Filters/search for grows
3. New grow screen
4. Edit grow flow
5. Quick log entry flow
6. Log create/edit modal or screen
7. Grow detail screen
8. Event logging flow
9. Harvest create/edit flow
10. Grow duplicate/delete/archive/unarchive flows
11. CSV export for individual grow

Acceptance gate for each step:

- UI matches the web app closely
- Firestore writes are correct
- Firestore listeners reflect updates correctly
- Derived phase/health values update correctly
- Navigation back/forward behaves correctly

Do not move forward until the grow detail screen and all child flows are stable.

### Phase 5: Harvest archive and analytics

Goal: complete read-heavy reporting screens after grow CRUD is stable.

Tasks:

- Harvest archive screen
- Active/completed grow filtering parity
- Analytics screen
- Metric cards and charts adapted for mobile readability

Acceptance gate:

- Values match current web calculations
- Lists and summaries remain legible on small screens

### Phase 6: Species and settings

Goal: migrate system configuration and admin-style features.

Tasks:

- Species manager screen
- Preset editing
- Alias editing
- Settings screen
- Units
- Default targets
- Health weights
- Backup/export
- JSON import
- CSV import

Acceptance gate:

- Settings persist correctly
- Import/export parity matches current data expectations
- Units and presets affect dependent screens immediately

### Phase 7: Gallery

Goal: migrate photo browsing after the underlying grow/photo flows are proven.

Tasks:

- Grow photo gallery view
- Foraging photo gallery view
- Species grouping
- Source filtering
- Lightbox/fullscreen viewer
- Navigation to source record

Acceptance gate:

- All uploaded photos display correctly
- Grouping and filtering match web behavior
- Fullscreen photo browsing is smooth on device

### Phase 8: Forager feature implementation

Goal: rebuild the most complex subsystem last, once the mobile foundations are stable.

Implementation order:

1. Forager session list
2. Session filtering and summary cards
3. Create/edit session screen
4. Session location capture
5. Session weather fetch/refresh
6. Session detail screen
7. Add mushroom find flow
8. Detailed mushroom find editing
9. Species lookup and alias resolution
10. Find photo capture/upload/delete
11. Map markers and location editing
12. External links to Wikipedia/iNaturalist
13. Session and find deletion flows

Acceptance gate for each step:

- Permissions work correctly
- Location values and privacy behavior remain correct
- Weather payloads match current shape
- Species lookup works or fails gracefully
- Photos upload and delete correctly
- Session/find relationships remain intact in Firestore

### Phase 9: Cross-platform hardening

Goal: keep the codebase ready for iOS immediately after Android stabilization.

Tasks:

- Remove Android-only assumptions from shared code
- Add iOS-safe navigation, permissions, and file handling notes
- Register iOS app in Firebase when Android baseline is stable
- Test shared flows against both platform constraints

Acceptance gate:

- No major feature is architected in an Android-only way without documentation

### Phase 10: Final release preparation

Goal: move from feature parity to production readiness.

Tasks:

- Full regression pass
- Permission copy review
- Error state review
- Performance pass on low-memory devices
- Crash and analytics instrumentation if needed
- App icon, splash, package IDs, bundle IDs
- Store listing requirements
- Release build validation

Acceptance gate:

- Android release candidate passes parity checklist
- No critical data-loss, auth, upload, or navigation defects remain

## Screen-by-Screen Verification Standard

Every screen, modal, or major component must pass all of the following before work continues:

- Visual parity is acceptable for mobile
- All inputs can be completed on a phone
- Writes persist correctly to Firestore
- Reads render correctly from Firestore
- Loading state exists
- Error state exists
- Empty state exists
- Navigation path in and out is verified
- Related downstream screens are rechecked for regressions

## Required Issue Logging

During rebuild, log issues instead of silently copying them.

For each issue found, capture:

- ID
- Area
- Current web behavior
- Why it is a problem
- Proposed mobile handling
- Whether we should preserve or fix it
- Decision status

Suggested file to create when implementation begins:

- `android/ISSUES_AND_PARITY_LOG.md`

## Environment and Integration Inventory

### Current confirmed env values in web app

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- server-side Cloudinary delete secrets in Netlify

### External services currently used

- Firebase Auth
- Firestore
- Cloudinary
- Netlify Functions
- Open-Meteo
- OpenStreetMap / Nominatim
- iNaturalist

## High-Risk Areas

- Firebase mobile auth setup
- replacing popup auth with native auth flow
- photo upload and delete parity
- mobile file import/export parity
- map parity and location permissions
- browser-only assumptions hidden in current utilities
- maintaining exact Firestore document shapes
- preserving auto phase progression behavior
- ensuring gallery and forager features use the same photo conventions

## Initial Folder Intent

Planned contents under `android/`:

- mobile app project
- this plan
- parity log
- screen checklists
- implementation notes as needed

## Immediate Next Steps

1. Initialize the mobile workspace in `android/`.
2. Add a parity checklist document and issue log document.
3. Set up Expo, navigation, theme tokens, and env handling.
4. Register the Android app in Firebase and wire auth/firestore.
5. Build the shared domain layer before building screens.

## Open Setup Tasks To Be Resolved During Implementation

- Android Firebase app registration
- Android Google sign-in configuration
- iOS Firebase app registration after Android baseline is stable
- final decision on whether Netlify remains the Cloudinary delete endpoint for mobile release
- selection of native libraries for:
  - maps
  - auth
  - image picking/camera
  - file import/export

## Definition of Done

The mobile rebuild is done only when:

- every web feature exists in mobile form
- every top-level route has a validated mobile equivalent
- all shared domain logic is verified against current behavior
- Android is production-ready
- the codebase is structured so iOS can be completed without re-architecting the app
