import type { User } from '@supabase/supabase-js';
import type { AuthUser } from './types';
import { getSupabaseRedirectUrl, isSupabaseConfigured, supabase } from './supabaseClient';

interface UserMetadata {
    avatar_url?: string;
    full_name?: string;
    name?: string;
    picture?: string;
}

interface AppMetadata {
    provider?: string;
}

function requireSupabase() {
    if (!supabase || !isSupabaseConfigured()) {
        throw new Error('Supabase sync is unavailable. Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.');
    }

    return supabase;
}

function toAuthUser(user: User): AuthUser {
    const userMetadata = (user.user_metadata ?? {}) as UserMetadata;
    const appMetadata = (user.app_metadata ?? {}) as AppMetadata;

    return {
        id: user.id,
        email: user.email,
        name: userMetadata.full_name ?? userMetadata.name ?? user.email,
        avatarUrl: userMetadata.avatar_url ?? userMetadata.picture,
        providerName: appMetadata.provider,
    };
}

export async function beginSupabaseSignIn() {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: getSupabaseRedirectUrl(),
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        throw error;
    }
}

export async function getSupabaseSessionAuth() {
    if (!supabase || !isSupabaseConfigured()) {
        return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
        throw error;
    }

    const session = data.session;
    if (!session) {
        return null;
    }

    return {
        token: session.access_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
        user: toAuthUser(session.user),
    };
}

export async function signOutSupabase() {
    if (!supabase || !isSupabaseConfigured()) {
        return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
        throw error;
    }
}

export function isSupabaseAuthConfigured() {
    return isSupabaseConfigured();
}
