import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCircle,
  createCircleEvent,
  getIsAppAdmin,
  getMyCircleRole,
  getCircle,
  getCircleEvent,
  getMyRsvp,
  listEventAttendees,
  joinCircle,
  leaveCircle,
  listCircleEvents,
  listCircleMembers,
  listCircles,
  listMyCircleMemberships,
  listUpcomingEventCounts,
  listUpcomingEventsInCircles,
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

export function useUpcomingEventCounts() {
  return useQuery({ queryKey: ["upcomingEventCounts"], queryFn: listUpcomingEventCounts });
}

export function useUpcomingEventsInCircles(circleIds: string[] | undefined, limit = 5) {
  return useQuery({
    queryKey: ["upcomingEventsInCircles", circleIds, limit],
    queryFn: () => listUpcomingEventsInCircles(circleIds as string[], limit),
    enabled: !!circleIds,
  });
}

export function useCircleEvents(circleId: string | undefined) {
  return useQuery({
    queryKey: ["circleEvents", circleId],
    queryFn: () => listCircleEvents(circleId as string),
    enabled: !!circleId,
  });
}

export function useCircleEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["circleEvent", eventId],
    queryFn: () => getCircleEvent(eventId as string),
    enabled: !!eventId,
  });
}

export function useMyRsvp(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["myRsvp", eventId, userId],
    queryFn: () => getMyRsvp(eventId as string, userId as string),
    enabled: !!eventId && !!userId,
  });
}

export function useEventAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ["eventAttendees", eventId],
    queryFn: () => listEventAttendees(eventId as string),
    enabled: !!eventId,
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
      // going_count / interested_count are recomputed by a trigger on event_rsvps.
      queryClient.invalidateQueries({ queryKey: ["circleEvents"] });
      queryClient.invalidateQueries({ queryKey: ["circleEvent", eventId] });
      queryClient.invalidateQueries({ queryKey: ["eventAttendees", eventId] });
    },
  });
}

export function useIsAppAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["isAppAdmin", userId],
    queryFn: () => getIsAppAdmin(userId as string),
    enabled: !!userId,
  });
}

export function useMyCircleRole(circleId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["myCircleRole", circleId, userId],
    queryFn: () => getMyCircleRole(circleId as string, userId as string),
    enabled: !!circleId && !!userId,
  });
}

export function useCreateCircle(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCircle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      queryClient.invalidateQueries({ queryKey: ["myCircleMemberships", userId] });
    },
  });
}

export function useCreateCircleEvent(circleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCircleEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circleEvents", circleId] });
      queryClient.invalidateQueries({ queryKey: ["upcomingEventCounts"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingEventsInCircles"] });
    },
  });
}
