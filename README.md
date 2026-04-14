# Dispositions Form Automation

Windows-local internal automation tool for Blackbuck to automate a restricted Google Form with a professional dashboard, saved session reuse, dry-run-first safety, structured logs, screenshots on failure, and a future-ready architecture for batch processing.

## What This Project Does

- Runs locally on Windows only.
- Uses a single Next.js + TypeScript app for both UI and server-side automation APIs.
- Reuses a manually created Playwright browser session instead of storing credentials.
- Defaults every run to `DRY_RUN`.
- Supports `SUBMIT` mode for real submissions.
- Handles the supported multi-page Google Form branches:
  - Interested
  - Follow Up
  - Call Back
  - Not Interested
  - Call Disconnected
  - Call Drop
  - Not Connected
  - Language Barrier
- Persists:
  - auth session metadata
  - run history
  - structured logs
  - screenshots and JSON run reports

## High-Level Architecture

```text
Next.js App Router UI
  -> Dashboard / New Submission / Batch / History / Settings
  -> API routes for auth, runs, history, config

Server Modules
  -> Auth service + manual login setup manager
  -> Session validator for expiry / access loss detection
  -> Playwright automation runner
  -> Branch-specific form handlers
  -> Run queue + in-memory live run store
  -> JSON history repository
  -> Structured logger + artifact service

Local Storage
  -> storage/auth
  -> storage/history
  -> storage/logs
  -> storage/artifacts
  -> storage/samples
```

## Project Structure

```text
src/
  app/
    dashboard/
    submissions/new/
    batch/
    history/
    settings/
    api/
  components/
    dashboard/
    submission/
    history/
    shared/
  modules/
    submission/
    batch/
  server/
    auth/
    automation/
    config/
    history/
    logging/
    reports/
    runs/
storage/
  auth/
  history/
  logs/
  artifacts/
  samples/
config/
  app.config.json
tests/
scripts/
```

## Prerequisites

- Windows machine
- Node.js 20+
- npm 10+
- An authorized `@blackbuck.com` Google account
- Local browser access for the one-time manual login setup

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Install Playwright Chromium if needed:

   ```bash
   npx playwright install chromium
   ```

4. Prepare local storage:

   ```bash
   npm run prepare:storage
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open:

   ```text
   http://localhost:3000
   ```

## Main Commands

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run prepare:storage
npm run seed:sample
```

## Manual Operator Steps

### One-Time Login Setup

1. Open the app and go to `Settings` or `Dashboard`.
2. Click `Start Login Setup`.
3. A browser window opens to the restricted Google Form.
4. Manually sign in using the authorized `@blackbuck.com` account.
5. Confirm the form loads fully.
6. Return to the app and click `Finish Login Setup`.
7. The app saves Playwright `storageState` locally for later reuse.

### Run a Submission

1. Open `New Submission`.
2. Fill Page 1 common fields.
3. Pick one supported Call Status.
4. Fill the branch-specific Page 2 fields.
5. Fill Page 3 `Remarks`.
6. Keep `Dry Run` unless you explicitly want a real submission.
7. Click `Preview Submission`.
8. Confirm the preview.
9. Watch the live progress panel.

## Session Expiry and Re-Auth

The tool never stores credentials and never bypasses Google login.

If the saved session expires or loses access:

- the run is blocked safely
- the UI shows that re-auth is required
- the operator should repeat the login setup flow

### Refresh Auth Safely

1. Click `Refresh Status`.
2. If status becomes `REAUTH_REQUIRED` or `FORBIDDEN`, click `Start Login Setup`.
3. Sign in manually again with the authorized account.
4. Click `Finish Login Setup`.

## Validation and Safety Notes

- Default mode is `DRY_RUN`.
- Unsupported call statuses are intentionally blocked in the MVP.
- Hidden branch fields are cleared when Call Status changes.
- Browser automation relies on labels, roles, and visible text instead of brittle CSS-only selectors.
- Submit mode does not auto-retry the final submit click to reduce duplicate submission risk.
- Screenshots are captured on failure and also at the end of successful runs.

## Local Data Layout

- `storage/auth/storage-state.json`
  - saved Playwright session
- `storage/auth/auth-metadata.json`
  - last saved / validated session metadata
- `storage/history/runs.json`
  - completed run history
- `storage/logs/*.jsonl`
  - structured logs
- `storage/artifacts/<run-id>/`
  - screenshots and JSON reports

## Testing Guide

Run the automated checks:

```bash
npm run typecheck
npm run test
```

Covered checks include:

- submission schema validation
- date/time utilities
- run store transitions
- session signal interpretation

### Manual Verification Checklist

1. Start the app locally.
2. Confirm `Dashboard`, `New Submission`, `Batch Upload`, `History`, and `Settings` load.
3. Confirm `Data Management` loads and shows storage summary.
3. Run login setup once with the authorized account.
4. Execute one `DRY_RUN` per supported branch:
   - Interested
   - Follow Up
   - Call Back
   - Not Interested
   - Call Disconnected
   - Call Drop
   - Not Connected
   - Language Barrier
5. Confirm progress updates appear in the side panel.
6. Confirm `History` shows the completed run.
7. Confirm logs and screenshot artifacts are saved locally.
8. Test a forced expired-session scenario by removing the saved session or signing out, then verify the app asks for re-auth.

## Supported MVP Branches

- Interested
- Follow Up
- Call Back
- Not Interested
- Call Disconnected
- Call Drop
- Not Connected
- Language Barrier

## Not Yet Enabled

- Google Sheet ingestion
- Full batch execution UI
- Multi-operator concurrency controls
- Artifact preview inside the dashboard

## Future Extension Notes

### Google Sheet Support

The architecture already separates:

- submission schema
- run queue
- history persistence
- batch module contracts

This makes it straightforward to add:

- Google Sheet row ingestion
- row-level validation
- continue-on-error execution summaries
- downloadable batch reports

### Batch Processing

Planned batch behavior:

- max target rows: 50
- strategy: continue on error
- reuse the same automation runner per row
- persist row-level result history and artifacts

## Important Compliance Notes

- Use only an authorized `@blackbuck.com` account.
- Do not hardcode credentials.
- Do not attempt to automate sign-in fields or bypass the restricted form.
- Keep the app local and internal only.
