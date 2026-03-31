import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Play, Dumbbell, BookOpen, BarChart3, Settings2, Clock3, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db, planRepo } from '../../../db/db';
import { BodyMap } from '../../../components/BodyMap/BodyMap';
import { BackupStatusCard } from '../../../components/BackupStatusCard';
import { setVolume } from '../../../types/helpers';
import type { MuscleId, Plan, ExerciseTemplate } from '../../../types/domain';
import styles from './PlansHome.module.css';

export function PlansHome() {
    const navigate = useNavigate();
    const [queryBuster, setQueryBuster] = useState(0);
    const plans = useLiveQuery(
        () => db.plans.orderBy('updatedAt').reverse().toArray(),
        [queryBuster],
    );
    const templates = useLiveQuery(() => db.exercises.toArray());
    const sessionCount = useLiveQuery(() => db.sessions.count(), [queryBuster]);
    const latestSession = useLiveQuery(
        () => db.sessions.orderBy('startedAt').reverse().limit(1).toArray(),
        [queryBuster],
    );

    useEffect(() => {
        const refreshPlans = () => {
            setQueryBuster(prev => prev + 1);
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') refreshPlans();
        };

        window.addEventListener('pageshow', refreshPlans);
        window.addEventListener('focus', refreshPlans);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pageshow', refreshPlans);
            window.removeEventListener('focus', refreshPlans);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleNew = async () => {
        const plan = await planRepo.create('New Plan');
        setQueryBuster(prev => prev + 1);
        navigate(`/plan/${plan.id}`);
    };

    const handleDeletePlan = async (plan: Plan) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${plan.name}"?`);
        if (!confirmed) return;
        await planRepo.delete(plan.id);
        setQueryBuster(prev => prev + 1);
    };

    const totalExercises = plans?.reduce((sum, p) => sum + p.exercises.length, 0) ?? 0;
    const lastSession = latestSession?.[0];
    const recentActivityLabel = lastSession
        ? lastSession.finishedAt
            ? `Completed ${formatDistanceToNow(lastSession.finishedAt, { addSuffix: true })}`
            : `Started ${formatDistanceToNow(lastSession.startedAt, { addSuffix: true })}`
        : 'No sessions yet';

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <div>
                    <span className={styles.logo}>Lifti</span>
                    <p className={styles.subtitle}>Plan cleanly, train with flow, keep your history close.</p>
                </div>
                <button className={styles.newBtn} onClick={handleNew}>
                    <Plus size={16} /> New Plan
                </button>
            </div>

            <div className={styles.metrics}>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Plans</span>
                    <span className={styles.metricValue}>{plans?.length ?? 0}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Exercises</span>
                    <span className={styles.metricValue}>{totalExercises}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>Sessions</span>
                    <span className={styles.metricValue}>{sessionCount ?? 0}</span>
                </div>
            </div>

            <div className={styles.quickActions}>
                <button className={styles.quickActionCard} onClick={() => navigate('/library')}>
                    <BookOpen size={18} />
                    <div>
                        <span className={styles.quickActionTitle}>Exercise Library</span>
                        <span className={styles.quickActionMeta}>Search, browse, and import custom movements.</span>
                    </div>
                </button>
                <button className={styles.quickActionCard} onClick={() => navigate('/history')}>
                    <BarChart3 size={18} />
                    <div>
                        <span className={styles.quickActionTitle}>History</span>
                        <span className={styles.quickActionMeta}>See recent sessions and weekly training volume.</span>
                    </div>
                </button>
                <button className={styles.quickActionCard} onClick={() => navigate('/profile')}>
                    <Settings2 size={18} />
                    <div>
                        <span className={styles.quickActionTitle}>Profile</span>
                        <span className={styles.quickActionMeta}>Backup, setup, and app details live here now.</span>
                    </div>
                </button>
            </div>

            <div className={styles.dashboardRow}>
                <div className={styles.recentCard}>
                    <div className={styles.recentHeader}>
                        <div>
                            <span className={styles.recentEyebrow}>Recent Activity</span>
                            <h2 className={styles.recentTitle}>Keep the loop visible</h2>
                        </div>
                        <Clock3 size={18} className={styles.recentIcon} />
                    </div>
                    {lastSession ? (
                        <>
                            <div className={styles.recentSessionName}>{lastSession.name}</div>
                            <p className={styles.recentSessionMeta}>{recentActivityLabel}</p>
                        </>
                    ) : (
                        <p className={styles.recentSessionMeta}>Finish a workout and it will show up here first.</p>
                    )}
                    <button className={styles.recentLinkBtn} onClick={() => navigate('/history')}>
                        Open History <ArrowRight size={15} />
                    </button>
                </div>

                <BackupStatusCard variant="compact" />
            </div>

            <div className={styles.sectionHead}>
                <div>
                    <h2>Your Plans</h2>
                    <p className={styles.sectionSub}>Open a plan to edit, or jump straight into a session.</p>
                </div>
            </div>

            {plans && plans.length > 0 ? (
                <div className={styles.grid}>
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            templates={templates ?? []}
                            onOpen={() => navigate(`/plan/${plan.id}`)}
                            onStart={() => navigate(`/session/${plan.id}`)}
                            onLongDelete={() => void handleDeletePlan(plan)}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <Dumbbell size={48} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No plans yet</p>
                    <p>Create your first workout plan to get started.</p>
                </div>
            )}
        </div>
    );
}

