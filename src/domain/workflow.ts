import { canRecordStatus } from "./transitions";
import type {
  Doc,
  Opportunity,
  Application,
  Store,
  Feed,
  PreparedFeed,
} from "./types";
export const KEY = "job-hunt-loop-v6";
const validId = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[A-Za-z0-9_-]{1,100}$/.test(v) &&
  !["__proto__", "constructor", "prototype"].includes(v);
export const https = (v: string) => {
  try {
    const u = new URL(v);
    return (
      u.protocol === "https:" && !!u.hostname && !u.username && !u.password
    );
  } catch {
    return false;
  }
};
export const labels: Record<string, string> = {
  onsite: "Work on site at the example location?",
  compensation: "Desired compensation",
  metal: "Do you have direct metal-additive experience?",
};
const preferences = (): Store["preferences"] => ({
  roles: "",
  locations: "",
  level: "Any",
  resume: null,
  complete: false,
});
export const defaults = (): Store => ({
  schema: 6,
  revision: 2,
  jobs: [
    {
      id: "demo-company",
      sourceId: "DEMO-001",
      packet: "DEMO-KIT",
      company: "Example Manufacturing",
      role: "Sample technician role",
      location: "Example City",
      url: "https://example.com/careers",
      demo: true,
      issue: "",
      questions: ["onsite", "compensation", "metal"],
      questionsVerified: true,
      documents: [],
      postingCheckedAt: "",
      materialsChecked: false,
    },
    {
      id: "demo-lab",
      sourceId: "DEMO-002",
      packet: null,
      company: "Example Lab",
      role: "Sample manufacturing technician",
      location: "Not verified",
      url: "",
      demo: true,
      issue:
        "Legacy DEMO-002 conflicts with another employer. Resolve in the CRM.",
      questions: [],
      questionsVerified: false,
      documents: [],
      postingCheckedAt: "",
      materialsChecked: false,
    },
  ],
  answers: {},
  applications: {},
  saved: {},
  events: [],
  pending: null,
  source: "Examples \u00B7 CRM not connected",
  importedAt: null,
  preferences: preferences(),
  filters: {
    query: "",
    location: "",
    level: "Any",
    sort: "preparation",
    savedOnly: false,
  },
  snoozed: {},
  reminders: {},
  snapshotInstalled: false,
});
export function compensation(value: string) {
  const m = String(value || "")
    .replace(/[$,\s]/g, "")
    .match(/^(\d+(?:\.\d{1,2})?)(?:[-–—](\d+(?:\.\d{1,2})?))?$/);
  return (
    !!m &&
    Number(m[1]) > 0 &&
    Number(m[1]) <= 10000000 &&
    (!m[2] || (Number(m[2]) >= Number(m[1]) && Number(m[2]) <= 10000000))
  );
}
export function hasQuestions(job: Opportunity) {
  return (
    !!job.packet &&
    job.questionsVerified !== false &&
    (job.questions.length > 0 || job.questionsVerified === true)
  );
}
export function missing(job: Opportunity, s: Store) {
  return job.questions.filter((q) => {
    const a = s.answers[job.id] || {},
      v = a[q];
    return q === "compensation"
      ? !(
          compensation(v) &&
          ["USD", "EUR", "GBP", "INR"].includes(a.compensationCurrency) &&
          ["Hourly", "Annual"].includes(a.compensationPeriod)
        )
      : ["onsite", "metal"].includes(q)
        ? !["Yes", "No"].includes(v)
        : !String(v || "").trim();
  });
}
export function answersComplete(job: Opportunity, s: Store) {
  return hasQuestions(job) && !job.issue && missing(job, s).length === 0;
}
export function answerText(job: Opportunity, s: Store, q: string) {
  const a = s.answers[job.id] || {};
  return q === "compensation" && a[q]
    ? `${a.compensationCurrency || "Currency needed"} ${a[q]} / ${a.compensationPeriod === "Hourly" ? "hour" : a.compensationPeriod === "Annual" ? "year" : "period needed"}`
    : a[q] || "Not answered";
}
export function questionLabel(job: Opportunity, q: string) {
  return job.questionLabels?.[q] || labels[q] || q.replace(/_/g, " ");
}
export function application(job: Opportunity, s: Store): Application {
  return (
    s.applications[job.id] || { status: "not_submitted", evidence: "none" }
  );
}
const usable = (d: Doc) =>
  !!d.version && !!(d.url || d.localKey || d.localUri || d.bundle);
