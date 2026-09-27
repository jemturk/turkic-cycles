import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadAvatar } from "@/api/avatar";

export function useUploadAvatar(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType: string }) =>
      uploadAvatar(userId as string, uri, mimeType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}
