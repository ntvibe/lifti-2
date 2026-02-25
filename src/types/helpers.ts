import type {
    ExerciseMode, ExerciseSet, PlanSet, SessionSet,
} from './domain';

/** Create a default PlanSet for a given exercise mode */
export function createDefaultSet(mode: ExerciseMode): PlanSet {
    const id = crypto.randomUUID();
    const restSec = 60;

    switch (mode) {
        case 'strength_reps':
            return { id, mode, reps: 10, weightKg: 20, restSec };
        case 'bodyweight_reps':
            return { id, mode, reps: 10, restSec };
        case 'timed_hold':
            return { id, mode, durationSec: 30, restSec };
        case 'cardio_duration':
            return { id, mode, durationMin: 20, restSec };
        case 'cardio_distance':
            return { id, mode, distanceKm: 5, restSec };
    }
}

/** Duplicate a set with a new id */
export function duplicateSet<T extends ExerciseSet>(set: T): T {
    return { ...set, id: crypto.randomUUID() };
}

/** Convert a PlanSet into a SessionSet */
export function planSetToSessionSet(ps: PlanSet): SessionSet {
    return { ...ps, isCompleted: false, saveToPlan: false };
}

/** Deep-clone any serialisable object (exercises, sessions, etc.) */
export function deepClone<T>(obj: T): T {
    return structuredClone(obj);
}

/** Get the primary numeric value from a set (for display) */
export function getSetPrimaryValue(set: ExerciseSet): number {
    switch (set.mode) {
        case 'strength_reps':
        case 'bodyweight_reps':
            return set.reps;
        case 'timed_hold':
            return set.durationSec;
        case 'cardio_duration':
            return set.durationMin;
        case 'cardio_distance':
            return set.distanceKm;
    }
}

/** Get optional weight value from a set */
export function getSetWeight(set: ExerciseSet): number | undefined {
    if (set.mode === 'strength_reps') return set.weightKg;
    if (set.mode === 'bodyweight_reps') return set.weightKg;
    if (set.mode === 'timed_hold') return set.weightKg;
    return undefined;
}

/** Get the label for the primary value */
export function getSetPrimaryLabel(mode: ExerciseMode): string {
    switch (mode) {
        case 'strength_reps':
        case 'bodyweight_reps':
            return 'Reps';
        case 'timed_hold':
            return 'Sec';
        case 'cardio_duration':
            return 'Min';
        case 'cardio_distance':
            return 'Km';
    }
}

/** Does this mode have a weight field? */
export function modeHasWeight(mode: ExerciseMode): boolean {
    return mode === 'strength_reps' || mode === 'bodyweight_reps' || mode === 'timed_hold';
}

/** Update the primary value of a set, returning a new set */
export function setWithPrimaryValue(set: ExerciseSet, value: number): ExerciseSet {
    switch (set.mode) {
        case 'strength_reps':
            return { ...set, reps: value };
        case 'bodyweight_reps':
            return { ...set, reps: value };
        case 'timed_hold':
            return { ...set, durationSec: value };
        case 'cardio_duration':
            return { ...set, durationMin: value };
        case 'cardio_distance':
            return { ...set, distanceKm: value };
    }
}

/** Update the weight of a set (only for modes that support it) */
export function setWithWeight(set: ExerciseSet, weightKg: number): ExerciseSet {
    if (set.mode === 'strength_reps') return { ...set, weightKg };
    if (set.mode === 'bodyweight_reps') return { ...set, weightKg };
    if (set.mode === 'timed_hold') return { ...set, weightKg };
    return set;
}

/** Update rest on a set */
export function setWithRest(set: ExerciseSet, restSec: number): ExerciseSet {
    return { ...set, restSec };
}

/** Compute volume for one set (used for heatmaps) */
export function setVolume(set: ExerciseSet): number {
    switch (set.mode) {
        case 'strength_reps':
            return set.reps * set.weightKg;
        case 'bodyweight_reps':
            return set.reps * (set.weightKg ?? 1);
        case 'timed_hold':
            return set.durationSec;
        case 'cardio_duration':
            return set.durationMin;
        case 'cardio_distance':
            return set.distanceKm;
    }
}
