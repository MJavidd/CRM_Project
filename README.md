# Healthcare Ransomware Decision Support

An academic decision-support website that helps a hospital CEO or CISO understand ransomware risk and choose cybersecurity investments for a **fictional** regional hospital network. It combines FAIR-style risk modeling, Monte Carlo simulation and portfolio optimization from a Python risk engine (v8), behind a FastAPI backend and a Next.js frontend.

> **Synthetic and illustrative only.** Every hospital figure, attack rate, control effect, cost, clinical indicator and model result is synthetic. Nothing is calibrated to a real institution, and the outputs are not validated forecasts or clinical or financial advice.

## Website sections

| Page | Route | Purpose |
|---|---|---|
| Hospital Overview | `/` | Hospital profile, critical assets, existing controls, budget and baseline analytic risk |
| Ransomware Threats | `/threats` | The three attack scenarios: entry points, engine stages, weaknesses, affected assets, relevant controls and investments |
| Crisis Simulator | `/simulator` | One illustrative incident by scenario and severity, with stage probabilities, loss breakdown, recovery and clinical impact, plus an optional annual Monte Carlo run |
| Investment Planner | `/investments` | Adjustable budget (up to $2M) and investment selection, with engine-evaluated effects, overlaps, dependencies and clinical guardrails |
| Risk Analytics | `/analytics` | Frequency × magnitude breakdown, Monte Carlo loss statistics (mean, median, P90, P95), stress tests and parameter sensitivity |
| Executive Comparison | `/comparison` | No investment vs the CISO portfolio vs the optimized portfolio, with a recommendation, trade-offs and tail risk |
| Dashboard | `/dashboard` | Saved simulation runs by portfolio and loss horizon, with a loss histogram, incident mix and FAIR comparison table |

Budget and investment choices are shared between the Planner, Risk Analytics and Executive Comparison. Every figure is recomputed by the backend; the frontend performs no risk calculations.

The Dashboard uses the current planner selection for new simulations. Completed Monte Carlo runs across the platform are saved in `backend/.local/dashboard.sqlite3`. Set `WARDLINE_RUN_DATABASE` to use a different SQLite file. Saved charts retain the run's original portfolios and settings. Three- and five-year views sum complete, non-overlapping groups of simulated years.

## Technology stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide icons ([`frontend/`](frontend/))
- **Backend API:** FastAPI, Pydantic v2, Uvicorn ([`backend/api/`](backend/api/))
- **Risk engine:** Python 3 + NumPy, v8 ([`backend/risk_engine/`](backend/risk_engine/)). It covers FAIR-style analytic expected loss, bottom-up incident costs, paired Monte Carlo simulation (`comparison.compare`), exhaustive portfolio optimization, stress tests and parameter sensitivity.

## Local setup

Requirements: Python 3.12+ and Node.js 20+. All commands are run from this folder.

**1. Backend API**

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn backend.api.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

**2. Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The API address defaults to `http://localhost:8000`; to change it, copy `frontend/.env.example` to `frontend/.env.local`.

## Tests and checks

```bash
backend/.venv/bin/python -m unittest discover -s backend/api/tests -t .
cd backend/risk_engine && ../.venv/bin/python -m unittest discover -s tests
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

## Documentation

- [Frontend README](frontend/README.md): structure, configuration and checks
- [Backend API README](backend/api/README.md): endpoints, request formats, budget and sensitivity behavior
- [Risk engine README](backend/risk_engine/README.md), with version notes in [V5](backend/risk_engine/README_V5.md), [V6](backend/risk_engine/README_V6.md), [V7](backend/risk_engine/README_V7.md) and [V8](backend/risk_engine/README_V8.md): model equations, assumptions and limitations
- [Synthetic dataset notes](backend/risk_engine/data/README.md)

## Key limitations

- All inputs are synthetic assumptions. The stress tests are hypothetical what-if cases, not confidence intervals.
- Incident losses depend on severity only, not on the attack scenario.
- The optimizer maximizes expected net benefit within the budget and clinical guardrails. It does not optimize for tail risk.
- Investments are all-or-nothing and take effect immediately. The budget is first-year cash, capped at the engine's $2M.
