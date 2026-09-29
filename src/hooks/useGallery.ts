import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addProfilePhoto,
  listProfilePhotos,
  removeProfilePhoto,
  reorderProfilePhotos,
  type ProfilePhoto,
} from "@/api/gallery";

export const MAX_PROFILE_PHOTOS = 6;

export function useProfilePhotos(userId: string | undefined) {
  return useQuery({
    queryKey: ["profilePhotos", userId],
    queryFn: () => listProfilePhotos(userId as string),
    enabled: !!userId,
  });
}

type NewPhoto = { uri: string; mimeType: string };

export function useAddProfilePhotos(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    // Uploaded one at a time rather than in parallel: each one's `position` is
    // computed from how many already exist, so a parallel batch would race and
    // could hand out the same position to more than one photo.
    mutationFn: async (photos: NewPhoto[]) => {
      const existing = queryClient.getQueryData<ProfilePhoto[]>(["profilePhotos", userId]) ?? [];
      let nextPosition = existing.length;
      const uploaded: ProfilePhoto[] = [];
      for (const photo of photos) {
        uploaded.push(await addProfilePhoto(userId as string, photo.uri, photo.mimeType, nextPosition));
        nextPosition += 1;
      }
      return uploaded;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profilePhotos", userId] }),
  });
}

export function useRemoveProfilePhoto(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: ProfilePhoto) => removeProfilePhoto(photo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profilePhotos", userId] }),
  });
}

export function useReorderProfilePhotos(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedPhotoIds: string[]) => reorderProfilePhotos(orderedPhotoIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profilePhotos", userId] }),
  });
}
