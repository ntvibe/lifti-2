import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { interactiveGoogleSignIn, isGoogleAuthConfigured, revokeGoogleToken, silentGoogleSignIn } from '../sync/googleAuth';
import type { AuthState } from '../sync/types';

interface AuthStore extends AuthState {
    hydrateSession: () => Promise<void>;
    connectGoogle: () => Promise<boolean>;
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
                const state = get();
                if (state.provider !== 'google') return;
                if (!isGoogleAuthConfigured()) {
                    set({
                        ...initialState,
                        lastError: 'Google backup not configured for this build.',
                    });
                    return;
                }

                const refreshed = await silentGoogleSignIn();
                if (!refreshed) {
                    set({ ...initialState });
                    return;
                }

                set({
                    status: 'authenticated',
                    provider: 'google',
                    user: refreshed.user,
                    accessToken: refreshed.token,
                    tokenExpiresAt: refreshed.expiresAt,
                    lastError: undefined,
                });
            },

            async connectGoogle() {
                if (!isGoogleAuthConfigured()) {
                    set({
                        ...initialState,
                        lastError: 'Google backup is unavailable. Missing VITE_GOOGLE_CLIENT_ID.',
                    });
                    return false;
                }

                set({ status: 'authenticating', lastError: undefined });
                try {
                    const auth = await interactiveGoogleSignIn();
                    set({
                        status: 'authenticated',
                        provider: 'google',
                        user: auth.user,
                        accessToken: auth.token,
                        tokenExpiresAt: auth.expiresAt,
                        lastError: undefined,
                    });
                    return true;
                } catch (error) {
                    set({
                        ...initialState,
                        lastError: error instanceof Error ? error.message : 'Google sign-in failed.',
                    });
                    return false;
                }
            },

            async disconnect() {
                const token = get().accessToken;
                await revokeGoogleToken(token);
                set({ ...initialState });
            },
        }),
        {
            name: 'lifti-auth',
            partialize: state => ({
                status: state.status,
                provider: state.provider,
                user: state.user,
            }),
        },
    ),
);
