import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    beginSupabaseSignIn,
    getSupabaseSessionAuth,
    isSupabaseAuthConfigured,
    signOutSupabase,
} from '../sync/supabaseAuth';
import type { AuthState } from '../sync/types';

interface AuthStore extends AuthState {
    hydrateSession: () => Promise<void>;
    connectCloud: () => Promise<void>;
    disconnect: () => Promise<void>;
}

const initialState: AuthState = {
    status: 'anonymous',
    provider: null,
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            async hydrateSession() {
                if (!isSupabaseAuthConfigured()) {
                    const state = get();
                    if (state.provider === 'supabase') {
                        set({
                            ...initialState,
                            lastError: 'Supabase sync not configured for this build.',
                        });
                    }
                    return;
                }

                const refreshed = await getSupabaseSessionAuth();
                if (!refreshed) {
                    set({ ...initialState });
                    return;
                }

                set({
                    status: 'authenticated',
                    provider: 'supabase',
                    user: refreshed.user,
                    accessToken: refreshed.token,
                    tokenExpiresAt: refreshed.expiresAt,
                    lastError: undefined,
                });
            },

            async connectCloud() {
                if (!isSupabaseAuthConfigured()) {
                    set({
                        ...initialState,
                        lastError: 'Supabase sync is unavailable. Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.',
                    });
                    return;
                }

                set({ status: 'authenticating', lastError: undefined });
                try {
                    await beginSupabaseSignIn();
                } catch (error) {
                    set({
                        ...initialState,
                        lastError: error instanceof Error ? error.message : 'Supabase sign-in failed.',
                    });
                }
            },

            async disconnect() {
                try {
                    await signOutSupabase();
                    set({ ...initialState });
                } catch (error) {
                    set({
                        ...initialState,
                        lastError: error instanceof Error ? error.message : 'Failed to sign out of Supabase.',
                    });
                }
            },
        }),
        {
            name: 'lifti-auth',
            partialize: state => ({
                provider: state.provider,
                user: state.user,
            }),
            merge: (persistedState, currentState) => {
                const persisted = (persistedState ?? {}) as Partial<AuthState>;
                return {
                    ...currentState,
                    provider: persisted.provider ?? null,
                    user: persisted.user,
                    status: 'anonymous',
                    accessToken: undefined,
                    tokenExpiresAt: undefined,
                };
            },
        },
    ),
);
