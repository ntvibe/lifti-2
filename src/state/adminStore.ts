import { create } from 'zustand';
import { claimInitialAdminAccess, getIsCurrentUserAdmin } from '../sync/adminAccess';
import { useAuthStore } from './authStore';

interface AdminStore {
    isAdmin: boolean;
    isChecking: boolean;
    lastError?: string;
    refresh: () => Promise<void>;
    claimInitialAdmin: () => Promise<boolean>;
    reset: () => void;
}

const initialState = {
    isAdmin: false,
    isChecking: false,
    lastError: undefined as string | undefined,
};

export const useAdminStore = create<AdminStore>((set) => ({
    ...initialState,

    async refresh() {
        const authStatus = useAuthStore.getState().status;
        if (authStatus !== 'authenticated') {
            set({ ...initialState });
            return;
        }

        set(state => ({ ...state, isChecking: true, lastError: undefined }));

        try {
            const isAdmin = await getIsCurrentUserAdmin();
            set({
                isAdmin,
                isChecking: false,
                lastError: undefined,
            });
        } catch (error) {
            set({
                isAdmin: false,
                isChecking: false,
                lastError: error instanceof Error ? error.message : 'Failed to check admin access.',
            });
        }
    },

    async claimInitialAdmin() {
        set(state => ({ ...state, isChecking: true, lastError: undefined }));

        try {
            const claimed = await claimInitialAdminAccess();
            set({
                isAdmin: claimed,
                isChecking: false,
                lastError: claimed ? undefined : 'Another admin already exists for this project.',
            });
            return claimed;
        } catch (error) {
            set({
                isAdmin: false,
                isChecking: false,
                lastError: error instanceof Error ? error.message : 'Failed to claim admin access.',
            });
            return false;
        }
    },

    reset() {
        set({ ...initialState });
    },
}));
