import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search } from 'lucide-react';
import { db } from '../../db/db';
import { BodyMap } from '../../components/BodyMap/BodyMap';
import { useAdminStore } from '../../state/adminStore';
import s from './ExerciseLibrary.module.css';

export function ExerciseLibrary() {
    const navigate = useNavigate();
    const exercises = useLiveQuery(() => db.exercises.toArray());
    const [search, setSearch] = useState('');
    const isAdmin = useAdminStore(state => state.isAdmin);

    const filtered = exercises
        ?.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
        .sort((left, right) => left.name.localeCompare(right.name));

    return (
        <div className={s.page}>
            <div className={s.topBar}>
                <div>
                    <span className={s.pageTitle}>Library</span>
                    <p className={s.subTitle}>Browse and curate your exercise bank</p>
                </div>
                <div className={s.actions}>
                    {isAdmin && (
                        <button className={s.secondaryBtn} onClick={() => navigate('/admin/exercises')}>
                            Admin
                        </button>
                    )}
                    <button className={s.importBtn} onClick={() => navigate('/library/import')}>
                        AI Import
                    </button>
                </div>
            </div>

            <div className={s.searchWrap}>
                <Search size={16} className={s.searchIcon} />
                <input
                    className={s.searchInput}
                    placeholder="Search exercises…"
                    aria-label="Search exercises"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className={s.grid}>
                {filtered && filtered.length > 0 ? (
                    filtered.map(ex => (
                        <div key={ex.id} className={s.exerciseCard}>
                            <BodyMap size={50} highlightedMuscles={ex.musclesPrimary} />
                            <div className={s.exName}>{ex.name}</div>
                            <div className={s.exMode}>{ex.mode.replace(/_/g, ' ')}</div>
                        </div>
                    ))
                ) : (
                    <div className={s.empty}>No exercises match your search.</div>
                )}
            </div>
        </div>
    );
}
