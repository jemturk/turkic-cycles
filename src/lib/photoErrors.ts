import type { TFunction } from "i18next";

import { PhotoRejectedError } from "@/api/photoModeration";

// What to tell the member when adding a photo fails: the photo check turned it down,
// they've hit its limits, the check couldn't run (moderate-photo answered with an
// error), or anything else.
export function photoUploadErrorMessage(error: Error, t: TFunction): string {
  if (error instanceof PhotoRejectedError) return t("photos.rejected");
  // FunctionsHttpError carries moderate-photo's Response; 429 = its limits.
  if ((error as { context?: { status?: number } }).context?.status === 429) return t("photos.tooManyTries");
  if (error.name === "FunctionsHttpError" || error.name === "FunctionsFetchError") return t("photos.checkFailed");
  return error.message;
}
