export type EventType =
  | "user_action"
  | "kit_reviewed"
  | "handoff_started"
  | "outcome_confirmed"
  | "record_updated"
  | "source_imported"
  | "snapshot_installed";
export type ApplicationStatus =
  | "not_submitted"
  | "in_progress"
  | "blocked"
  | "submitted"
  | "interview"
  | "closed";
export type SubmissionEvidence = "none" | "user_reported" | "crm_receipt";
export type HandoffPhase = "saving" | "saved" | "opened" | "manual" | "failed";
export type Doc = {
  id?: string;
  name: string;
  version: string;
  kind: string;
  required?: boolean;
  url?: string;
  bundle?: string;
  localKey?: string;
  localUri?: string;
  reviewed: boolean;
};
export type Opportunity = {
  id: string;
  sourceId: string;
  packet: string | null;
  company: string;
  role: string;
  location: string;
  url: string;
  demo: boolean;
  issue: string;
  questions: string[];
  questionsVerified?: boolean;
  questionLabels?: Record<string, string>;
  questionScope?: string;
  documents: Doc[];
  postingCheckedAt: string;
  materialsChecked: boolean;
  description?: string;
  requirements?: string;
  background?: string;
  notes?: string;
  decisions?: string;
  portfolioRequirement?: string;
  level?: string;
  preparedAt?: string;
  documentWarning?: string;
};
export type Application = {
  status: ApplicationStatus;
  evidence: SubmissionEvidence;
  receipt?: string | null;
  problem?: string;
  note?: string;
  at?: string;
  kit?: {
    answers: Record<string, string>;
    documents: Doc[];
  };
};
export type Filters = {
  query: string;
  location: string;
  level: string;
  sort: string;
  savedOnly: boolean;
};
export type Store = {
  schema: number;
  revision?: number;
  jobs: Opportunity[];
  answers: Record<string, Record<string, string>>;
  applications: Record<string, Application>;
  saved: Record<string, boolean>;
  events: {
    id: string;
    jobId: string | null;
    text: string;
    at: string;
    entityType?: "opportunity" | "workspace";
    entityId?: string | null;
    eventType?: EventType;
    actor?: "user" | "system";
    payload?: Record<string, unknown>;
    evidenceRef?: string;
  }[];
  pending: {
    jobId: string;
    at: string;
    phase: HandoffPhase;
    folderUri?: string;
    answers?: Record<string, string>;
    documents?: Doc[];
  } | null;
  source: string;
  importedAt: string | null;
  preferences: {
    roles: string;
    locations: string;
    level: string;
    resume: Doc | null;
    complete: boolean;
  };
  filters: Filters;
  snoozed: Record<string, string>;
  reminders: Record<string, string>;
  snapshotInstalled?: boolean;
};
export type FeedJob = Partial<Opportunity> &
  Pick<Opportunity, "id" | "company" | "role" | "questions">;
export type Feed = {
  schema: number;
  jobs: FeedJob[];
};
export type PreparedFeed = {
  schema?: number;
  snapshotAt: string;
  crmUrl: string;
  jobs: Opportunity[];
};

