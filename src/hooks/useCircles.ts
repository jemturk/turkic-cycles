import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCircle,
  getMyRsvp,
  getNextCircleEvent,
  joinCircle,
  leaveCircle,
  listCircleMembers,
  listCircles,
  listMyCircleMemberships,
  upsertRsvp,
} from "@/api/circles";

export function useCircles() {
  return useQuery({ queryKey: ["circles"], queryFn: listCircles });
}

export function useCircle(circleId: string | undefined) {
  return useQuery({
    queryKey: ["circle", circleId],
    queryFn: () => getCircle(circleId as string),
    enabled: !!circleId,
  });
}

export function useMyCircleMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["myCircleMemberships", userId],
    queryFn: () => listMyCircleMemberships(userId as string),
    enabled: !!userId,
  });
}

export function useCircleMembers(circleId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ["circleMembers", circleId, limit],
    queryFn: () => listCircleMembers(circleId as string, limit),
    enabled: !!circleId,
  });
}

export function useNextCircleEvent(circleId: string | undefined) {
  return useQuery({
    queryKey: ["nextCircleEvent", circleId],
    queryFn: () => getNextCircleEvent(circleId as string),
    enabled: !!circleId,
  });
}

export function useMyRsvp(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["myRsvp", eventId, userId],
    queryFn: () => getMyRsvp(eventId as string, userId as string),
    enabled: !!eventId && !!userId,
  });
}

export function useJoinCircle(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (circleId: string) => joinCircle(userId as string, circleId),
    onSuccess: (_data, circleId) => {
      queryClient.invalidateQueries({ queryKey: ["myCircleMemberships", userId] });
      queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      queryClient.invalidateQueries({ queryKey: ["circleMembers", circleId] });
    },
  });
}

export function useLeaveCircle(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (circleId: string) => leaveCircle(userId as string, circleId),
    onSuccess: (_data, circleId) => {
      queryClient.invalidateQueries({ queryKey: ["myCircleMemberships", userId] });
      queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      queryClient.invalidateQueries({ queryKey: ["circleMembers", circleId] });
    },
  });
}

export function useUpsertRsvp(eventId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: "going" | "interested" | "not_going") =>
      upsertRsvp(eventId as string, userId as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRsvp", eventId, userId] });
    },
  });
}
