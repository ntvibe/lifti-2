/* ─────────────────────────────────────────
   Lifti Domain Types — Locked Contract
   ───────────────────────────────────────── */

// ── Enums ──

export const MUSCLE_IDS = [
    'Biceps', 'Triceps', 'Forearms', 'Deltoids', 'RotatorCuff',
    'Pectorals', 'UpperBack', 'Trapezius', 'Paravertebrals',
    'Abdominals', 'LowerBack', 'Oblique', 'AbdomenTransverse',
    'Diaphragm', 'Adductors', 'Gluteus', 'Hamstrings',
    'Calves', 'Quadriceps', 'Ileopsoas',
] as const;
export type MuscleId = typeof MUSCLE_IDS[number];

export const EQUIPMENT_IDS = [
    'Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable',
    'Band', 'Bodyweight', 'Bench', 'PullUpBar', 'None',
] as const;
export type EquipmentId = typeof EQUIPMENT_IDS[number];

export const EXERCISE_MODES = [
    'strength_reps', 'bodyweight_reps', 'timed_hold',
    'cardio_duration', 'cardio_distance',
] as const;
export type ExerciseMode = typeof EXERCISE_MODES[number];

// ── Exercise Sets (discriminated union) ──

interface BaseSet {
    id: string;
    restSec: number;      // always required, default 60
}

export interface StrengthRepsSet extends BaseSet {
    mode: 'strength_reps';
    reps: number;
    weightKg: number;
}
export interface BodyweightRepsSet extends BaseSet {
    mode: 'bodyweight_reps';
    reps: number;
    weightKg?: number;
}
export interface TimedHoldSet extends BaseSet {
    mode: 'timed_hold';
    durationSec: number;
    weightKg?: number;
}
export interface CardioDurationSet extends BaseSet {
    mode: 'cardio_duration';
    durationMin: number;
}
export interface CardioDistanceSet extends BaseSet {
    mode: 'cardio_distance';
    distanceKm: number;
}

export type ExerciseSet =
    | StrengthRepsSet
    | BodyweightRepsSet
    | TimedHoldSet
    | CardioDurationSet
    | CardioDistanceSet;

// ── PlanSet = same union (the "template" values for a plan) ──
// We reuse the exact same shapes so we never lose type safety.
export type PlanSet = ExerciseSet;

// ── SessionSet = ExerciseSet + tracking fields ──
export type SessionSet = ExerciseSet & {
    isCompleted: boolean;
    saveToPlan: boolean;
    completedAt?: number;
};

// ── Exercise media ──

export type MediaLoopMode = 'forward' | 'pingpong';

export interface ExerciseMedia {
    images: string[];
    loopMode: MediaLoopMode;
    sequence?: number[];
    frameTimingMs?: number;
}

// ── Exercise Template ──

export interface ExerciseTemplate {
    id: string;
    name: string;
    description?: string;
    mode: ExerciseMode;
    musclesPrimary: MuscleId[];
    musclesSecondary?: MuscleId[];
    equipment: EquipmentId[];
    media?: ExerciseMedia;
    isCustom: boolean;
}

// ── Plan ──

export interface PlanExercise {
    id: string;          // instance id (unique per plan)
    templateId: string;  // references ExerciseTemplate.id
    sets: PlanSet[];
}

export interface Plan {
    id: string;
    name: string;
    description?: string;
    exercises: PlanExercise[]; // ordered array
    createdAt: number;
    updatedAt: number;
}

// ── Workout Session ──

export interface SessionExercise {
    id: string;
    templateId: string;
    sets: SessionSet[];
}

export interface WorkoutSession {
    id: string;
    planId: string;
    name: string;
    startedAt: number;
    finishedAt?: number;
    exercises: SessionExercise[];
    updatedAt: number;
}
