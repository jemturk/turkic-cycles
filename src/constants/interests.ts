export const INTERESTS = [
  "Family",
  "Kids",
  "Travel",
  "Night life",
  "Exercise",
  "Self-development",
  "Horoscope",
] as const;

export const HOBBIES = [
  "Swim",
  "Tennis",
  "Soccer",
  "Ski",
  "Paint",
  "Sing",
  "Play an instrument",
  "Music",
] as const;

export const TRAVEL_FREQUENCIES = [
  { value: "none", label: "None" },
  { value: "some", label: "Some — 1–2 times a year" },
  { value: "moderate", label: "Moderately — 3–4 times a year" },
  { value: "frequent", label: "Frequently — more than 4 times a year" },
] as const;

export const TRAVEL_STYLES = [
  "Trying new restaurants",
  "Visiting museums",
  "Seeing the city",
  "Seeing the rural area",
  "Meeting locals & talking with them",
] as const;

export const LOOKING_FOR_OPTIONS = [
  "Friend",
  "Boyfriend",
  "Girlfriend",
  "Husband",
  "Wife",
  "Business Partner",
  "Mentor",
  "Employee",
] as const;

export const AGE_BUCKETS = ["18-25", "25-35", "35-45", "45-55", "55-65"] as const;
