import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Ensure the Realtime client has the user's access token for RLS.
 * Must be called (and awaited) before subscribing to channels.
 */
export async function ensureRealtimeAuth(
  supabase: ReturnType<typeof createClient>
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await supabase.realtime.setAuth(session.access_token);
  }
}
