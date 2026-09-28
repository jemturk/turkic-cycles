// A minimal stand-in for the real supabase-js query builder, used to unit-test the
// JS logic in src/api/** (joins, dedup, sort, filter) without a live database.
//
// Real filter chains (`.select().eq().order()...`) are trusted to work -- they're
// Supabase's code, not ours. What's being protected here is the code downstream of
// the fetched rows. So each `.from(table)` call just pops the next canned
// `{ data, error }` response queued for that table, ignoring which filter methods
// were chained; the chain object itself is "thenable" so `await` resolves it,
// matching how the real PostgrestFilterBuilder behaves.
export type SupabaseResponse<T = unknown> = { data: T | null; error: { message: string } | null };

export function ok<T>(data: T): SupabaseResponse<T> {
  return { data, error: null };
}

export function fail(message: string): SupabaseResponse<never> {
  return { data: null, error: { message } };
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "in",
  "is",
  "or",
  "order",
  "limit",
  "single",
  "maybeSingle",
  "gt",
  "gte",
  "lt",
  "lte",
  "match",
];

function makeChain(response: SupabaseResponse) {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: SupabaseResponse) => unknown) => Promise.resolve(response).then(resolve),
  };
  // Each filter method is a jest.fn so a test can assert on the arguments a call
  // chain was built with (e.g. `chain.eq.mock.calls`), not just the final data.
  for (const method of CHAIN_METHODS) chain[method] = jest.fn(() => chain);
  return chain;
}

// Configures `mockFrom` (a `jest.fn()` standing in for `supabase.from`) to return,
// per table, the queued responses in order -- one shift() per `.from(table)` call.
// Call again in each test to reset the queues.
export function queueSupabaseResponses(mockFrom: jest.Mock, queues: Record<string, SupabaseResponse[]>) {
  const remaining: Record<string, SupabaseResponse[]> = Object.fromEntries(
    Object.entries(queues).map(([table, responses]) => [table, [...responses]])
  );
  mockFrom.mockImplementation((table: string) => {
    const queue = remaining[table];
    if (!queue || queue.length === 0) {
      throw new Error(`No mocked supabase response queued for table "${table}"`);
    }
    return makeChain(queue.shift()!);
  });
}
