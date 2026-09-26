export const CONNECTION_TYPES = [
  "friend",
  "romantic",
  "business",
  "business_mentor",
  "academic_mentor",
  "spiritual_mentor",
] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  friend: "Friend",
  romantic: "Romantic relationship",
  business: "Business connection",
  business_mentor: "Business mentor",
  academic_mentor: "Academic mentor",
  spiritual_mentor: "Spiritual mentor",
};

export const BUSINESS_ROLES = [
  "networking",
  "job_seeking",
  "business_partner",
  "franchise",
  "hiring",
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  networking: "Networking",
  job_seeking: "Job seeking",
  business_partner: "Business partner",
  franchise: "Franchise",
  hiring: "Hiring",
};

export const MENTOR_ROLES = ["seeking", "offering"] as const;

export type MentorRole = (typeof MENTOR_ROLES)[number];

export const MENTOR_ROLE_LABELS: Record<MentorRole, string> = {
  seeking: "Seeking a mentor",
  offering: "Offering mentorship",
};
