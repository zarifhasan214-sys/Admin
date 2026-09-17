export type RequestStatus =
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "SEARCHING_FOR_DONOR"
  | "DONOR_CONTACTED"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

/** Allowed status transitions for blood requests. */
export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING_REVIEW: ["VERIFIED", "REJECTED", "CANCELLED"],
  VERIFIED: ["SEARCHING_FOR_DONOR", "CANCELLED", "EXPIRED"],
  SEARCHING_FOR_DONOR: ["DONOR_CONTACTED", "CANCELLED", "EXPIRED"],
  DONOR_CONTACTED: ["ACCEPTED", "SEARCHING_FOR_DONOR", "CANCELLED", "EXPIRED"],
  ACCEPTED: ["COMPLETED", "CANCELLED", "EXPIRED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: ["SEARCHING_FOR_DONOR"],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const REQUIRES_NOTE: RequestStatus[] = ["REJECTED", "CANCELLED"];
