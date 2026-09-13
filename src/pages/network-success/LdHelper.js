import { useMemo, useState } from "react";
import { calculateLdQuestionnaire, DEFAULT_LD_ANSWERS, LD_QUESTIONS } from "./liquidatedDamagesRules";

const currency = (value) => value.toLocaleString(undefined, { style: "currency", currency: "USD" });

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

const YesNoQuestion = ({ number, item, value, onChange, children }) => (
  <section className={`rounded-xl border bg-white transition ${value === "yes" ? "border-brand-300 ring-1 ring-brand-100" : value === "no" ? "border-slate-200" : "border-amber-200"}`}>
    <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-start sm:p-5">
      <div className="flex gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${value ? "bg-slate-800 text-white" : "bg-amber-100 text-amber-800"}`}>{number}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
          <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">{item.question}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500">{item.requirement}</p>
          <p className="mt-2 text-xs font-semibold text-brand-700">{item.consequence}</p>
        </div>
      </div>
      <fieldset>
        <legend className="sr-only">{item.question}</legend>
        <div className="grid grid-cols-2 gap-2">
          {["yes", "no"].map((answer) => (
            <label key={answer} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold capitalize transition ${value === answer ? answer === "yes" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}>
              <input type="radio" name={item.id} value={answer} checked={value === answer} onChange={(event) => onChange(event.target.value)} className="sr-only" />
              {answer}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
    {value === "yes" && children && <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-5"><div className="ml-10">{children}</div></div>}
  </section>
);

const Result = ({ result }) => {
  if (!result.ready) {
    return (
      <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Questionnaire progress</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{result.answeredCount} of {result.totalQuestions}</p>
        <progress value={result.answeredCount} max={result.totalQuestions} aria-label="Questionnaire completion" className="mt-3 h-2 w-full accent-brand-600" />
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {result.remainingCount > 0 ? `Answer ${result.remainingCount} more yes/no question${result.remainingCount === 1 ? "" : "s"}.` : "Complete the required quantities below each Yes answer."}
        </p>
        {result.missingDetails.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-amber-800">
            {result.missingDetails.map((detail) => <li key={detail}>• {detail}</li>)}
          </ul>
        )}
      </section>
    );
  }

  const hasTermination = result.terminationReasons.length > 0;
  const hasOutcome = result.amount > 0 || hasTermination;
  return (
    <section aria-labelledby="ld-result-heading" aria-live="polite" className={`rounded-2xl border p-5 shadow-sm ${hasTermination ? "border-red-200 bg-red-50" : hasOutcome ? "border-brand-200 bg-brand-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${hasTermination ? "text-red-700" : hasOutcome ? "text-brand-700" : "text-emerald-700"}`}>Completed assessment</p>
      <h2 id="ld-result-heading" className="mt-2 text-xl font-semibold text-slate-900">{hasOutcome ? "Total scheduled LD" : "No LD indicated"}</h2>
      <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{currency(result.amount)}</p>

      {hasTermination && (
        <div className="mt-4 rounded-lg border border-red-200 bg-white/70 px-3.5 py-3">
          <p className="text-sm font-semibold text-red-800">Contract termination specified</p>
          <ul className="mt-1 space-y-1 text-sm leading-5 text-red-700">
            {result.terminationReasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      )}

      {result.lineItems.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-white/80 bg-white/80">
          {result.lineItems.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 border-b border-slate-100 px-3 py-3 text-sm last:border-0">
              <div>
                <p className="font-medium text-slate-800">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.quantity} x {currency(item.rate)}</p>
              </div>
              <p className="font-semibold text-slate-900">{currency(item.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {result.preventableRate !== null && !result.terminationReasons.some((reason) => reason.startsWith("Preventable")) && (
        <p className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">Preventable accident rate: <span className="font-semibold">{result.preventableRate.toFixed(2)} per 60,000 miles</span> - within the 1.0 maximum.</p>
      )}
    </section>
  );
};

const LdHelper = () => {
  const [answers, setAnswers] = useState(DEFAULT_LD_ANSWERS);
  const result = useMemo(() => calculateLdQuestionnaire(answers), [answers]);
  const update = (key, value) => setAnswers((current) => ({ ...current, [key]: value }));

  const details = {
    openWork: <NumberField label="Number of uncovered route-days" value={answers.openWorkCount} onChange={(value) => update("openWorkCount", value)} />,
    openRoute: <NumberField label="Number of after-7 PM occurrences" value={answers.openRouteCount} onChange={(value) => update("openRouteCount", value)} help="This is added separately from any Open Work charge." />,
    lateFirstPickup: <NumberField label="Number of late first-pickup occurrences" value={answers.lateFirstPickupCount} onChange={(value) => update("lateFirstPickupCount", value)} />,
    accidentReporting: <NumberField label="Number of late or unreported accidents" value={answers.accidentReportingCount} onChange={(value) => update("accidentReportingCount", value)} />,
    vehicleCleanliness: <NumberField label="Number of cleanliness findings" value={answers.vehicleCleanlinessCount} onChange={(value) => update("vehicleCleanlinessCount", value)} />,
    driverAppearance: <NumberField label="Number of appearance findings" value={answers.driverAppearanceCount} onChange={(value) => update("driverAppearanceCount", value)} />,
    preventableAccidents: (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Preventable accidents" value={answers.preventableAccidentCount} onChange={(value) => update("preventableAccidentCount", value)} />
        <NumberField label="Miles driven in the same period" value={answers.milesDriven} onChange={(value) => update("milesDriven", value)} />
      </div>
    ),
    noLeaveBehind: <NumberField label="Damages levied against Big Star by the Authority" value={answers.authorityDamages} onChange={(value) => update("authorityDamages", value)} step="0.01" help="Enter the Authority's actual amount; do not estimate it." />,
  };

  return (
    <section aria-labelledby="ld-helper-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Contract-controlled assessment</p>
          <h2 id="ld-helper-heading" className="mt-1 text-2xl font-semibold text-slate-900">Liquidated Damages Questionnaire</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Answer every question. Multiple Yes answers are combined automatically into one assessment; custom reasons are not allowed.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />Not saved</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.65fr)] lg:items-start">
        <div className="space-y-3">
          {LD_QUESTIONS.map((item, index) => (
            <YesNoQuestion key={item.id} number={index + 1} item={item} value={answers[item.id]} onChange={(value) => update(item.id, value)}>
              {details[item.id]}
            </YesNoQuestion>
          ))}
        </div>

        <div className="space-y-4 lg:sticky lg:top-5">
          <Result result={result} />
          <button type="button" onClick={() => setAnswers({ ...DEFAULT_LD_ANSWERS })} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">Reset questionnaire</button>
        </div>
      </div>

      <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><span className="font-semibold">Contract check:</span> This helper applies only the supplied liquidated-damages table. Confirm the current agreement, supporting documentation, and required approvals before assessing an LD.</aside>
    </section>
  );
};

export default LdHelper;
