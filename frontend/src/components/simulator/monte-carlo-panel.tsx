"use client";

import { useState, type FormEvent } from "react";
import { Building2, LoaderCircle, Play, Sigma } from "lucide-react";
import { ApiError, apiPost, toApiError } from "@/lib/api";
import type { SimulateRequest, SimulateResponse } from "@/lib/types";
import { formatCurrency, formatFraction, formatNumber } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { ErrorState } from "@/components/ui/states";
import { InlineDisclosure } from "@/components/ui/disclosure";
import { Kind } from "@/components/threats/threat-copy";

const YEAR_OPTIONS = [5_000, 20_000, 50_000];
const DEFAULT_SEED = 2026;

const FIELD =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-100";

/** Annual Monte Carlo run (POST /api/simulate → comparison.compare), no-new-investment baseline, whole hospital. */
export function MonteCarloPanel({ scenarioCount }: { scenarioCount?: number }) {
  const [years, setYears] = useState(20_000);
  const [seed, setSeed] = useState(String(DEFAULT_SEED));
  const [mode, setMode] = useState<SimulateRequest["uncertainty_mode"]>("central");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<SimulateResponse | null>(null);

  const seedNumber = Number(seed);
  const seedValid = seed.trim() !== "" && Number.isInteger(seedNumber) && seedNumber >= 0 && seedNumber <= 4_294_967_295;

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!seedValid || running) return;
    setRunning(true);
    setError(null);
    try {
      const body: SimulateRequest = { investment_ids: [], years, seed: seedNumber, uncertainty_mode: mode };
      setResult(await apiPost<SimulateResponse>("/api/simulate", body));
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setRunning(false);
    }
  };

  const base = result?.simulated.strategies.baseline;

  return (
    <Card>
      <CardHeader
        title="How costly could a ransomware year become?"
        icon={<Sigma className="size-4" aria-hidden />}
        description="With today's protections, see what ransomware could cost us in a typical year and how high losses could climb in a bad one."
        actions={<Kind>Simulated · Monte Carlo</Kind>}
      />
      <CardBody className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-navy-100 bg-navy-50/50 px-4 py-3 text-sm text-navy-900">
          <Building2 className="mt-0.5 size-4 shrink-0 text-navy-600" aria-hidden />
          <p className="leading-relaxed">
            <strong className="font-semibold">Whole hospital, every attack scenario{scenarioCount ? ` (all ${scenarioCount})` : ""}, no new investment.</strong>{" "}
            This simulation ignores the scenario and severity chosen above: each simulated year can contain any number of incidents, of any type and
            severity.
          </p>
        </div>

        <form onSubmit={run} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="text-sm sm:w-48">
              <span className="font-medium text-slate-700">Years to simulate</span>
              <select value={years} onChange={(e) => setYears(Number(e.target.value))} className={FIELD}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {formatNumber(y)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={running || !seedValid}
              className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 text-sm font-medium text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {running ? "Simulating…" : result ? "Run again" : "Run simulation"}
            </button>
          </div>
          <InlineDisclosure label="Advanced settings">
            <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
              <label className="text-sm">
                <span className="font-medium text-slate-700">Random seed</span>
                <input
                  inputMode="numeric"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  aria-invalid={!seedValid}
                  className={`${FIELD} tabular aria-[invalid=true]:border-rose-400`}
                />
                <span className="mt-1 block text-xs text-slate-500">The same seed reproduces the same results.</span>
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-700">Uncertainty mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value as SimulateRequest["uncertainty_mode"])} className={FIELD}>
                  <option value="central">Central (mean probabilities)</option>
                  <option value="epistemic_draw">Epistemic draw (sampled probabilities)</option>
                </select>
                <span className="mt-1 block text-xs text-slate-500">Epistemic draw also varies the probabilities themselves.</span>
              </label>
            </div>
          </InlineDisclosure>
          {!seedValid && <p className="text-xs text-rose-700">Random seed must be a whole number of 0 or more (see Advanced settings).</p>}
        </form>

        {error && <ErrorState error={error} onRetry={() => run()} title="Simulation failed" compact />}

        {running && !result && (
          <p role="status" className="text-sm text-slate-500">
            Simulating {formatNumber(years)} years…
          </p>
        )}

        {base && result && (
          <div className={running ? "space-y-4 opacity-60 transition-opacity" : "space-y-4"} aria-busy={running} aria-live="polite">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat emphasis label="Average year" value={formatCurrency(base.mean_annual_loss_usd, { compact: true })} hint="The average loss across all simulated years" />
              <Stat label="Typical year (median)" value={formatCurrency(base.median_annual_loss_usd, { compact: true })} hint="Half of simulated years cost less than this" />
              <Stat label="Bad year (P90)" value={formatCurrency(base.p90_annual_loss_usd, { compact: true })} hint="Only 1 year in 10 costs more than this" />
              <Stat label="Very bad year (P95)" value={formatCurrency(base.p95_annual_loss_usd, { compact: true })} hint="Only 1 year in 20 costs more than this" />
            </div>

            <LossLadder
              points={[
                { label: "Typical", value: base.median_annual_loss_usd },
                { label: "Average", value: base.mean_annual_loss_usd },
                { label: "Bad (P90)", value: base.p90_annual_loss_usd },
                { label: "Very bad (P95)", value: base.p95_annual_loss_usd },
              ]}
            />
            <p className="text-sm text-slate-600">
              In <span className="tabular font-semibold text-slate-800">{formatFraction(base.probability_any_disruptive_event, 0)}</span> of simulated years
              at least one disruptive incident happened.
              {base.mean_annual_loss_usd > 1.5 * base.median_annual_loss_usd &&
                " A few bad years carry very large losses, which pulls the average well above the typical year."}
            </p>

            <InlineDisclosure label="More results">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Stat label="Disruptive incidents / year" value={formatNumber(base.expected_events_per_year, 2)} hint="Average count" />
                <Stat label="Recovery days / year" value={formatNumber(base.mean_annual_recovery_days, 1)} hint="Average, summed over incidents" />
                <Stat label="Patients diverted / year" value={formatNumber(base.mean_annual_diverted_patients)} hint="Average exposure indicator" />
                <Stat label="Appointments delayed / year" value={formatNumber(base.mean_annual_delayed_appointments)} hint="Average exposure indicator" />
                <Stat label="Reputation loss / year" value={formatCurrency(base.mean_annual_reputation_loss_usd, { compact: true })} hint="Already included in the annual loss" />
                <Stat label="Years with an incident" value={formatFraction(base.probability_any_disruptive_event, 1)} hint="Share of simulated years" />
              </div>
            </InlineDisclosure>

            <InlineDisclosure label="How does this simulation work?">
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
                <p>
                  A Monte Carlo simulation replays the same year thousands of times using the risk model&apos;s assumptions. It explores the range of
                  possible outcomes; it does not predict when an attack will happen or exactly what it will cost.
                </p>
                <p>
                  In each simulated year the engine draws random attack attempts for every scenario. Each attempt passes or fails each attack stage, and every
                  resulting incident gets a severity, a sampled recovery time and costs. The results summarize the yearly totals.
                </p>
                <p className="text-xs text-slate-500">
                  This run: {formatNumber(result.simulated.years)} years · seed {result.simulated.seed} ·{" "}
                  {result.simulated.uncertainty_mode === "central" ? "central" : "epistemic draw"} mode · {result.simulated.method}.
                </p>
                <p className="text-xs text-slate-500">{result.simulated.note}</p>
              </div>
            </InlineDisclosure>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * The four API statistics placed on one dollar axis (0 → largest value), so the gap between a
 * typical and a very bad year is visible. Display scaling only; no values are derived.
 */
function LossLadder({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="text-xs font-medium text-slate-500">Annual loss, from a typical year to a very bad one</figcaption>
      <ul className="mt-3 space-y-2">
        {points.map((p, i) => (
          <li key={p.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs sm:grid-cols-[8rem_minmax(0,1fr)_5rem]">
            <span className="text-slate-600">{p.label}</span>
            <span className="h-3 rounded-r-[4px] bg-slate-100">
              <span
                className="block h-full rounded-r-[4px]"
                style={{ width: `${Math.max((p.value / max) * 100, 0.5)}%`, background: i === 1 ? "var(--color-navy-800)" : "var(--color-navy-300)" }}
              />
            </span>
            <span className="tabular text-right font-semibold text-slate-900">{formatCurrency(p.value, { compact: true })}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
