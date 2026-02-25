import { Cloud, CloudOff, LoaderCircle, RefreshCw, Trash2, Unplug } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../state/authStore';
import { useSyncStore } from '../state/syncStore';
import type { SyncStatus } from '../sync/types';
import styles from './BackupStatusCard.module.css';

function getStatusLabel(syncStatus: SyncStatus) {
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'out_of_sync') return 'Out of sync';
    if (syncStatus === 'error') return 'Out of sync';
    return 'Saved locally';
}

export function BackupStatusCard() {
    const auth = useAuthStore(state => ({
        status: state.status,
        user: state.user,
        provider: state.provider,
        lastError: state.lastError,
        connectGoogle: state.connectGoogle,
        disconnect: state.disconnect,
    }));

    const sync = useSyncStore(state => ({
        status: state.status,
        pendingOps: state.pendingOps,
        lastSyncedAt: state.lastSyncedAt,
        lastError: state.lastError,
        syncNow: state.syncNow,
        deleteCloudBackup: state.deleteCloudBackup,
        disconnectCloud: state.disconnectCloud,
    }));

    const connected = auth.status === 'authenticated' && auth.provider === 'google';
    const statusLabel = getStatusLabel(sync.status);

    const handleEnableBackup = async () => {
        const success = await auth.connectGoogle();
        if (success) {
            await sync.syncNow();
        }
    };

    const handleDisconnect = async () => {
        await Promise.all([auth.disconnect(), sync.disconnectCloud()]);
    };

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleRow}>
                    {connected ? <Cloud size={16} /> : <CloudOff size={16} />}
                    <h3 className={styles.title}>
                        {connected ? 'Backup connected to Google' : 'Back up your plans and history'}
                    </h3>
                </div>
                <span className={`${styles.badge} ${sync.status === 'out_of_sync' ? styles.outOfSync : ''}`}>
                    {statusLabel}
                </span>
            </div>

            <p className={styles.meta}>
                {connected
                    ? `Connected as ${auth.user?.email ?? auth.user?.name ?? 'Google account'}`
                    : 'Optional backup. Training remains fully offline-first.'}
            </p>

            {connected && (
                <p className={styles.meta}>
                    {sync.lastSyncedAt
                        ? `Last sync ${formatDistanceToNow(sync.lastSyncedAt, { addSuffix: true })}`
                        : 'Not synced yet'}
                    {sync.pendingOps > 0 ? ` • ${sync.pendingOps} pending` : ''}
                </p>
            )}

            {(auth.lastError || sync.lastError) && (
                <p className={styles.errorText}>{sync.lastError ?? auth.lastError}</p>
            )}

            <div className={styles.actions}>
                {!connected ? (
                    <button className={styles.primaryBtn} onClick={handleEnableBackup} disabled={auth.status === 'authenticating'}>
                        {auth.status === 'authenticating' ? (
                            <><LoaderCircle size={14} className={styles.spin} /> Connecting...</>
                        ) : (
                            <><Cloud size={14} /> Enable backup</>
                        )}
                    </button>
                ) : (
                    <>
                        <button className={styles.secondaryBtn} onClick={sync.syncNow} disabled={sync.status === 'syncing'}>
                            {sync.status === 'syncing' ? (
                                <><LoaderCircle size={14} className={styles.spin} /> Syncing...</>
                            ) : (
                                <><RefreshCw size={14} /> Sync now</>
                            )}
                        </button>
                        <button className={styles.secondaryBtn} onClick={handleDisconnect}>
                            <Unplug size={14} /> Disconnect
                        </button>
                        <button className={styles.dangerBtn} onClick={sync.deleteCloudBackup}>
                            <Trash2 size={14} /> Delete cloud backup only
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}
