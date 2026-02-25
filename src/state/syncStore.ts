import { create } from 'zustand';
import { db, syncMetaRepo, syncQueueRepo } from '../db/db';
import { useAuthStore } from './authStore';
import { googleDriveBackupService } from '../sync/googleDriveBackup';
import type { BackupSnapshot, SyncState } from '../sync/types';

interface SyncStore extends SyncState {
    initialize: () => Promise<void>;
    refreshPendingOps: () => Promise<void>;
    syncNow: () => Promise<void>;
    disconnectCloud: () => Promise<void>;
    deleteCloudBackup: () => Promise<void>;
}

const initialState: SyncState = {
    status: 'idle',
    pendingOps: 0,
};

function getDeviceId(): string {
    const key = 'lifti-device-id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
}

function resolveSyncStatus(pendingOps: number): SyncState['status'] {
    return pendingOps > 0 ? 'out_of_sync' : 'idle';
}

function buildSnapshot(): Promise<BackupSnapshot> {
    return db.transaction('r', [db.exercises, db.plans, db.sessions], async () => {
        const [exercises, plans, sessions] = await Promise.all([
            db.exercises.toArray(),
            db.plans.toArray(),
            db.sessions.toArray(),
        ]);

        return {
            schemaVersion: 1,
            exportedAt: Date.now(),
            exercises,
            plans,
            sessions,
        };
    });
}

async function writeSnapshot(snapshot: BackupSnapshot) {
    await db.transaction('rw', [db.exercises, db.plans, db.sessions], async () => {
        await db.exercises.bulkPut(snapshot.exercises);
        await db.plans.bulkPut(snapshot.plans);
        await db.sessions.bulkPut(snapshot.sessions);
    });
}

export const useSyncStore = create<SyncStore>((set, get) => ({
    ...initialState,

    async initialize() {
        const count = await syncQueueRepo.count();
        const lastSyncAt = await syncMetaRepo.get('lastSyncAt');
        set({
            pendingOps: count,
            lastSyncedAt: lastSyncAt ? Number(lastSyncAt) : undefined,
            status: resolveSyncStatus(count),
        });
    },

    async refreshPendingOps() {
        const count = await syncQueueRepo.count();
        set(state => ({
            pendingOps: count,
            status: state.status === 'syncing' ? 'syncing' : resolveSyncStatus(count),
        }));
    },

    async syncNow() {
        const auth = useAuthStore.getState();
        if (auth.status !== 'authenticated' || !auth.accessToken || !auth.user?.id) {
            await get().refreshPendingOps();
            return;
        }

        set({ status: 'syncing', lastError: undefined });

        try {
            googleDriveBackupService.setAccessToken(auth.accessToken);
            await googleDriveBackupService.connect();

            const localSnapshot = await buildSnapshot();
            const lastRevision = await syncMetaRepo.get('lastRemoteRevision');
            const remote = await googleDriveBackupService.pullChanges(lastRevision ?? undefined);

            const merged = remote.snapshot
                ? googleDriveBackupService.resolveConflict(localSnapshot, remote.snapshot)
                : localSnapshot;

            await writeSnapshot(merged);
            const pushed = await googleDriveBackupService.pushChanges(merged, lastRevision ?? undefined);

            const now = Date.now();
            await Promise.all([
                syncQueueRepo.clear(),
                syncMetaRepo.set('deviceId', getDeviceId()),
                syncMetaRepo.set('accountId', auth.user.id),
                syncMetaRepo.set('lastSyncAt', String(now)),
                syncMetaRepo.set('lastRemoteRevision', pushed.revision ?? remote.revision ?? String(now)),
            ]);

            set({
                status: 'idle',
                lastSyncedAt: now,
                pendingOps: 0,
                lastError: undefined,
            });
        } catch (error) {
            const count = await syncQueueRepo.count();
            set({
                status: count > 0 ? 'out_of_sync' : 'error',
                pendingOps: count,
                lastError: error instanceof Error ? error.message : 'Sync failed.',
            });
        }
    },

    async disconnectCloud() {
        await googleDriveBackupService.disconnect();
        await Promise.all([
            syncMetaRepo.remove('accountId'),
            syncMetaRepo.remove('lastRemoteRevision'),
        ]);

        const count = await syncQueueRepo.count();
        set({
            status: resolveSyncStatus(count),
            pendingOps: count,
            lastError: undefined,
        });
    },

    async deleteCloudBackup() {
        const auth = useAuthStore.getState();
        if (auth.status !== 'authenticated' || !auth.accessToken) {
            set({ lastError: 'Connect backup before deleting cloud data.' });
            return;
        }

        try {
            googleDriveBackupService.setAccessToken(auth.accessToken);
            await googleDriveBackupService.deleteRemoteBackup();
            await syncMetaRepo.remove('lastRemoteRevision');
            set({ lastError: undefined });
        } catch (error) {
            set({
                lastError: error instanceof Error ? error.message : 'Failed to delete cloud backup.',
            });
        }
    },
}));
