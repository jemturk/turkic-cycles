import { useHasPlus } from "@/hooks/usePlus";
import { useMyVerificationStatus } from "@/hooks/useVerification";

// Mirrors public.can_host() (migration 0035), which is what the database enforces
// for creating circles and events: Plus and a verified ID. Admins included.
export function useCanHost(userId: string | undefined) {
  const hasPlus = useHasPlus(userId);
  const { data: verification, isLoading: verificationLoading } = useMyVerificationStatus(userId);
  const verified = verification?.status === "verified";

  return {
    isLoading: verificationLoading || hasPlus === undefined,
    hasPlus: !!hasPlus,
    verified,
    canHost: !!hasPlus && verified,
  };
}
