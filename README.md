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
- Render deployment is supported through `Dockerfile`, `render.yaml`, `/api/health`, and environment-based config.

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

This repo deploys to Render as a **native Node.js web service** (not Docker).
Playwright's Chromium is installed during the build step via `npx playwright install chromium`.

### Dual-Branch Strategy

| Branch | Storage | Auth session | Playwright browsers |
|---|---|---|---|
| `local-stable` | Local files | Local `.sessions/` | Local headful (GUI) |
| `render-production` | **MongoDB** | **MongoDB** | Headless with `--no-sandbox` |

### Files Used For Render

- `render.yaml` — service definition (env, build/start commands, env vars)
- `src/app/api/health/route.ts` — health check at `/api/health`
- `docker/Dockerfile` — retained for future use (Docker/worker scenarios); **not the active Render path**

### Render Setup Steps

1. Connect this repository to Render as a **Node** web service.
2. Render will use `render.yaml` automatically (or configure manually).
   - **Build Command:** `npm install && npx playwright install chromium && npm run build`
   - **Start Command:** `npm start`
3. Set the required environment variables in Render Dashboard:
   - `MONGODB_URI` — your Atlas or Render-hosted MongoDB connection string
   - `MONGODB_DB_NAME` — e.g. `dispositions_form_automation`
   - `APP_BASE_URL` — public URL of your Render service (e.g. `https://your-app.onrender.com`)
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
- Playwright runs headless with `--no-sandbox --disable-setuid-sandbox` flags
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
  Dockerfile           ← retained for Docker/worker use; not active
render.yaml            ← native Node.js Render service config
```
