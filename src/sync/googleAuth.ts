import type { AuthUser } from './types';

const GOOGLE_IDENTITY_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
}

interface GoogleUserInfoResponse {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
}

let scriptLoadPromise: Promise<void> | null = null;

type GoogleOAuth2Api = NonNullable<
    NonNullable<NonNullable<Window['google']>['accounts']>['oauth2']
>;

function getClientId(): string {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
}

function ensureGoogleScript(): Promise<void> {
    if (window.google?.accounts?.oauth2) {
        return Promise.resolve();
    }
    if (scriptLoadPromise) {
        return scriptLoadPromise;
    }

    scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GOOGLE_IDENTITY_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

function getGoogleOAuth2Api(): GoogleOAuth2Api {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
        throw new Error('Google Identity script is not available.');
    }
    return oauth2;
}

function requestToken(prompt: 'consent' | 'none'): Promise<GoogleTokenResponse> {
    return new Promise((resolve, reject) => {
        const clientId = getClientId();
        if (!clientId) {
            reject(new Error('Missing VITE_GOOGLE_CLIENT_ID.'));
            return;
        }

        ensureGoogleScript()
            .then(() => {
                const tokenClient = getGoogleOAuth2Api().initTokenClient({
                    client_id: clientId,
                    scope: DRIVE_SCOPE,
                    callback: (response: GoogleTokenResponse) => {
                        if (response.error) {
                            reject(new Error(response.error_description ?? response.error));
                            return;
                        }
                        resolve(response);
                    },
                });

                tokenClient.requestAccessToken({ prompt });
            })
            .catch(reject);
    });
}

async function fetchUserInfo(accessToken: string): Promise<AuthUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Google profile.');
    }

    const user = (await response.json()) as GoogleUserInfoResponse;
    return {
        id: user.sub,
        email: user.email,
        name: user.name,
        avatarUrl: user.picture,
    };
}

export async function interactiveGoogleSignIn() {
    const token = await requestToken('consent');
    const user = await fetchUserInfo(token.access_token);
    return {
        token: token.access_token,
        expiresAt: Date.now() + token.expires_in * 1000,
        user,
    };
}

export async function silentGoogleSignIn() {
    try {
        const token = await requestToken('none');
        const user = await fetchUserInfo(token.access_token);
        return {
            token: token.access_token,
            expiresAt: Date.now() + token.expires_in * 1000,
            user,
        };
    } catch {
        return null;
    }
}

export async function revokeGoogleToken(accessToken?: string) {
    if (!accessToken) return;
    await ensureGoogleScript();
    getGoogleOAuth2Api().revoke(accessToken);
}

export function isGoogleAuthConfigured() {
    return Boolean(getClientId());
}
