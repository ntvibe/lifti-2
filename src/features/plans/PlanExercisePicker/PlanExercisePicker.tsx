import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { db, planRepo } from '../../../db/db';
import { BodyMap } from '../../../components/BodyMap/BodyMap';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import type { ExerciseTemplate, MuscleId } from '../../../types/domain';
import styles from './PlanExercisePicker.module.css';

function filterByMuscles(exercise: ExerciseTemplate, selectedMuscles: MuscleId[]): boolean {
    if (selectedMuscles.length === 0) return true;
    const muscles = new Set([...exercise.musclesPrimary, ...(exercise.musclesSecondary ?? [])]);
    return selectedMuscles.some(muscle => muscles.has(muscle));
}

export function PlanExercisePicker() {
    const { id: planId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const plan = useLiveQuery(() => (planId ? db.plans.get(planId) : undefined), [planId]);
    const templates = useLiveQuery(() => db.exercises.toArray());

    const [search, setSearch] = useState('');
    const [selectedMuscles, setSelectedMuscles] = useState<MuscleId[]>([]);

    const filtered = useMemo(() => {
        if (!templates) return [];
        const term = search.trim().toLowerCase();
        return templates.filter(template => {
            const matchesSearch = template.name.toLowerCase().includes(term);
            return matchesSearch && filterByMuscles(template, selectedMuscles);
        });
    }, [templates, search, selectedMuscles]);

    if (!plan || !planId || !templates) return null;

    const toggleMuscle = (muscleId: MuscleId) => {
        setSelectedMuscles(prev =>
            prev.includes(muscleId)
                ? prev.filter(m => m !== muscleId)
                : [...prev, muscleId],
        );
    };

    const clearMuscles = () => setSelectedMuscles([]);

    const handleAdd = async (template: ExerciseTemplate) => {
        await planRepo.addExercise(plan, template);
        navigate(`/plan/${planId}`);
    };

    const openDetails = (templateId: string) => navigate(`/plan/${planId}/add-exercise/${templateId}`);

    return (
        <div className={styles.page}>
            <PageHeader title="Add Exercise" backTo={`/plan/${planId}`} />

            <div className={styles.bodyMapCard}>
                <BodyMap
                    size="100%"
                    highlightedMuscles={selectedMuscles}
                    onClick={toggleMuscle}
                />
                <div className={styles.bodyMapHint}>
                    <SlidersHorizontal size={14} />
                    Tap muscle groups to filter
                </div>
            </div>

            <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder="Search exercises..."
                    aria-label="Search exercises"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />
            </div>

            {selectedMuscles.length > 0 && (
                <button className={styles.clearFiltersBtn} onClick={clearMuscles}>
                    Clear muscle filters ({selectedMuscles.length})
                </button>
            )}

            <div className={styles.list}>
                {filtered.length > 0 ? (
                    filtered.map(template => (
                        <article
                            key={template.id}
                            className={styles.exerciseRow}
                            role="button"
                            tabIndex={0}
                            onClick={() => openDetails(template.id)}
                            onKeyDown={event => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openDetails(template.id);
                                }
                            }}
                            aria-label={`View details for ${template.name}`}
                        >
                            <div className={styles.exerciseInfo}>
                                <div className={styles.exerciseName}>{template.name}</div>
                                <div className={styles.exerciseMeta}>
                                    {template.mode.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <button
                                className={styles.addBtn}
                                aria-label={`Add ${template.name}`}
                                onClick={event => {
                                    event.stopPropagation();
                                    void handleAdd(template);
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </article>
                    ))
                ) : (
                    <div className={styles.empty}>No exercises match these filters.</div>
                )}
            </div>
        </div>
    );
}
