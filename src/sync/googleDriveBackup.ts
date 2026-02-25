import type {
    BackupSnapshot,
    CloudBackupService,
    PullResult,
    PushResult,
} from './types';

const BACKUP_FILE_NAME = 'lifti-backup.json';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

let accessToken = '';

interface DriveFile {
    id: string;
    modifiedTime?: string;
}

function requireToken() {
    if (!accessToken) {
        throw new Error('Google access token is missing. Connect backup again.');
    }
}

async function driveRequest<T>(url: string, init?: RequestInit): Promise<T> {
    requireToken();
    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Drive request failed (${response.status})`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json() as Promise<T>;
}

async function findBackupFile(): Promise<DriveFile | null> {
    const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false and 'appDataFolder' in parents`);
    const url = `${DRIVE_FILES_API}?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)&pageSize=1`;
    const result = await driveRequest<{ files?: DriveFile[] }>(url);
    return result.files?.[0] ?? null;
}

async function uploadNewBackup(content: string): Promise<PushResult> {
    const metadata = {
        name: BACKUP_FILE_NAME,
        parents: ['appDataFolder'],
        mimeType: 'application/json',
    };
    const boundary = `lifti-${crypto.randomUUID()}`;
    const body =
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        'Content-Type: application/json\r\n\r\n' +
        `${content}\r\n` +
        `--${boundary}--`;

    const file = await driveRequest<DriveFile>(
        `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,modifiedTime`,
        {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        },
    );

    return { revision: file.modifiedTime };
}

async function updateExistingBackup(fileId: string, content: string): Promise<PushResult> {
    const file = await driveRequest<DriveFile>(
        `${DRIVE_UPLOAD_API}/${fileId}?uploadType=media&fields=id,modifiedTime`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: content,
        },
    );

    return { revision: file.modifiedTime };
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

export const googleDriveBackupService: CloudBackupService & {
    setAccessToken: (token: string) => void;
    deleteRemoteBackup: () => Promise<void>;
} = {
    setAccessToken(token: string) {
        accessToken = token;
    },

    async connect() {
        requireToken();
    },

    async disconnect() {
        accessToken = '';
    },

    async pushChanges(snapshot: BackupSnapshot): Promise<PushResult> {
        const file = await findBackupFile();
        const content = JSON.stringify(snapshot);
        if (!file) {
            return uploadNewBackup(content);
        }
        return updateExistingBackup(file.id, content);
    },

    async pullChanges(): Promise<PullResult> {
        const file = await findBackupFile();
        if (!file) {
            return { snapshot: null };
        }

        const snapshot = await driveRequest<BackupSnapshot>(`${DRIVE_FILES_API}/${file.id}?alt=media`);
        return {
            snapshot,
            revision: file.modifiedTime,
        };
    },

    resolveConflict(local, remote) {
        const mergedPlans = mergeByUpdatedAt(local.plans, remote.plans);
        const mergedSessions = mergeByUpdatedAt(local.sessions, remote.sessions);

        const exerciseMap = new Map(remote.exercises.map(ex => [ex.id, ex]));
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
        const file = await findBackupFile();
        if (!file) return;
        await driveRequest<void>(`${DRIVE_FILES_API}/${file.id}`, { method: 'DELETE' });
    },
};
