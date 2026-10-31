import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteAvatar, uploadAvatar } from "@/api/avatar";

export function useUploadAvatar(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri }: { uri: string }) =>
      uploadAvatar(userId as string, uri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}

export function useDeleteAvatar(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAvatar(userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}
