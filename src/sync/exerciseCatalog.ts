import { db } from '../db/db';
import { DEFAULT_EXERCISES, seedExercises } from '../db/seed';
import type { ExerciseTemplate } from '../types/domain';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface ExerciseCatalogRow {
    id: string;
    definition: unknown;
    sort_order: number;
    is_active: boolean;
    updated_at?: string;
}

export interface ExerciseCatalogEntryInput {
    id: string;
    definition: ExerciseTemplate;
    sortOrder?: number;
    isActive: boolean;
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
        .select('id,definition,sort_order,is_active,updated_at')
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

function requireSupabase() {
    if (!supabase || !isSupabaseConfigured()) {
        throw new Error('Supabase catalog admin is unavailable. Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.');
    }

    return supabase;
}

export async function listExerciseCatalogEntries() {
    const client = requireSupabase();
    const { data, error } = await client
        .from('exercise_catalog')
        .select('id,definition,sort_order,is_active,updated_at')
        .order('is_active', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []) as ExerciseCatalogRow[];
}

export async function saveExerciseCatalogEntry(input: ExerciseCatalogEntryInput) {
    const client = requireSupabase();
    let sortOrder = input.sortOrder;

    if (sortOrder === undefined) {
        const { data: latest, error: latestError } = await client
            .from('exercise_catalog')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestError) {
            throw latestError;
        }

        sortOrder = (latest?.sort_order ?? -1) + 1;
    }

    const { error } = await client
        .from('exercise_catalog')
        .upsert({
            id: input.id,
            definition: input.definition,
            sort_order: sortOrder,
            is_active: input.isActive,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        throw error;
    }

    await hydrateExerciseCatalog();
}

export async function archiveExerciseCatalogEntry(id: string, isActive: boolean) {
    const client = requireSupabase();
    const { error } = await client
        .from('exercise_catalog')
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        throw error;
    }

    await hydrateExerciseCatalog();
}
