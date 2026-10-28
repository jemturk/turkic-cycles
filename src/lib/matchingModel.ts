// The matching model's engine (supabase/functions/_shared/matching.ts) for the app's own
// screens -- the same code the rank-discover function scores with, so what a screen
// offers (e.g. which criteria can be boosted) always matches what the scoring does.
export {
  DEFAULT_CONFIG,
  boostableCriteria,
  sanitizeBoosts,
  type AppType,
  type Criterion,
  type Member,
} from "../../supabase/functions/_shared/matching";
