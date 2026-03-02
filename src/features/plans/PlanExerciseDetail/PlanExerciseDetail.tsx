import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db, planRepo } from '../../../db/db';
import { BodyMap } from '../../../components/BodyMap/BodyMap';
import { PageHeader } from '../../../components/PageHeader/PageHeader';
import styles from './PlanExerciseDetail.module.css';

export function PlanExerciseDetail() {
    const { id: planId, templateId } = useParams<{ id: string; templateId: string }>();
    const navigate = useNavigate();

    const plan = useLiveQuery(() => (planId ? db.plans.get(planId) : undefined), [planId]);
    const template = useLiveQuery(
        () => (templateId ? db.exercises.get(templateId) : undefined),
        [templateId],
    );

    if (!plan || !template || !planId) return null;

    const highlighted = [...template.musclesPrimary, ...(template.musclesSecondary ?? [])];

    const handleAdd = async () => {
        await planRepo.addExercise(plan, template);
        navigate(`/plan/${planId}`);
    };

    return (
        <div className={styles.page}>
            <PageHeader title="Exercise Details" backTo={`/plan/${planId}/add-exercise`} />

            <div className={styles.bodyMapWrap}>
                <BodyMap size="100%" highlightedMuscles={highlighted} />
            </div>

            <h2 className={styles.exerciseName}>{template.name}</h2>
            <div className={styles.modeBadge}>{template.mode.replace(/_/g, ' ')}</div>

            <div className={styles.detailsCard}>
                <div className={styles.detailRow}>
                    <span>Primary muscles</span>
                    <span>{template.musclesPrimary.join(', ') || 'None'}</span>
                </div>
                <div className={styles.detailRow}>
                    <span>Secondary muscles</span>
                    <span>{template.musclesSecondary?.join(', ') || 'None'}</span>
                </div>
                <div className={styles.detailRow}>
                    <span>Equipment</span>
                    <span>{template.equipment.join(', ') || 'None'}</span>
                </div>
            </div>

            <button className={styles.addBtn} onClick={() => void handleAdd()}>
                <Plus size={18} />
                Add Exercise
            </button>
        </div>
    );
}
