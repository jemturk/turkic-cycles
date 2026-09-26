// Placeholder until the Supabase schema exists and types are generated for real:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// Keeping `any` here (instead of hand-writing table shapes) avoids maintaining two
// sources of truth that drift the moment a migration changes a column.
export type Database = any;
