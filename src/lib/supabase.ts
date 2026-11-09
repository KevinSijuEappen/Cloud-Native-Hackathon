import { createClient } from '@supabase/supabase-js';

export function createUserSupabaseClient(getToken: () => Promise<string | null>) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    accessToken: getToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
