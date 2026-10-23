// Fires from the "on_report_insert_alert_admins" trigger (migration 0049) on every new
// row in public.reports, and pushes an alert to every app admin's devices
// (public.app_admins + push_tokens), so reports get reviewed. Child safety reports are
// marked as urgent.
//
// Like send-message-push it runs without JWT verification (Postgres calls it), so the
// request is only trusted for the report's id: the report is read from the database,
// and only if it was filed in the last FRESH_MS -- a forged or replayed call can't send
// made-up alerts. The alert names the reason and the reported member, never the
// reporter or their details (they show on a lock screen); the details are in the
// reports table.
//
// Deploy with: supabase functions deploy notify-report --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const FRESH_MS = 2 * 60 * 1000;

// The reasons the app offers (settings/safety/report.tsx), in words for the alert.
const REASONS: Record<string, string> = {
  harassment: "Harassment or abuse",
  fake_profile: "Fake profile",
  inappropriate: "Inappropriate content",
  child_safety: "Child safety",
  safety_concern: "Safety concern",
  other: "Other",
};

type ExpoPushTicket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    if (payload?.table !== "reports" || payload?.type !== "INSERT" || typeof payload?.record?.id !== "string") {
      return new Response("ignored", { status: 200 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: report } = await supabase
      .from("reports")
      .select("id, reason, reported_user_id, created_at")
      .eq("id", payload.record.id)
      .maybeSingle();
    if (!report) return new Response("no such report", { status: 200 });
    if (Date.now() - new Date(report.created_at).getTime() > FRESH_MS) {
      return new Response("not a new report", { status: 200 });
    }

    const { data: admins } = await supabase.from("app_admins").select("user_id");
    const adminIds = (admins ?? []).map((a) => a.user_id);
    if (adminIds.length === 0) {
      console.error("notify-report: no app admins to alert", { reportId: report.id });
      return new Response("no admins", { status: 200 });
    }

    const [{ data: tokenRows }, { data: reported }] = await Promise.all([
      supabase.from("push_tokens").select("id, token").in("user_id", adminIds),
      supabase.from("profiles").select("display_name").eq("id", report.reported_user_id).maybeSingle(),
    ]);
    if (!tokenRows || tokenRows.length === 0) {
      console.error("notify-report: admins have no devices registered", { reportId: report.id });
      return new Response("no tokens", { status: 200 });
    }

    const urgent = report.reason === "child_safety";
    const reason = REASONS[report.reason] ?? report.reason;
    const name = reported?.display_name || "a member";
    const notifications = tokenRows.map((row) => ({
      to: row.token,
      title: urgent ? "Urgent: child safety report" : "New report",
      body: `${reason} -- about ${name}. Review it in the reports table.`,
      sound: "default",
      priority: "high",
      data: { type: "report", reportId: report.id },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(notifications),
    });
    if (!pushResponse.ok) {
      console.error("notify-report: Expo rejected the request", pushResponse.status, await pushResponse.text());
      return new Response("ok", { status: 200 });
    }
    const { data: tickets } = (await pushResponse.json()) as { data: ExpoPushTicket[] };
    tokenRows.forEach((row, i) => {
      const ticket = tickets?.[i];
      if (ticket?.status === "error") {
        console.error("notify-report: delivery failed", {
          tokenRowId: row.id,
          reportId: report.id,
          error: ticket.details?.error ?? "unknown",
          message: ticket.message,
        });
      }
    });

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("notify-report error", error);
    return new Response("error", { status: 200 });
  }
});
