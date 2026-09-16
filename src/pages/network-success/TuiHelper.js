import { useMemo, useState } from "react";
import {
  calculateTui,
  createTuiTier,
  DEFAULT_TUI_INPUTS,
  DEFAULT_TUI_TIERS,
  PAYMENT_METHOD_CONCEPT_EXPLANATIONS,
  PAYMENT_METHOD_TEACHING_EXAMPLES,
  PAYMENT_METHODS,
} from "./tuiIncentiveRules";

const currency = (value) => Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
const percent = (value) => `${Number(value).toFixed(1)}%`;

const NumberField = ({ label, value, onChange, step = "1", help }) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
    />
    {help && <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{help}</span>}
  </label>
);

const PaymentMethodPicker = ({ value, onChange }) => (
  <fieldset>
    <legend className="text-sm font-medium text-slate-700">Payment method for this division</legend>
    <div className="mt-1.5 grid grid-cols-2 gap-2">
      {PAYMENT_METHODS.map((method) => (
        <label key={method.id} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition ${value === method.id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}>
          <input type="radio" name="paymentMethod" value={method.id} checked={value === method.id} onChange={(event) => onChange(event.target.value)} className="sr-only" />
          {method.label}
        </label>
      ))}
    </div>
  </fieldset>
);

// Teaches the relationship the whole tool is built around: Core Hours -> Fulfillment %
// -> TUI tier -> pay rate -> per trip or per hour. Fills in with real values as the
// Manager types, so it doubles as a live summary once the form is filled in.
const FlowDiagram = ({ result }) => {
  const steps = [
    { label: "Required Core Hours", value: result.requiredCoreHours ?? "—" },
    { label: "Actual Core Hours", value: result.actualCoreHours ?? "—" },
    { label: "Fulfillment %", value: result.fulfillmentPercent != null ? `${result.fulfillmentPercent.toFixed(0)}%` : "—" },
    { label: "TUI tier", value: result.achievedTier ? result.achievedTier.label : result.ready ? "See Schedule A" : "—" },
    { label: "Pay rate", value: result.rateReady ? currency(result.finalRate) : result.ready ? "See Schedule A" : "—" },
    { label: "Per trip / per hour", value: result.paymentMethodLabel ?? "—" },
  ];
  return (
    <section aria-label="How Core Hours turn into a pay rate" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-1.5">
            <div className="flex min-w-[108px] flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{step.label}</span>
              <span className="mt-0.5 text-sm font-bold text-slate-900">{step.value}</span>
            </div>
            {index < steps.length - 1 && <span aria-hidden="true" className="text-slate-300">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">Core Hours determine the TUI tier. The TUI tier determines the rate. The division's Schedule A determines the actual numbers.</p>
    </section>
  );
};

// Once a base rate and at least one tier are entered in the optional Schedule A
// section below, this walks through THAT division's real rate ladder instead of the
// generic illustrative numbers - it follows whatever was actually typed in.
const TeachingExample = ({ result }) => {
  const { paymentMethod, baseRateEntered, baseRate, validTiers, achievedTier, ready } = result;
  if (!paymentMethod) {
    return <p className="text-sm leading-6 text-slate-500">Pick Per Trip or Per Hour above to see a simple example of how a TUI tier changes the rate.</p>;
  }

  const usingSchedule = baseRateEntered && validTiers.length > 0;
  const unit = usingSchedule ? (paymentMethod === "per_hour" ? "/ hour" : "/ trip") : PAYMENT_METHOD_TEACHING_EXAMPLES[paymentMethod].unit;
  const showCurrent = usingSchedule && ready;

  const rows = usingSchedule
    ? [
        { key: "base", tier: "Base rate", rate: baseRate, current: showCurrent && !achievedTier },
        ...validTiers.map((tier) => ({ key: tier.id, tier: tier.label, rate: baseRate + tier.tuiAmount, current: showCurrent && achievedTier?.id === tier.id })),
      ]
    : PAYMENT_METHOD_TEACHING_EXAMPLES[paymentMethod].rows.map((row) => ({ key: row.tier, tier: row.tier, rate: row.rate, current: false }));

  return (
    <div>
      <p className="text-sm leading-6 text-slate-700">{PAYMENT_METHOD_CONCEPT_EXPLANATIONS[paymentMethod]}</p>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        {rows.map((row) => (
          <div key={row.key} className={`flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0 ${row.current ? "bg-brand-50" : "bg-white"}`}>
            <span className="text-slate-600">
              {row.tier}
              {row.current && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Current</span>}
            </span>
            <span className="font-semibold text-slate-900">{currency(row.rate)} {unit}</span>
          </div>
        ))}
      </div>
      {usingSchedule ? (
        <p className="mt-2 text-xs text-slate-400">From the Schedule A entered below.</p>
      ) : (
        <p className="mt-2 text-xs italic text-slate-400">Example only - not this division's real rates. Enter this division's Schedule A below to see its real numbers here.</p>
      )}
    </div>
  );
};

const TierRow = ({ index, tier, onChange, onRemove, removable }) => (
  <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.9fr)_auto] sm:items-end">
    <label className="block text-xs font-medium text-slate-600">
      Tier {index + 1} name
      <input
        type="text"
        value={tier.label}
        placeholder="e.g., Tier 1"
        aria-label={`Tier ${index + 1} name`}
        onChange={(event) => onChange(tier.id, "label", event.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
    <label className="block text-xs font-medium text-slate-600">
      Min. fulfillment %
      <input
        type="number"
        min="0"
        step="1"
        value={tier.threshold}
        aria-label={`Tier ${index + 1} minimum Core Hour fulfillment percent`}
        onChange={(event) => onChange(tier.id, "threshold", event.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
    <label className="block text-xs font-medium text-slate-600">
      TUI amount ($ added to base)
      <input
        type="number"
        min="0"
        step="0.01"
        value={tier.tuiAmount}
        aria-label={`Tier ${index + 1} TUI amount`}
        onChange={(event) => onChange(tier.id, "tuiAmount", event.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
    <button
      type="button"
      onClick={() => onRemove(tier.id)}
      disabled={!removable}
      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Remove
    </button>
  </div>
);

const ResultRow = ({ label, value, emphasize }) => (
  <div className="flex items-center justify-between py-2">
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className={emphasize ? "text-lg font-bold text-slate-950" : "font-semibold text-slate-900"}>{value}</dd>
  </div>
);

const Result = ({ result }) => {
  const [copied, setCopied] = useState(false);

  const copyTalkingPoint = () => {
    if (!result.talkingPoint) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(result.talkingPoint).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }
  };

  if (!result.ready) {
    return (
      <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Core Hour fulfillment</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Fill in the fields to the left to explain this provider's Core Hour Fulfillment %.</p>
        {result.missingDetails.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {result.missingDetails.map((detail) => <li key={detail}>• {detail}</li>)}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="tui-figures-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p id="tui-figures-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">At a glance</p>
        <dl className="mt-2 divide-y divide-slate-100 text-sm">
          <ResultRow label="Core Hours required" value={result.requiredCoreHours} />
          <ResultRow label="Core Hours performed" value={result.actualCoreHours} />
          <ResultRow label="Core Hour fulfillment" value={percent(result.fulfillmentPercent)} emphasize />
          <ResultRow label="Core Hours remaining" value={result.hasReached100 ? "0 - 100% reached" : result.hoursRemaining} />
          <ResultRow label="TUI tier achieved" value={result.achievedTier ? result.achievedTier.label : result.validTiers.length > 0 ? "Below lowest tier" : "Enter Schedule A below"} />
          <ResultRow label="Payment method" value={result.paymentMethodLabel} />
          <ResultRow label="Final rate" value={result.rateReady ? `${currency(result.finalRate)} ${result.paymentMethod === "per_hour" ? "/ hour" : "/ trip"}` : "Enter base rate below"} emphasize />
          {result.paymentMethod === "per_trip" && (
            <>
              <ResultRow label="Trips completed" value={result.tripsCompleted ?? "Not entered"} />
              <ResultRow label="Total pay" value={result.totalPayReady ? currency(result.totalPay) : "Enter trips + base rate"} emphasize />
            </>
          )}
        </dl>
        {!result.achievedTier && result.nextTier && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {result.hoursToNextTier} more Core Hour{result.hoursToNextTier === 1 ? "" : "s"} reaches the "{result.nextTier.label}" tier.
          </p>
        )}
      </section>

      <section aria-labelledby="tui-fulfillment-heading" aria-live="polite" className={`rounded-2xl border p-5 shadow-sm ${result.hasReached100 ? "border-emerald-200 bg-emerald-50" : "border-brand-200 bg-brand-50"}`}>
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${result.hasReached100 ? "text-emerald-700" : "text-brand-700"}`}>Visual explanation</p>
        <h2 id="tui-fulfillment-heading" className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{percent(result.fulfillmentPercent)}</h2>
        <progress value={Math.min(100, result.fulfillmentPercent)} max={100} aria-label="Core Hour fulfillment percent" className="mt-3 h-2 w-full accent-brand-600" />
        <p className="mt-3 text-sm leading-6 text-slate-700">{result.visualExplanation}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{result.paymentMethodFulfillmentExplanation}</p>
      </section>

      <section aria-labelledby="tui-explain-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p id="tui-explain-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Network Success talking point</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{result.simpleExplanation}</p>
        {result.talkingPoint && (
          <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-700">Say this to the provider</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-800">{result.talkingPoint}</p>
            <button type="button" onClick={copyTalkingPoint} className="mt-2 rounded-md border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
              {copied ? "Copied" : "Copy talking point"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

const TuiHelper = () => {
  const [inputs, setInputs] = useState(DEFAULT_TUI_INPUTS);
  const [tiers, setTiers] = useState(DEFAULT_TUI_TIERS);
  const result = useMemo(() => calculateTui(inputs, tiers), [inputs, tiers]);

  const update = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const updateTier = (id, key, value) => setTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, [key]: value } : tier)));
  const addTier = () => setTiers((current) => [...current, createTuiTier()]);
  const removeTier = (id) => setTiers((current) => (current.length > 1 ? current.filter((tier) => tier.id !== id) : current));
  const reset = () => {
    setInputs({ ...DEFAULT_TUI_INPUTS });
    setTiers(DEFAULT_TUI_TIERS.map((tier) => ({ ...tier })));
  };

  return (
    <section aria-labelledby="tui-helper-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Learn TUI in 30 seconds</p>
          <h2 id="tui-helper-heading" className="mt-1 text-2xl font-semibold text-slate-900">TUI Helper</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Core Hours determine the provider's TUI tier, and the TUI tier determines their rate. Enter the
            provider's Core Hours below to see - and explain - exactly how that works.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />Not saved</span>
      </div>

      <FlowDiagram result={result} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(310px,.8fr)] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Provider's Core Hours</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <NumberField label="Required Core Hours" value={inputs.requiredCoreHours} onChange={(value) => update("requiredCoreHours", value)} />
              <NumberField label="Actual Core Hours Performed" value={inputs.actualCoreHours} onChange={(value) => update("actualCoreHours", value)} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Payment method</h3>
            <div className="mt-3 max-w-xs">
              <PaymentMethodPicker value={inputs.paymentMethod} onChange={(value) => update("paymentMethod", value)} />
            </div>
            {inputs.paymentMethod === "per_trip" && (
              <div className="mt-4 max-w-xs">
                <NumberField label="Trips Completed" value={inputs.tripsCompleted} onChange={(value) => update("tripsCompleted", value)} help="Multiplied by the final rate to show total pay for this period." />
              </div>
            )}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">How a TUI tier changes the rate</p>
              <div className="mt-2">
                <TeachingExample result={result} />
              </div>
            </div>
          </section>

          <details className="group rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="inline-block text-slate-400 transition group-open:rotate-90">›</span>
                Optional: apply this division's Schedule A
              </span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">Only fill this in if you have the division's actual Schedule A numbers on hand. Leave it blank to keep this a pure explainer.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <NumberField label="Base Rate" value={inputs.baseRate} onChange={(value) => update("baseRate", value)} step="0.01" help="Before any TUI is added." />
              <NumberField label="Bonus Hours beyond requirement (optional)" value={inputs.bonusHours} onChange={(value) => update("bonusHours", value)} />
              <NumberField label="Bonus Rate (optional)" value={inputs.bonusRate} onChange={(value) => update("bonusRate", value)} step="0.01" />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">TUI tiers</p>
                <button type="button" onClick={addTier} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">+ Add tier</button>
              </div>
              <div className="mt-2 space-y-2">
                {tiers.map((tier, index) => (
                  <TierRow key={tier.id} index={index} tier={tier} onChange={updateTier} onRemove={removeTier} removable={tiers.length > 1} />
                ))}
              </div>
            </div>
          </details>
        </div>

        <div className="space-y-4 lg:sticky lg:top-5">
          <Result result={result} />
          <button type="button" onClick={reset} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">Reset</button>
        </div>
      </div>

      <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><span className="font-semibold">Schedule A check:</span> The example rates above are for teaching the concept only. For a real provider, always confirm the division's actual Schedule A - Core Hour requirement, TUI tiers, base rate, payment method, and bonus rules - before quoting a number.</aside>
    </section>
  );
};

export default TuiHelper;
