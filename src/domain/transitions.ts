import type {ApplicationStatus} from './types';
export function canRecordStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  if (to === "closed") return true;
  if (to === "interview") return from === "submitted" || from === "interview";
  if (to === "in_progress")
    return !["submitted", "interview", "closed"].includes(from);
  return false; // Submitted has its own explicit confirmation/evidence path.
}

