import { db } from '../db/db';
import { DEFAULT_EXERCISES, seedExercises } from '../db/seed';
import type { ExerciseTemplate } from '../types/domain';
import { isSupabaseConfigured, supabase } from './supabaseClient';

interface ExerciseCatalogRow {
    definition: unknown;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isExerciseDefinition(value: unknown): value is Partial<ExerciseTemplate> & Pick<ExerciseTemplate, 'id' | 'name' | 'mode'> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;
    return typeof record.id === 'string'
        && typeof record.name === 'string'
        && typeof record.mode === 'string'
        && isStringArray(record.musclesPrimary)
        && (record.musclesSecondary === undefined || isStringArray(record.musclesSecondary))
        && (record.equipment === undefined || isStringArray(record.equipment));
}

function toBuiltInExercise(value: Partial<ExerciseTemplate> & Pick<ExerciseTemplate, 'id' | 'name' | 'mode'>): ExerciseTemplate {
    return {
        id: value.id,
        name: value.name,
        mode: value.mode,
        musclesPrimary: value.musclesPrimary ?? [],
        musclesSecondary: value.musclesSecondary ?? [],
        equipment: value.equipment ?? [],
        description: value.description,
        media: value.media,
        isCustom: false,
    };
}

async function replaceBuiltInExercises(nextBuiltIns: ExerciseTemplate[]) {
    await db.transaction('rw', [db.exercises], async () => {
        const existing = await db.exercises.toArray();
        const customExercises = existing.filter(exercise => exercise.isCustom);
        await db.exercises.clear();
        await db.exercises.bulkPut([...customExercises, ...nextBuiltIns]);
    });
}

async function applyFallbackCatalog() {
    await replaceBuiltInExercises(DEFAULT_EXERCISES);
}

export async function hydrateExerciseCatalog() {
    if (!supabase || !isSupabaseConfigured()) {
        await seedExercises();
        return;
    }

    const { data, error } = await supabase
        .from('exercise_catalog')
        .select('definition')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        await applyFallbackCatalog();
        throw error;
    }

    const remoteExercises = ((data ?? []) as ExerciseCatalogRow[])
        .map(row => row.definition)
        .filter(isExerciseDefinition)
        .map(toBuiltInExercise);

    if (remoteExercises.length === 0) {
        await seedExercises();
        return;
    }

    await replaceBuiltInExercises(remoteExercises);
}
