import type {
    BackupSnapshot,
    CloudBackupService,
    PullResult,
    PushResult,
} from './types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

function requireSupabase() {
    if (!supabase || !isSupabaseConfigured()) {
        throw new Error('Supabase sync is unavailable. Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.');
    }

    return supabase;
}

async function requireUserId() {
    const client = requireSupabase();
    const {
        data: { user },
        error,
    } = await client.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error('Sign in before syncing to Supabase.');
    }

    return user.id;
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: number }>(
    localItems: T[],
    remoteItems: T[],
): T[] {
    const map = new Map<string, T>();

    for (const item of remoteItems) {
        map.set(item.id, item);
    }

    for (const local of localItems) {
        const remote = map.get(local.id);
        if (!remote) {
            map.set(local.id, local);
            continue;
        }

        const localStamp = local.updatedAt ?? 0;
        const remoteStamp = remote.updatedAt ?? 0;
        map.set(local.id, localStamp >= remoteStamp ? local : remote);
    }

    return Array.from(map.values());
}

export const supabaseBackupService: CloudBackupService & {
    deleteRemoteBackup: () => Promise<void>;
} = {
    async connect() {
        requireSupabase();
    },

    async disconnect() {
        // The auth session is managed by the Supabase client and auth store.
    },

    async pushChanges(snapshot: BackupSnapshot): Promise<PushResult> {
        const client = requireSupabase();
        const userId = await requireUserId();
        const { data, error } = await client
            .from('user_snapshots')
            .upsert({
                user_id: userId,
                schema_version: snapshot.schemaVersion,
                snapshot,
                updated_at: new Date().toISOString(),
            })
            .select('updated_at')
            .single();

        if (error) {
            throw error;
        }

        return { revision: data.updated_at };
    },

    async pullChanges(): Promise<PullResult> {
        const client = requireSupabase();
        const userId = await requireUserId();
        const { data, error } = await client
            .from('user_snapshots')
            .select('snapshot,updated_at')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return {
            snapshot: (data?.snapshot as BackupSnapshot | null | undefined) ?? null,
            revision: data?.updated_at,
        };
    },

    resolveConflict(local, remote) {
        const mergedPlans = mergeByUpdatedAt(local.plans, remote.plans);
        const mergedSessions = mergeByUpdatedAt(local.sessions, remote.sessions);

        const exerciseMap = new Map(remote.exercises.map(exercise => [exercise.id, exercise]));
        for (const localExercise of local.exercises) {
            exerciseMap.set(localExercise.id, localExercise);
        }

        return {
            schemaVersion: 1,
            exportedAt: Date.now(),
            plans: mergedPlans,
            sessions: mergedSessions,
            exercises: Array.from(exerciseMap.values()),
        };
    },

    async deleteRemoteBackup() {
        const client = requireSupabase();
        const userId = await requireUserId();
        const { error } = await client.from('user_snapshots').delete().eq('user_id', userId);

        if (error) {
            throw error;
        }
    },
};
