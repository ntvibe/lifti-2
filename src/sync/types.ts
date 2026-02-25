import type { ExerciseTemplate, Plan, WorkoutSession } from '../types/domain';

export interface AuthUser {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
}

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated';

export interface AuthState {
    status: AuthStatus;
    user?: AuthUser;
    provider: 'google' | null;
    accessToken?: string;
    tokenExpiresAt?: number;
    lastError?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'out_of_sync';

export interface SyncState {
    status: SyncStatus;
    lastSyncedAt?: number;
    pendingOps: number;
    lastError?: string;
}

export interface SyncMetadata {
    deviceId: string;
    accountId: string;
    lastRemoteRevision?: string;
    lastSyncAt?: number;
}

export interface BackupSnapshot {
    schemaVersion: 1;
    exportedAt: number;
    plans: Plan[];
    sessions: WorkoutSession[];
    exercises: ExerciseTemplate[];
}

export interface PullResult {
    snapshot: BackupSnapshot | null;
    revision?: string;
}

export interface PushResult {
    revision?: string;
}

export interface CloudBackupService {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    pushChanges(snapshot: BackupSnapshot, sinceCursor?: string): Promise<PushResult>;
    pullChanges(sinceCursor?: string): Promise<PullResult>;
    resolveConflict(local: BackupSnapshot, remote: BackupSnapshot): BackupSnapshot;
}
