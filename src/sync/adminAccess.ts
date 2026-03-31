import { isSupabaseConfigured, supabase } from './supabaseClient';

function requireSupabase() {
    if (!supabase || !isSupabaseConfigured()) {
        throw new Error('Supabase admin tools are unavailable. Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.');
    }

    return supabase;
}

export async function getIsCurrentUserAdmin() {
    const client = requireSupabase();
    const {
        data: { user },
        error: userError,
    } = await client.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        return false;
    }

    const { data, error } = await client
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return Boolean(data?.user_id);
}

export async function claimInitialAdminAccess() {
    const client = requireSupabase();
    const { data, error } = await client.rpc('claim_initial_admin');

    if (error) {
        throw error;
    }

    return Boolean(data);
}
