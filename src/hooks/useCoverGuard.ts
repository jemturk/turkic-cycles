import type { TFunction } from "i18next";

import { COVER_POSITION } from "@/api/gallery";
import { useProfilePhotos } from "@/hooks/useGallery";
import { showAlert } from "@/lib/alert";

// Whether the user has a photo in the cover slot. undefined while photos load, so
// nothing is blocked before we actually know.
//
// A cover is required (it's their Discover card's background): onboarding won't
// finish without one, and once past onboarding, removing it keeps the user on
// their profile until they set a new one -- see the guards in (app)/_layout.tsx
// and me/index.tsx.
export function useHasCover(userId: string | undefined): boolean | undefined {
  const { data: photos } = useProfilePhotos(userId);
  if (photos === undefined) return undefined;
  return photos.some((p) => p.position === COVER_POSITION);
}

export function alertCoverRequired(t: TFunction) {
  showAlert(t("gallery.coverRequiredTitle"), t("gallery.coverRequiredBody"));
}
