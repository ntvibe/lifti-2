import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Cloud, HardDriveDownload, Layers3, ShieldCheck, ShieldUser, UserRound } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { BackupStatusCard } from '../../components/BackupStatusCard';
import { db } from '../../db/db';
import { useAuthStore } from '../../state/authStore';
import { useAdminStore } from '../../state/adminStore';
import styles from './ProfileView.module.css';

export function ProfileView() {
    const navigate = useNavigate();
    const plansCount = useLiveQuery(() => db.plans.count());
    const exerciseCount = useLiveQuery(() => db.exercises.count());
    const sessionCount = useLiveQuery(() => db.sessions.count());

    const user = useAuthStore(state => state.user);
    const provider = useAuthStore(state => state.provider);
    const status = useAuthStore(state => state.status);
    const isAdmin = useAdminStore(state => state.isAdmin);
    const isCheckingAdmin = useAdminStore(state => state.isChecking);
    const adminLastError = useAdminStore(state => state.lastError);
    const claimInitialAdmin = useAdminStore(state => state.claimInitialAdmin);

    const connected = status === 'authenticated' && provider === 'supabase';

    return (
        <div className={styles.page}>
            <PageHeader title="Profile" showBack={false} />

            <section className={styles.hero}>
                <div className={styles.heroAvatar}>
                    <UserRound size={22} />
                </div>
                <div>
                    <div className={styles.heroTitle}>
                        {connected
                            ? user?.name ?? user?.email ?? 'Cloud sync connected'
                            : 'Local-first setup'}
                    </div>
                    <p className={styles.heroMeta}>
                        {connected
                            ? `Signed in with ${user?.email ?? user?.providerName ?? 'Supabase'}`
                            : 'Your plans, sessions, and exercise data live on this device first.'}
                    </p>
                </div>
            </section>

            <section className={styles.metrics}>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Plans</span>
                    <span className={styles.metricValue}>{plansCount ?? 0}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Exercises</span>
                    <span className={styles.metricValue}>{exerciseCount ?? 0}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Sessions</span>
                    <span className={styles.metricValue}>{sessionCount ?? 0}</span>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <Cloud size={16} />
                    <h2>Backup and Sync</h2>
                </div>
                <BackupStatusCard />
            </section>

            {status === 'authenticated' && (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <ShieldUser size={16} />
                        <h2>Admin Tools</h2>
                    </div>
                    <div className={styles.noteCard}>
                        <div className={styles.noteTitle}>
                            <ShieldCheck size={16} />
                            <span>{isAdmin ? 'Catalog admin access is enabled' : 'Exercise catalog admin is locked'}</span>
                        </div>
                        <p>
                            {isAdmin
                                ? 'You can edit the shared exercise catalog from a dedicated admin screen with live Supabase saves.'
                                : 'The first signed-in project owner can claim admin access once. After that, catalog editing is restricted by Supabase policies.'}
                        </p>
                        {adminLastError && <p className={styles.inlineError}>{adminLastError}</p>}
                        <div className={styles.adminActions}>
                            {isAdmin ? (
                                <button className={styles.primaryBtn} onClick={() => navigate('/admin/exercises')}>
                                    Open Exercise Admin
                                </button>
                            ) : (
                                <button className={styles.primaryBtn} onClick={() => void claimInitialAdmin()} disabled={isCheckingAdmin}>
                                    {isCheckingAdmin ? 'Checking access...' : 'Claim Initial Admin Access'}
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <Layers3 size={16} />
                    <h2>Current Setup</h2>
                </div>
                <div className={styles.infoList}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Primary workflow</span>
                        <span className={styles.infoValue}>{'Home / Plan / Session / History'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Units</span>
                        <span className={styles.infoValue}>Metric by default</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Theme</span>
                        <span className={styles.infoValue}>Follows system preference</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Storage</span>
                        <span className={styles.infoValue}>IndexedDB on device, optional Supabase sync</span>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <ShieldCheck size={16} />
                    <h2>App Notes</h2>
                </div>
                <div className={styles.noteCard}>
                    <p>
                        Lifti is designed to stay fast and usable offline first. Backup is optional, and your
                        current navigation is intentionally centered around four primary tabs: Home, Library,
                        History, and Profile.
                    </p>
                </div>
                <div className={styles.noteCard}>
                    <div className={styles.noteTitle}>
                        <HardDriveDownload size={16} />
                        <span>What belongs here now</span>
                    </div>
                    <p>
                        Profile is the stable place for backup controls, setup details, and future preferences,
                        so Home can stay focused on planning and training.
                    </p>
                </div>
            </section>
        </div>
    );
}
