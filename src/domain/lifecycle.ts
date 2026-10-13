import type {
  ApplicationStatus,
  HandoffPhase,
  Opportunity,
  Store,
} from "./types";
import { application, missing, hasQuestions, ready } from "./workflow";
export type Lifecycle =
  | ApplicationStatus
  | "needs_input"
  | "kit_review_required"
  | "ready"
  | "handoff_saving"
  | "employer_opened"
  | "awaiting_outcome"
  | "paused";
/** Derived preparation is never persisted as an inherited readiness label. */
export function lifecycle(job: Opportunity, store: Store): Lifecycle {
  const record = application(job, store);
  if (["submitted", "interview", "closed"].includes(record.status))
    return record.status;
  const pending = store.pending?.jobId === job.id ? store.pending : null;
  if (pending) {
    switch (pending.phase) {
      case "saving":
      case "saved":
        return "handoff_saving";
      case "opened":
        return "employer_opened";
      case "manual":
        return "awaiting_outcome";
      case "failed":
        return "blocked";
    }
  }
  if (record.status === "blocked") return "blocked";
  if (record.status === "in_progress") return "paused";
  if (job.issue || !hasQuestions(job)) return "blocked";
  if (missing(job, store).length) return "needs_input";
  return ready(job, store) ? "ready" : "kit_review_required";
}
const handoffTransitions: Record<HandoffPhase, readonly HandoffPhase[]> = {
  saving: ["saved", "failed"],
  saved: ["opened", "failed"],
  opened: ["failed"],
  failed: [],
  manual: [],
};
/** Saving must complete before opening. Retry creates a new reviewed snapshot. */
export function advanceHandoff(
  store: Store,
  jobId: string,
  phase: HandoffPhase,
  folderUri?: string,
): void {
  const pending = store.pending;
  if (!pending || pending.jobId !== jobId)
    throw Error("No pending handoff for this application.");
  if (!handoffTransitions[pending.phase].includes(phase))
    throw Error(`Invalid handoff transition: ${pending.phase} → ${phase}`);
  if (phase === "saved" && !folderUri)
    throw Error("Verified download folder required.");
  pending.phase = phase;
  if (folderUri) pending.folderUri = folderUri;
}
export {canRecordStatus} from './transitions';

