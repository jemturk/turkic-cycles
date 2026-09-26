import { AGE_BUCKETS } from "@/constants/interests";

export function calculateAge(birthdateIso: string, now: Date = new Date()): number {
  const birthdate = new Date(birthdateIso);
  let age = now.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthdate.getMonth() ||
    (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function ageBucketForAge(age: number): (typeof AGE_BUCKETS)[number] | undefined {
  return AGE_BUCKETS.find((bucket) => {
    const [min, max] = bucket.split("-").map(Number);
    return age >= min && age < max;
  });
}
