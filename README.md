# Dispositions Form Automation

Production-style Next.js + Playwright automation for the restricted Google Form, now prepared for Render deployment with MongoDB-backed persistence and lean-by-default local storage.

## What Changed

- Main operational persistence moved to MongoDB:
  - auth session metadata
  - saved Playwright browser state
  - single-run history
  - batch run summaries
  - batch row-level results
- Runtime-only state stays in memory:
  - active run progress
  - active batch queue execution
  - pause/resume timers
  - in-progress auth setup browser handles
- Local file persistence is now optional and disabled by default for:
  - screenshots
  - JSON run reports
  - JSONL file logs
- Render deployment is supported through `render.yaml`, `/api/health`, and environment-based config.

## Current Storage Strategy

### Must Move To MongoDB

- Saved Playwright session state used for browser reuse
- Auth/session metadata used by the dashboard and validation flow
- Submission history
- Batch summaries
- Batch row results

### Remains Ephemeral / Runtime-Only

- In-memory live run store
- In-memory batch queue and wait countdowns
- Active Playwright browser/context/page instances
- Active login setup session window

### No Longer Stored By Default

- Screenshots
- JSON run reports
- JSONL log files
- Legacy local auth/history JSON files

## High-Level Architecture

```text
Next.js App Router UI
  -> Dashboard / New Submission / Batch / History / Settings / Data Management
  -> API routes for auth, runs, history, batch control, storage, health

Server Modules
  -> Auth service + manual login setup manager
  -> Session validator for restricted-form access
  -> Playwright automation runners
  -> In-memory live run stores for active execution
  -> MongoDB repositories for auth/session, runs, and batches
  -> Structured logger + optional artifact writer

Optional Local Storage
  -> storage/logs
  -> storage/artifacts
  -> storage/samples
```

## Environment Variables

Copy `.env.example` to `.env` for local work.

Required:

- `MONGODB_URI`
- `MONGODB_DB_NAME`

Important:

- `AUTH_INTERACTIVE_SETUP_ENABLED=true` only on a trusted local workstation used for manual session refresh
- `AUTH_INTERACTIVE_SETUP_ENABLED=false` on Render
- `PERSIST_LOG_FILES=false`
- `PERSIST_SCREENSHOTS=false`
- `PERSIST_RUN_REPORTS=false`

## Local Development

1. Copy `.env.example` to `.env`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Prepare optional local directories:

   ```bash
   npm run prepare:storage
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Auth Session Strategy

The app still does not store credentials and still relies on a manually created Google session.

### What Is Stored In MongoDB

- `authSessionMetadata`: operator-scoped session status, saved timestamps, validation timestamps, and detected Google account email
- `authSessionStates`: operator-scoped Playwright `storageState` payload used to reopen the browser context after restarts

### How Sessions Survive Restarts

- Render restarts do not clear MongoDB, so the saved operator-specific `storageState` survives container replacement
- On startup, the app recreates a Playwright browser context from MongoDB instead of relying on local session files

### How Session Recovery Works

- If the saved session is still valid, the app reuses it automatically for runs and batch jobs
- If validation fails, the operator sees a re-auth requirement and must refresh the session from a trusted local workstation
- The cloud runtime never tries to open an interactive Google sign-in window

### Local / Trusted Workstation

- Keep `AUTH_INTERACTIVE_SETUP_ENABLED=true`
- Use the Settings or Dashboard auth actions
- The resulting Playwright storage state is saved to MongoDB instead of `storage/auth/storage-state.json`

### Render / Cloud Runtime

- Keep `AUTH_INTERACTIVE_SETUP_ENABLED=false`
- Do not attempt interactive login inside the Render container
- Refresh the session from a trusted local workstation that points to the same MongoDB instance

This keeps the current login model intact while avoiding unsafe or brittle cloud-only sign-in shortcuts.

## Migrating Legacy Local Data

If you already have local auth/history data from the previous file-based version, import it once into MongoDB:

```bash
npm run migrate:mongodb
```

The migration script imports:

- `storage/history/runs.json`
- `storage/auth/auth-metadata.json`
- `storage/auth/storage-state.json`

It does not migrate screenshots, logs, or other bulky artifacts.

## Render Deployment

This repo deploys to Render as a **Docker-based web service**.
That is the safer production path for Playwright because the browser runtime and OS-level dependencies are built into the image instead of depending on the host environment.

### Dual-Branch Strategy

| Branch | Storage | Auth session | Playwright browsers |
|---|---|---|---|
| `local-stable` | MongoDB-backed persistence with optional local artifacts | MongoDB | Local headful (GUI) |
| `render-production` | **MongoDB** | **MongoDB** | Headless with `--no-sandbox` |

### Files Used For Render

- `render.yaml` - Render Blueprint service definition for the Docker web service
- `docker/Dockerfile` - production image used by Render and optional local container runs
- `src/app/api/health/route.ts` - health check at `/api/health`

### Render Setup Steps

1. Connect this repository to Render and create a **Blueprint/Docker** web service.
2. Render will use `render.yaml` automatically.
   - Runtime: `docker`
   - Dockerfile: `./docker/Dockerfile`
3. Set the required environment variables in Render Dashboard:
   - `MONGODB_URI` — your Atlas or Render-hosted MongoDB connection string
     - Supports both `mongodb+srv://...` and direct `mongodb://host1,host2,...` formats
     - Prefer a direct host list if the runtime reports `querySrv` DNS errors
   - `MONGODB_DB_NAME` — e.g. `dispositions_form_automation`
   - `AUTH_INTERACTIVE_SETUP_ENABLED=false`
4. File persistence is **automatically disabled** when `NODE_ENV=production` — no extra config needed.
5. Use `/api/health` as the health check path.
6. **Bootstrap the Google session locally first:**
   - Run the app locally with `AUTH_INTERACTIVE_SETUP_ENABLED=true` and the same `MONGODB_URI`
   - Use Settings → Login Setup to sign in
   - The Playwright browser state is saved to MongoDB and will be reused by Render automatically

### Production Safety Guarantees

- `NODE_ENV=production` forces off all local file writes (logs, screenshots, reports) in code — not just by env vars
- Local directory creation is skipped on Render
- Playwright runs inside the Docker image with its required browser dependencies packaged into the deploy artifact
- Interactive browser setup is disabled
- All MongoDB records are scoped by `operatorId` (user email) — per-user isolation enforced

## Build And Run Commands

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm test
npm run migrate:mongodb
```

## Validation

Automated checks used during this branch work:

- `npm run typecheck`
- `npm test`
- `npm run build`

If interactive auth is disabled or MongoDB is missing, persistence-backed routes will fail fast instead of silently falling back to local JSON.

## Notes On Optional Artifacts

- Logs always go to stdout for platform logging
- File logs are optional
- Screenshots are optional
- JSON run reports are optional
- Artifact file serving is available through `/api/artifacts/...` when local artifact persistence is enabled

## Project Structure

```text
src/
  app/
    api/
      artifacts/
      auth/
      batch-runs/
      health/          ← Render health check endpoint
      history/
      runs/
      storage/
    batch/
    dashboard/
    history/
    settings/
    submissions/
  components/
  lib/
  modules/
  server/
    auth/
    automation/        ← browser-factory.ts (Playwright, sandbox flags)
    config/            ← config-service.ts (prod-safe persistence)
    database/          ← mongodb.ts
    history/
    logging/
    reports/
    runs/
config/
  app.config.json
scripts/
  migrate-local-storage-to-mongodb.ts
  prepare-storage.ts
docker/
  Dockerfile           ← maintained optional container path
render.yaml            ← native Node.js Render service config
```