const requiredFiles = (job: Opportunity) =>
  job.documents.filter((d) => d.kind === "resume" || d.required);
export function preparationBlockers(job: Opportunity, s: Store) {
  const out = [];
  if (job.issue) out.push(job.issue);
  if (!job.packet)
    out.push("Load a preparation packet from the canonical CRM.");
  if (!hasQuestions(job))
    out.push("Question list unavailable. Repair this packet in the CRM.");
  const n = missing(job, s).length;
  if (n) out.push(`${n} preparation answer${n === 1 ? "" : "s"} need you.`);
  if (!job.documents.some((d) => d.kind === "resume"))
    out.push("Link the r\u00E9sum\u00E9 you will upload.");
  if (job.documents.some((d) => d.required && !usable(d)))
    out.push("A required document is missing its file or version.");
  if (requiredFiles(job).some((d) => !d.reviewed || !usable(d)))
    out.push("Preview and review each required document.");
  if (!job.postingCheckedAt)
    out.push("Check the current posting and form requirements.");
  if (!job.materialsChecked)
    out.push("Confirm that the current kit and answers match this employer.");
  return out;
}
export function handoffBlockers(job: Opportunity, s: Store) {
  const out = preparationBlockers(job, s);
  if (job.demo)
    out.push(
      "Example only. Load the prepared CRM snapshot to use a real opportunity.",
    );
  if (!https(job.url))
    out.push("A verified official HTTPS application URL is needed.");
  if (["submitted", "interview", "closed"].includes(application(job, s).status))
    out.push("This record is already submitted or closed.");
  if (s.pending && s.pending.jobId !== job.id)
    out.push("Record the existing application outcome first.");
  if (
    s.pending?.jobId === job.id &&
    ["manual", "opened"].includes(s.pending.phase)
  )
    out.push("Record this pending outcome before reopening the application.");
  return out;
}
export function kitReady(job: Opportunity, s: Store) {
  return preparationBlockers(job, s).length === 0;
}
export function ready(job: Opportunity, s: Store) {
  return handoffBlockers(job, s).length === 0;
}
export function status(job: Opportunity, s: Store) {
  const a = application(job, s);
  if (a.status === "submitted")
    return a.evidence === "crm_receipt"
      ? "Submitted \u00B7 CRM receipt recorded"
      : a.receipt
        ? "Submitted by you \u00B7 receipt noted"
        : "Submitted by you";
  if (a.status === "interview") return "Interview \u00B7 recorded by you";
  if (a.status === "closed") return "Closed";
  if (job.issue || !hasQuestions(job)) return "Data review required";
  if (a.status === "blocked") return "Recovery needed";
  if (a.status === "in_progress" || s.pending?.jobId === job.id)
    return "In progress";
  if (ready(job, s)) return "Ready to apply";
  if (kitReady(job, s) && job.demo) return "Prepared \u00B7 example only";
  if (!job.packet) return "Preparing";
  if (missing(job, s).length) return "Needs input";
  if (!job.documents.some((d) => d.kind === "resume"))
    return "R\u00E9sum\u00E9 required";
  return "Review kit";
}
export function category(job: Opportunity, s: Store) {
  const a = application(job, s);
  if (["submitted", "interview", "closed"].includes(a.status)) return a.status;
  if (
    a.status === "blocked" ||
    a.status === "in_progress" ||
    s.pending?.jobId === job.id
  )
    return "waiting";
  if (ready(job, s)) return "ready";
  return !job.packet ? "preparing" : "needs";
}
export function event(
  s: Store,
  jobId: string | null,
  text: string,
  details: Pick<
    Store["events"][number],
    "eventType" | "actor" | "payload" | "evidenceRef"
  > = {},
) {
  s.events.unshift({
    id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
    jobId,
    text,
    at: new Date().toISOString(),
    entityType: jobId ? "opportunity" : "workspace",
    entityId: jobId,
    eventType: "user_action",
    actor: "user",
    payload: { message: text },
    ...details,
  });
}
export function find(s: Store, id: string) {
  const j = s.jobs.find((j) => j.id === id);
  if (!j) throw Error("Opportunity no longer available.");
  return j;
}
export function invalidate(job: Opportunity) {
  job.materialsChecked = false;
}
export function setAnswer(s: Store, id: string, q: string, value: string) {
  const j = find(s, id);
  s.answers[id] ??= {};
  if (s.answers[id][q] !== value) {
    s.answers[id][q] = value;
    invalidate(j);
  }
}
export function addDocument(
  s: Store,
  id: string,
  doc: Doc,
  replaceId?: string,
) {
  const j = find(s, id);
  if (!usable(doc)) throw Error("Document file and version required.");
  if (
    !replaceId &&
    doc.kind === "resume" &&
    j.documents.some((d) => d.kind === "resume")
  )
    throw Error(
      "A r\u00E9sum\u00E9 is already linked. Replace the existing document.",
    );
  if (
    j.documents.some(
      (d) =>
        (!replaceId || d.id !== replaceId) &&
        ((doc.url && d.url === doc.url) ||
          (d.name.toLowerCase() === doc.name.toLowerCase() &&
            d.version === doc.version)),
    )
  )
    throw Error(
      "This file is already linked. Use Replace on the existing document.",
    );
  const next = {
    ...doc,
    id:
      doc.id ||
      "file-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2),
    reviewed: false,
  };
  if (replaceId) {
    const i = j.documents.findIndex((d) => d.id === replaceId);
    if (i < 0) throw Error("Document no longer available.");
    j.documents[i] = next;
  } else j.documents.push(next);
  invalidate(j);
  event(
    s,
    id,
    replaceId
      ? "Application file replaced; review renewed"
      : "Application file linked for review",
  );
}
export function changeDocument(
  s: Store,
  id: string,
  docId: string,
  patch: Partial<Doc>,
) {
  const j = find(s, id),
    d = j.documents.find((d) => d.id === docId);
  if (!d) throw Error("Document no longer available.");
  if (
    patch.kind === "resume" &&
    j.documents.some((other) => other.id !== docId && other.kind === "resume")
  )
    throw Error("A r\u00E9sum\u00E9 is already linked. Replace it instead.");
  Object.assign(d, patch);
  d.reviewed = false;
  invalidate(j);
}
export function removeDocument(s: Store, id: string, docId: string) {
  const j = find(s, id);
  j.documents = j.documents.filter((d) => d.id !== docId);
  invalidate(j);
  event(s, id, "Application file removed; overall kit review renewed");
}
export function reviewDocument(
  s: Store,
  id: string,
  docId: string,
  reviewed: boolean,
) {
  const j = find(s, id),
    d = j.documents.find((d) => d.id === docId);
  if (!d) throw Error("Document no longer available.");
  d.reviewed = reviewed;
  invalidate(j);
}
export function confirmKit(s: Store, id: string, value: boolean) {
  const j = find(s, id);
  if (value) {
    const copy = { ...j, materialsChecked: true };
    if (preparationBlockers(copy, s).length)
      throw Error("Resolve the remaining preparation checks first.");
  }
  j.materialsChecked = value;
  if (value)
    event(s, id, "Current answers and application kit reviewed by user", {
      eventType: "kit_reviewed",
      payload: { confirmed: true },
    });
}
export function startHandoff(s: Store, job: Opportunity) {
  if (job.demo)
    throw Error(
      "Example records cannot open an employer application. Load a verified CRM record first.",
    );
  if (!ready(job, s))
    throw Error("Resolve: " + handoffBlockers(job, s).join(" "));
  s.pending = {
    jobId: job.id,
    at: new Date().toISOString(),
    phase: "saving",
    answers: { ...s.answers[job.id] },
    documents: JSON.parse(JSON.stringify(job.documents)),
  };
  event(s, job.id, "Application handoff started; nothing submitted", {
    eventType: "handoff_started",
    payload: { phase: "saving" },
  });
}
export function manualOutcome(s: Store, job: Opportunity) {
  if (job.demo || job.issue || !https(job.url))
    throw Error("Use a verified real opportunity.");
  if (s.pending && s.pending.jobId !== job.id)
    throw Error("Record the existing outcome first.");
  s.pending = {
    jobId: job.id,
    at: new Date().toISOString(),
    phase: "manual",
    answers: { ...s.answers[job.id] },
    documents: JSON.parse(JSON.stringify(job.documents)),
  };
}
export function outcome(
  s: Store,
  id: string,
  value: string,
  problem = "",
  receipt = "",
) {
  if (!["submitted", "later", "problem"].includes(value))
    throw Error("Select an outcome.");
  const job = find(s, id),
    p = s.pending;
  if (!p || p.jobId !== id)
    throw Error("No pending handoff for this application.");
  if (value === "submitted" && !["opened", "manual"].includes(p.phase))
    throw Error(
      "The employer site was not opened. Retry the handoff or record an existing submission explicitly.",
    );
  if (value === "problem" && !problem.trim())
    throw Error("Describe what blocked you.");
  if (receipt && !https(receipt)) throw Error("Receipt link must use HTTPS.");
  s.applications[id] = {
    ...application(job, s),
    status:
      value === "submitted"
        ? "submitted"
        : value === "later"
          ? "in_progress"
          : "blocked",
    evidence: value === "submitted" ? "user_reported" : "none",
    receipt: receipt || null,
    problem: problem.trim(),
    at: new Date().toISOString(),
    kit: {
      answers: p.answers || { ...s.answers[id] },
      documents: p.documents || JSON.parse(JSON.stringify(job.documents)),
    },
  };
  s.pending = null;
  event(
    s,
    id,
    value === "submitted"
      ? "Submission explicitly confirmed by user; employer receipt not independently verified"
      : value === "later"
        ? "Saved for later"
        : "Blocker: " + problem.trim(),
    {
      eventType: "outcome_confirmed",
      payload: {
        outcome: value,
        status: s.applications[id].status,
        evidence: s.applications[id].evidence,
      },
      evidenceRef: receipt || undefined,
    },
  );
}
export function updateRecord(
  s: Store,
  id: string,
  patch: Partial<Application>,
) {
  const job = find(s, id),
    old = application(job, s);
  if (patch.status === "submitted")
    throw Error("Record submission through explicit outcome confirmation.");
  if (
    patch.status === "interview" &&
    !["submitted", "interview"].includes(old.status)
  )
    throw Error("Record your submission before an interview.");
  if (patch.receipt && !https(patch.receipt))
    throw Error("Receipt link must use HTTPS.");
  if (patch.status && !canRecordStatus(old.status, patch.status))
    throw Error("Unsupported application transition.");
  s.applications[id] = { ...old, ...patch };
  if (patch.status === "closed") {
    delete s.reminders[id];
    delete s.snoozed[id];
    if (s.pending?.jobId === id) s.pending = null;
  }
  event(
    s,
    id,
    patch.status
      ? "Application status recorded by user: " + patch.status
      : "Application note updated by user",
    {
      eventType: "record_updated",
      payload: { status: s.applications[id].status },
    },
  );
}
export function setReminder(s: Store, id: string, value: string) {
  find(s, id);
  if (
    value &&
    (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now())
  )
    throw Error("Choose a future date and time.");
  if (application(find(s, id), s).status === "closed")
    throw Error("Closed records do not have reminders.");
  if (value) s.reminders[id] = new Date(value).toISOString();
  else delete s.reminders[id];
  event(
    s,
    id,
    value
      ? "In-app reminder saved; no message or push notification scheduled"
      : "Reminder removed",
  );
}
export function load(raw: string | null) {
  if (!raw) return defaults();
  const s = JSON.parse(raw) as Store;
  if (
    s.schema !== 6 ||
    !Array.isArray(s.jobs) ||
    !s.answers ||
    !s.applications ||
    !Array.isArray(s.events)
  )
    throw Error("Saved data cannot be read. Existing data is preserved.");
  s.preferences ??= preferences();
  s.filters ??= defaults().filters;
  s.snoozed ??= {};
  s.reminders ??= {};
  s.saved ??= {};
  s.pending ??= null;
  if (s.revision !== 2) {
    for (const j of s.jobs) {
      j.materialsChecked = false;
      j.questionsVerified = j.questions.length > 0 && !!j.packet;
      for (let i = 0; i < j.documents.length; i++) {
        const d = j.documents[i];
        d.id ??= `legacy-${j.id}-${i}`;
        d.required ??= d.kind === "resume";
      }
      const a = s.answers[j.id];
      if (a?.compensation) {
        a.compensationCurrency ??= "USD";
        a.compensationPeriod ??= "Annual";
      }
    }
    s.preferences.complete = true;
    s.revision = 2;
    event(
      s,
      null,
      "Upgraded saved progress. Existing compensation retains USD/Annual; overall kit review needs renewal.",
    );
  }
  return s;
}
export function importFeed(s: Store, raw: unknown) {
  const feed = decodeFeed(raw);
  if (feed.schema !== 1 || !Array.isArray(feed.jobs) || feed.jobs.length > 500)
    throw Error("Expected App Feed schema 1 with up to 500 jobs.");
  const sourceIds = new Map<string, Opportunity[]>(),
    urls = new Map<string, Opportunity[]>(),
    ids = new Set<string>();
  const jobs = feed.jobs.map((j) => {
    if (
      !j ||
      !validId(j.id) ||
      ids.has(j.id) ||
      typeof j.company !== "string" ||
      typeof j.role !== "string" ||
      !j.company.trim() ||
      !j.role.trim() ||
      !Array.isArray(j.questions) ||
      j.questions.some((q) => !validId(q))
    )
      throw Error(
        "Each job needs a unique immutable id, company, role and question IDs.",
      );
    ids.add(j.id);
    if (j.url && !https(j.url)) throw Error("Official URLs must use HTTPS.");
    if (j.postingCheckedAt && !Number.isFinite(Date.parse(j.postingCheckedAt)))
      throw Error("Invalid posting verification date.");
    const docs = (j.documents || []).map((d, i) => {
      if (
        !d.name ||
        !d.version ||
        !https(d.url || "") ||
        !["resume", "cover_letter", "portfolio", "notes"].includes(d.kind)
      )
        throw Error(
          "Artifacts need HTTPS URLs, names, versions and supported kinds.",
        );
      return {
        id: validId(d.id) ? d.id : `import-${j.id}-${i}`,
        name: d.name,
        version: d.version,
        url: d.url,
        kind: d.kind,
        required: d.required === true || d.kind === "resume",
        reviewed: false,
      };
    });
    const next: Opportunity = {
      ...j,
      sourceId: j.sourceId || "",
      packet: j.packet || null,
      location: j.location || "Not provided",
      url: j.url || "",
      demo: false,
      issue: j.issue || "",
      questions: [...new Set(j.questions)],
      questionsVerified: j.questionsVerified === true || j.questions.length > 0,
      documents: docs,
      postingCheckedAt: j.postingCheckedAt || "",
      materialsChecked: false,
    };
    for (const [map, key] of [
      [sourceIds, next.sourceId],
      [urls, next.url ? new URL(next.url).href.replace(/#.*$/, "") : ""],
    ] as const)
      if (key) {
        const group = map.get(key) || [];
        group.push(next);
        map.set(key, group);
      }
    return next;
  });
  for (const group of [...sourceIds.values(), ...urls.values()])
    if (group.length > 1)
      group.forEach(
        (j) =>
          (j.issue =
            "Conflicting CRM identity or duplicate official URL. Resolve in CRM before applying."),
      );
  jobs.forEach((j) => {
    const old = s.jobs.find((o) => o.id === j.id);
    if (old && (old.company !== j.company || old.url !== j.url))
      j.issue = "Immutable id changed employer or posting. Resolve in CRM.";
  });
  const retained = s.jobs.filter(
    (j) =>
      !ids.has(j.id) && (s.pending?.jobId === j.id || s.applications[j.id]),
  );
  s.jobs = [...jobs, ...retained];
  s.source = "Imported CRM snapshot \u00B7 read only";
  s.importedAt = new Date().toISOString();
  event(s, null, "CRM snapshot imported; no CRM writes performed", {
    eventType: "source_imported",
    payload: { opportunities: jobs.length },
  });
  return s;
}
export function installPreparedSnapshot(s: Store, feed: PreparedFeed) {
  if (s.snapshotInstalled) return s;
  for (const j of feed.jobs)
    if (!s.jobs.some((o) => o.id === j.id)) {
      s.jobs.push(JSON.parse(JSON.stringify(j)));
    }
  s.snapshotInstalled = true;
  s.source = feed.jobs.every((j) => j.demo)
    ? "Demo fixtures \u00B7 no live data"
    : `Prepared CRM snapshot · ${feed.snapshotAt} · read only`;
  s.importedAt = new Date().toISOString();
  event(
    s,
    null,
    feed.jobs.every((j) => j.demo)
      ? "Fictitious demo fixtures added; nothing connected."
      : "Prepared CRM snapshot added; existing example answers remain separate.",
    {
      eventType: "snapshot_installed",
      actor: "system",
      payload: { opportunities: feed.jobs.length },
    },
  );
  return s;
}
export function shortlist(s: Store) {
  const f = s.filters;
  let list = s.jobs.filter(
    (j) =>
      (!f.query ||
        `${j.company} ${j.role}`
          .toLowerCase()
          .includes(f.query.toLowerCase())) &&
      (!f.location ||
        j.location.toLowerCase().includes(f.location.toLowerCase())) &&
      (f.level === "Any" || j.level === f.level) &&
      (!f.savedOnly || s.saved[j.id]),
  );
  if (f.sort === "preparation")
    list.sort(
      (a, b) => handoffBlockers(a, s).length - handoffBlockers(b, s).length,
    );
  else if (f.sort === "newest")
    list.sort(
      (a, b) =>
        Date.parse(b.preparedAt || "") - Date.parse(a.preparedAt || "") || 0,
    );
  return list;
}
export function visibleJobs(s: Store, dataMode: string) {
  return s.jobs.filter((job) => dataMode === "demo" || !job.demo);
}
export function visibleShortlist(s: Store, dataMode: string) {
  const visible = new Set(visibleJobs(s, dataMode).map((job) => job.id));
  return shortlist(s).filter((job) => visible.has(job.id));
}
export function attentionQueue(s: Store, dataMode: string, now = Date.now()) {
  type Task = { job: Opportunity; reason: "reminder" | "pending" | "ready" | "preparation" };
  const tasks: Task[] = [], seen = new Set<string>();
  const visible = visibleJobs(s, dataMode);
  const snoozed = (job: Opportunity) => Date.parse(s.snoozed[job.id] || "") > now;
  const add = (job: Opportunity, reason: Task["reason"]) => {
    if (!seen.has(job.id)) { seen.add(job.id); tasks.push({ job, reason }); }
  };
  visible.filter((job) => application(job, s).status !== "closed" &&
    Date.parse(s.reminders[job.id] || "") <= now && !snoozed(job))
    .sort((a, b) => Date.parse(s.reminders[a.id]) - Date.parse(s.reminders[b.id]))
    .forEach((job) => add(job, "reminder"));
  // A saved handoff must remain recoverable even after a display-mode change or snooze.
  const pending = s.jobs.find((job) => job.id === s.pending?.jobId);
  if (pending && application(pending, s).status !== "closed") add(pending, "pending");
  visible.filter((job) => !["submitted", "interview", "closed"].includes(application(job, s).status) && !snoozed(job))
    .sort((a, b) => Number(!ready(a, s)) - Number(!ready(b, s)))
    .forEach((job) => add(job, ready(job, s) ? "ready" : "preparation"));
  return tasks;
}
export function canResumeRecovery(job: Opportunity, s: Store) {
  return canRecordStatus(application(job, s).status, "in_progress");
}
export function nextAction(job: Opportunity, s: Store) {
  const a = application(job, s);
  if (s.pending?.jobId === job.id)
    return ["opened", "manual"].includes(s.pending.phase)
      ? "outcome"
      : "recovery";
  if (a.status === "blocked" || a.status === "in_progress") return "recovery";
  if (["submitted", "interview", "closed"].includes(a.status)) return "record";
  if (job.issue || !hasQuestions(job)) return "source";
  return answersComplete(job, s) ? "review" : "answers";
}
function decodeFeed(raw: unknown): Feed {
  const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (
    !value ||
    typeof value !== "object" ||
    !("schema" in value) ||
    value.schema !== 1 ||
    !("jobs" in value) ||
    !Array.isArray(value.jobs)
  )
    throw Error("Expected App Feed schema 1.");
  for (const job of value.jobs) {
    if (
      !job ||
      typeof job !== "object" ||
      !validId(job.id) ||
      typeof job.company !== "string" ||
      typeof job.role !== "string" ||
      !Array.isArray(job.questions) ||
      job.questions.some((q: unknown) => !validId(q))
    )
      throw Error(
        "Each job needs a unique immutable id, company, role and question IDs.",
      );
    for (const key of [
      "url",
      "sourceId",
      "packet",
      "location",
      "issue",
      "postingCheckedAt",
    ])
      if (job[key] != null && typeof job[key] !== "string")
        throw Error("Invalid job field: " + key);
    if (
      job.documents != null &&
      (!Array.isArray(job.documents) ||
        job.documents.some(
          (d: unknown) =>
            !d ||
            typeof d !== "object" ||
            !("name" in d) ||
            typeof d.name !== "string" ||
            !("version" in d) ||
            typeof d.version !== "string",
        ))
    )
      throw Error("Invalid artifacts.");
  }
  return value as Feed;
}

