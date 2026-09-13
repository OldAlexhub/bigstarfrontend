const TEMPLATE_METADATA = {
  "NOTICE OF CONCERN": {
    title: "Notice of Concern",
    useCase: "Document an initial performance or compliance concern, set clear expectations, and request timely corrective action.",
  },
  "NOTICE OF PROVIDER ROUTE REALLOCATION": {
    title: "Notice of Provider Route Reallocation",
    useCase: "Notify a provider that an assigned route is being moved or reassigned because of network, service, or operational needs.",
  },
  "PROVIDER NOTICE OF CONTRACT TERMINATION": {
    title: "Provider Notice of Contract Termination",
    useCase: "Issue formal notice that a provider agreement or service relationship is ending after the required internal and contractual approvals.",
  },
  "PROVIDER RECOGNITION FOR PERFORMANCE": {
    title: "Provider Recognition for Performance",
    useCase: "Recognize strong provider results, reinforce the behaviors that produced them, and create a record of positive performance.",
  },
  "REQUEST FOR PROVIDER QUALITY CONTROL MEETING": {
    title: "Request for Provider Quality Control Meeting",
    useCase: "Invite a provider to a structured review of service quality, current findings, expectations, and agreed corrective actions.",
  },
  "NOTICE OF PROVIDER NO SHOW": {
    title: "Notice of Provider No-Show",
    useCase: "Document that a provider did not cover an assigned route and request an explanation and immediate reliability follow-up.",
  },
  "NOTICE OF ROUTE SUSPENSION RECEIVED": {
    title: "Notice of Route Suspension Received",
    useCase: "Confirm receipt of a route-suspension request and communicate the operational, service, or financial next steps.",
  },
  "NOTICE OF HABITUAL ROUTE SUSPENSIONS": {
    title: "Notice of Habitual Route Suspensions",
    useCase: "Address a recurring pattern of route suspensions, explain its network impact, and require sustained reliability improvement.",
  },
  "NOTICE OF TUI PERFORMANCE IMPROVEMENT": {
    title: "Notice of TUI Performance Improvement",
    useCase: "Notify a provider that TUI performance is below expectations and define the improvement and follow-up required.",
  },
};

const templateModules = import.meta.glob("../../assets/email-templates/**/*.oft", {
  eager: true,
  query: "?url",
  import: "default",
});

const fileStem = (fileName) => fileName.replace(/\.oft$/i, "").trim();

const titleFromStem = (stem) => stem
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ")
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .replace(/\bTui\b/g, "TUI");

const categoryFromPath = (path) => path.includes("RELIABILITY_PROFITABILITY")
  ? "Reliability & Profitability"
  : "Provider Management";

export const EMAIL_TEMPLATES = Object.entries(templateModules)
  .map(([path, url]) => {
    const fileName = path.split("/").pop();
    const stem = fileStem(fileName);
    const metadata = TEMPLATE_METADATA[stem.toUpperCase()] || {};
    const title = metadata.title || titleFromStem(stem);

    return {
      fileName,
      title,
      category: metadata.category || categoryFromPath(path),
      useCase: metadata.useCase || `Use this template for provider communication related to ${title.toLowerCase()}. Tailor the details before sending.`,
      url,
    };
  })
  .sort((left, right) => left.category.localeCompare(right.category) || left.title.localeCompare(right.title));

export const EMAIL_TEMPLATE_CATEGORIES = [
  "All templates",
  ...new Set(EMAIL_TEMPLATES.map((template) => template.category)),
];
