# Master Prompt: Maintenance Planification Section (Calendar + Probabilities)

Objective: Implement a “Maintenance Planification” section that displays a calendar of predicted maintenance dates with probability breakdowns per machine, using historical interventions from `DATA/AMDEC.csv` as the source. Keep the existing technologies: FastAPI (apps/api) for backend, Next.js (apps/web) for frontend, React Query, and the current UI conventions.

## Backend (FastAPI in `apps/api`)
- Add AMDEC parser:
  - Read `DATA/AMDEC.csv` with `pd.read_csv(..., sep=';', encoding='utf-8', dayfirst=True)`.
  - Normalize columns: map French headers to snake_case keys: `Type de panne`→`failure_type`, `Durée arrêt (h)`→`downtime_hours`, `Résumé intervention`→`intervention_summary`, `Date intervention`→`intervention_date`, `Désignation`→`machine`, `Date demande`→`request_date`, `Cause`→`cause`, `Coût matériel`→`material_cost`, `Organe`→`organ`, `[Pièce].Désignation`→`part_designation`, `[Pièce].Référence`→`part_reference`, `[Pièce].Quantité`→`part_quantity`, `[Pièce].Prix total`→`part_total_price`.
  - Parse dates in French format: `pd.to_datetime(..., dayfirst=True)`. Handle optional time part in `request_date`.
  - Convert decimal commas to floats for numeric fields: replace `,`→`.` then cast (`downtime_hours`, `material_cost`, `part_quantity`, `part_total_price`).
  - Ensure `machine` values are normalized like `machine1`, `machine2`, …

- Feature engineering per machine:
  - Sort by `intervention_date`; compute time-between-interventions (TBI) deltas in days.
  - Failure type and cause frequency distributions (normalized probabilities).
  - Rolling averages over recent interventions (e.g., last 90 days) for `downtime_hours` and `material_cost`; fallback to overall mean when sparse.
  - Optional seasonality: counts by weekday and month to slightly adjust probability if data volume allows (>20 interventions).

- Forecast logic:
  - Expected next intervention date = last `intervention_date` + median TBI (fallback to mean when sample size < 5; fallback to 30 days if < 3 entries).
  - Probability window using TBI distribution: `window_start` = last date + 25th percentile; `window_end` = last date + 75th percentile. If insufficient data, use ±7 days around the expected date.
  - Distribute probability mass weekly across a `horizon_days` window (default 60 days) using a normal approximation with mean/variance from TBI; clamp to [0,1].
  - Failure-type probabilities: normalized counts over last N interventions (N=15; use all if fewer).
  - Expected `downtime_hours` and `material_cost`: weighted averages by failure-type probabilities.

- Endpoints to implement:
  - `GET /maintenance/forecast?horizon_days=60&machine=machine1`
    - Returns array of forecast objects:
      - `machine`: string
      - `predicted_date`: ISO date
      - `window_start`: ISO date
      - `window_end`: ISO date
      - `probability`: number (0–1) for the predicted date peak
      - `failure_type_probabilities`: map `{type: probability}`
      - `expected_downtime_hours`: number
      - `expected_material_cost`: number
  - `GET /maintenance/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD&machine=machine1`
    - Returns calendar-ready events:
      - `id`: string
      - `title`: e.g., `Predicted maintenance`
      - `date`: ISO date
      - `probability_band`: `low|medium|high` (thresholds: high ≥ 0.7; medium 0.4–0.7; low < 0.4)
      - `machine`: string
      - `meta`: object with failure-type breakdown, expected downtime/cost, window bounds

- Implementation notes:
  - Keep responses concise; reuse `FastAPI` app (`predict.py`) or add `maintenance.py` and include it in the app routing.
  - CORS is already enabled; endpoints should be public for the web app.
  - Minimal unit tests: verify date parsing, numeric conversions, and non-empty forecasts on sample data.

## Frontend (Next.js in `apps/web`)
- New route: `app/maintenance/plan/page.tsx`
  - Displays month/week calendar of predicted maintenance windows per machine.
  - Sidebar filters: machine selector, horizon (30/60/90), failure type toggles.
  - Panels: probability breakdown (chart) and expected downtime/cost.
  - Table: upcoming interventions sorted by `predicted_date` with confidence.

- Components under `components/maintenance/`:
  - `MaintenanceCalendar.tsx`: calendar view; color-coded probability bands; tooltips showing failure-type breakdown and expected downtime/cost.
  - `ProbabilityBreakdown.tsx`: chart for failure type probabilities using existing UI primitives.
  - `UpcomingList.tsx`: list/table of forecast entries.

- Data fetching (React Query):
  - `useMaintenanceForecast({ machine, horizonDays })` → `/maintenance/forecast`.
  - `useMaintenanceCalendar({ start, end, machine })` → `/maintenance/calendar`.

- Styling and UX:
  - Use `packages/ui` tokens/components for consistency.
  - Probability band colors: low (muted), medium (warning), high (danger/strong). Follow existing theme semantics.
  - Empty state when no history for a machine: show guidance and allow switching machines.

- e2e basics (Playwright in `apps/e2e`):
  - Navigate to `/maintenance/plan` and ensure the calendar renders.
  - Mock API or use real endpoints; assert at least one event appears when AMDEC has entries.

## Fallbacks & Edge Cases
- Sparse data (< 3 interventions):
  - Single `predicted_date` at `last_date + 30 days`; probability `0.5`; band `low`.
  - Failure-type probabilities from all available events for that machine.
- Missing numeric values: treat as `NaN`; ignore in averages.
- Non-standard machine names: normalize to lowercase and trim whitespace.

## Deliverables
- Backend: new endpoints integrated into the FastAPI app (`apps/api/predict.py` or `apps/api/maintenance.py`).
- Frontend: new page `apps/web/app/maintenance/plan/page.tsx` and components in `apps/web/components/maintenance/`.
- Tests: one backend unit test for parsing/forecast generation; one Playwright smoke test for page rendering.

## Quick Try Instructions
1. Start API:
   - PowerShell: `cd apps/api; .\start_api.ps1`
2. Start web:
   - PowerShell: `pnpm dev`
3. Visit `http://localhost:3000/maintenance/plan` to see calendar and breakdown.