// ── Plan Card ──

interface PlanCardProps {
    plan: Plan;
    templates: ExerciseTemplate[];
    onOpen: () => void;
    onStart: () => void;
    onLongDelete: () => void;
}

const LONG_PRESS_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

function PlanCard({ plan, templates, onOpen, onStart, onLongDelete }: PlanCardProps) {
    const holdTimerRef = useRef<number | null>(null);
    const pressStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
    const longPressTriggeredRef = useRef(false);

    const clearLongPress = useCallback(() => {
        if (holdTimerRef.current) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        pressStartRef.current = null;
    }, []);

    useEffect(() => () => clearLongPress(), [clearLongPress]);

    const heatmap = useMemo(() => {
        const map: Partial<Record<MuscleId, number>> = {};
        for (const ex of plan.exercises) {
            const tpl = templates.find(t => t.id === ex.templateId);
            if (!tpl) continue;
            const vol = ex.sets.reduce((sum, s) => sum + setVolume(s), 0);
            for (const m of tpl.musclesPrimary) {
                map[m] = (map[m] ?? 0) + vol;
            }
            for (const m of tpl.musclesSecondary ?? []) {
                map[m] = (map[m] ?? 0) + vol * 0.4;
            }
        }
        return map;
    }, [plan, templates]);

    const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest('button')) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        clearLongPress();
        longPressTriggeredRef.current = false;
        pressStartRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };
        holdTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            onLongDelete();
        }, LONG_PRESS_MS);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
        const press = pressStartRef.current;
        if (!press || press.pointerId !== event.pointerId || longPressTriggeredRef.current) return;
        const movedDistance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
        if (movedDistance > LONG_PRESS_MOVE_TOLERANCE_PX) {
            clearLongPress();
        }
    };

    const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
        if (pressStartRef.current?.pointerId !== event.pointerId) return;
        clearLongPress();
    };

    return (
        <article
            className={styles.card}
            role="button"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            onClick={() => {
                if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    return;
                }
                onOpen();
            }}
            onKeyDown={event => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            aria-label={`Open ${plan.name}`}
        >
            <div className={styles.cardMapWrap}>
                <BodyMap size="100%" heatmap={heatmap} />
            </div>
            <div className={styles.cardName}>{plan.name}</div>
            <div className={styles.cardMeta}>
                {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.cardActions}>
                <button className={styles.startBtn} onClick={e => { e.stopPropagation(); onStart(); }}>
                    <Play size={14} /> Start
                </button>
            </div>
        </article>
    );
}
