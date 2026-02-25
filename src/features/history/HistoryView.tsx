import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, addDays, isSameDay } from 'date-fns';
import { db } from '../../db/db';
import s from './HistoryView.module.css';

export function HistoryView() {
    const sessions = useLiveQuery(() => db.sessions.toArray());

    const last7 = useMemo(() => {
        const today = new Date();
        return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    }, []);

    const chartData = useMemo(() => {
        if (!sessions) return [];
        const byDay: Record<string, number> = {};
        sessions.forEach(sess => {
            if (!sess.finishedAt) return;
            const key = format(sess.finishedAt, 'yyyy-MM-dd');
            let vol = 0;
            sess.exercises.forEach(ex => {
                ex.sets.forEach(set => {
                    if (set.isCompleted && set.mode === 'strength_reps') {
                        vol += set.reps * set.weightKg;
                    }
                });
            });
            byDay[key] = (byDay[key] ?? 0) + vol;
        });
        return last7.map(d => ({
            day: format(d, 'EEE'),
            volume: byDay[format(d, 'yyyy-MM-dd')] ?? 0,
        }));
    }, [sessions, last7]);

    return (
        <div className={s.page}>
            <div className={s.heading}>
                <h1 className={s.title}>Progress</h1>
                <p className={s.sub}>Your last 7 days at a glance</p>
            </div>

            <div className={s.streak}>
                {last7.map(d => {
                    const active = sessions?.some(sess => sess.finishedAt && isSameDay(new Date(sess.finishedAt), d));
                    return (
                        <div key={d.toISOString()} className={s.dayCol}>
                            <span className={s.dayLabel}>{format(d, 'EEEEE')}</span>
                            <div className={`${s.dayDot} ${active ? s.active : ''}`}>
                                {active && <div className={s.dotInner} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={s.chartCard}>
                <div className={s.chartTitle}>Weekly Volume (kg)</div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--c-border)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--c-text-dim)', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ background: 'var(--c-bg-raised)', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 13 }}
                            itemStyle={{ color: 'var(--c-accent)' }}
                        />
                        <Bar dataKey="volume" fill="var(--c-accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className={s.sectionTitle}>Recent Sessions</div>
            {sessions && sessions.length > 0 ? (
                sessions.slice().reverse().map(sess => (
                    <div key={sess.id} className={s.sessionItem}>
                        <span className={s.sessionName}>{sess.name}</span>
                        <span className={s.sessionDate}>{format(sess.startedAt, 'MMM d, h:mm a')}</span>
                    </div>
                ))
            ) : (
                <div className={s.emptyHistory}>No workouts recorded yet.</div>
            )}
        </div>
    );
}
