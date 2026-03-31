import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export function isSupabaseConfigured() {
    return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseRedirectUrl() {
    return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

export const supabase = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            persistSession: true,
        },
    })
    : null;
