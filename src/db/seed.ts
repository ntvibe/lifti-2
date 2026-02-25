import { db } from './db';
import type { ExerciseTemplate } from '../types/domain';

const EXERCISES: ExerciseTemplate[] = [
    // ── CHEST ──
    { id: 'bench-press', name: 'Bench Press', mode: 'strength_reps', musclesPrimary: ['Pectorals'], musclesSecondary: ['Triceps', 'Deltoids'], equipment: ['Barbell', 'Bench'], isCustom: false },
    { id: 'incline-bench', name: 'Incline Bench Press', mode: 'strength_reps', musclesPrimary: ['Pectorals'], musclesSecondary: ['Deltoids', 'Triceps'], equipment: ['Barbell', 'Bench'], isCustom: false },
    { id: 'db-fly', name: 'Dumbbell Fly', mode: 'strength_reps', musclesPrimary: ['Pectorals'], musclesSecondary: ['Deltoids'], equipment: ['Dumbbell', 'Bench'], isCustom: false },
    { id: 'push-up', name: 'Push Up', mode: 'bodyweight_reps', musclesPrimary: ['Pectorals'], musclesSecondary: ['Triceps', 'Deltoids'], equipment: ['Bodyweight'], isCustom: false },
    { id: 'dips', name: 'Dips', mode: 'bodyweight_reps', musclesPrimary: ['Pectorals', 'Triceps'], equipment: ['Bodyweight'], isCustom: false },

    // ── BACK ──
    { id: 'pull-up', name: 'Pull Up', mode: 'bodyweight_reps', musclesPrimary: ['UpperBack'], musclesSecondary: ['Biceps', 'Forearms'], equipment: ['PullUpBar'], isCustom: false },
    { id: 'barbell-row', name: 'Barbell Row', mode: 'strength_reps', musclesPrimary: ['UpperBack'], musclesSecondary: ['Biceps', 'Trapezius'], equipment: ['Barbell'], isCustom: false },
    { id: 'lat-pulldown', name: 'Lat Pulldown', mode: 'strength_reps', musclesPrimary: ['UpperBack'], musclesSecondary: ['Biceps'], equipment: ['Cable'], isCustom: false },
    { id: 'seated-cable-row', name: 'Seated Cable Row', mode: 'strength_reps', musclesPrimary: ['UpperBack'], musclesSecondary: ['Biceps', 'Trapezius'], equipment: ['Cable'], isCustom: false },
    { id: 'face-pull', name: 'Face Pull', mode: 'strength_reps', musclesPrimary: ['RotatorCuff', 'Trapezius'], musclesSecondary: ['Deltoids'], equipment: ['Cable'], isCustom: false },

    // ── SHOULDERS ──
    { id: 'ohp', name: 'Overhead Press', mode: 'strength_reps', musclesPrimary: ['Deltoids'], musclesSecondary: ['Triceps', 'Trapezius'], equipment: ['Barbell'], isCustom: false },
    { id: 'lateral-raise', name: 'Lateral Raise', mode: 'strength_reps', musclesPrimary: ['Deltoids'], equipment: ['Dumbbell'], isCustom: false },
    { id: 'rear-delt-fly', name: 'Rear Delt Fly', mode: 'strength_reps', musclesPrimary: ['Deltoids', 'RotatorCuff'], equipment: ['Dumbbell'], isCustom: false },

    // ── ARMS ──
    { id: 'barbell-curl', name: 'Barbell Curl', mode: 'strength_reps', musclesPrimary: ['Biceps'], musclesSecondary: ['Forearms'], equipment: ['Barbell'], isCustom: false },
    { id: 'db-curl', name: 'Dumbbell Curl', mode: 'strength_reps', musclesPrimary: ['Biceps'], equipment: ['Dumbbell'], isCustom: false },
    { id: 'tricep-pushdown', name: 'Tricep Pushdown', mode: 'strength_reps', musclesPrimary: ['Triceps'], equipment: ['Cable'], isCustom: false },
    { id: 'skull-crusher', name: 'Skull Crusher', mode: 'strength_reps', musclesPrimary: ['Triceps'], equipment: ['Barbell', 'Bench'], isCustom: false },
    { id: 'hammer-curl', name: 'Hammer Curl', mode: 'strength_reps', musclesPrimary: ['Biceps', 'Forearms'], equipment: ['Dumbbell'], isCustom: false },

    // ── LEGS ──
    { id: 'squat', name: 'Squat', mode: 'strength_reps', musclesPrimary: ['Quadriceps'], musclesSecondary: ['Gluteus', 'Hamstrings'], equipment: ['Barbell'], isCustom: false },
    { id: 'deadlift', name: 'Deadlift', mode: 'strength_reps', musclesPrimary: ['Hamstrings', 'Gluteus'], musclesSecondary: ['LowerBack', 'Quadriceps'], equipment: ['Barbell'], isCustom: false },
    { id: 'rdl', name: 'Romanian Deadlift', mode: 'strength_reps', musclesPrimary: ['Hamstrings'], musclesSecondary: ['Gluteus', 'LowerBack'], equipment: ['Barbell'], isCustom: false },
    { id: 'leg-press', name: 'Leg Press', mode: 'strength_reps', musclesPrimary: ['Quadriceps'], musclesSecondary: ['Gluteus'], equipment: ['Machine'], isCustom: false },
    { id: 'leg-curl', name: 'Leg Curl', mode: 'strength_reps', musclesPrimary: ['Hamstrings'], equipment: ['Machine'], isCustom: false },
    { id: 'leg-extension', name: 'Leg Extension', mode: 'strength_reps', musclesPrimary: ['Quadriceps'], equipment: ['Machine'], isCustom: false },
    { id: 'lunge', name: 'Walking Lunge', mode: 'strength_reps', musclesPrimary: ['Quadriceps', 'Gluteus'], musclesSecondary: ['Hamstrings'], equipment: ['Dumbbell'], isCustom: false },
    { id: 'calf-raise', name: 'Calf Raise', mode: 'strength_reps', musclesPrimary: ['Calves'], equipment: ['Machine'], isCustom: false },
    { id: 'hip-thrust', name: 'Hip Thrust', mode: 'strength_reps', musclesPrimary: ['Gluteus'], musclesSecondary: ['Hamstrings'], equipment: ['Barbell', 'Bench'], isCustom: false },

    // ── CORE ──
    { id: 'plank', name: 'Plank', mode: 'timed_hold', musclesPrimary: ['Abdominals', 'Paravertebrals'], equipment: ['Bodyweight'], isCustom: false },
    { id: 'dead-hang', name: 'Dead Hang', mode: 'timed_hold', musclesPrimary: ['Forearms'], musclesSecondary: ['UpperBack'], equipment: ['PullUpBar'], isCustom: false },
    { id: 'ab-roller', name: 'Ab Roller', mode: 'bodyweight_reps', musclesPrimary: ['Abdominals'], musclesSecondary: ['Oblique'], equipment: ['Bodyweight'], isCustom: false },
    { id: 'russian-twist', name: 'Russian Twist', mode: 'bodyweight_reps', musclesPrimary: ['Oblique', 'Abdominals'], equipment: ['Bodyweight'], isCustom: false },
    { id: 'cable-crunch', name: 'Cable Crunch', mode: 'strength_reps', musclesPrimary: ['Abdominals'], equipment: ['Cable'], isCustom: false },

    // ── CARDIO ──
    { id: 'treadmill-run', name: 'Treadmill Run', mode: 'cardio_duration', musclesPrimary: ['Quadriceps', 'Calves'], equipment: ['Machine'], isCustom: false },
    { id: 'outdoor-run', name: 'Outdoor Run', mode: 'cardio_distance', musclesPrimary: ['Quadriceps', 'Calves'], equipment: ['None'], isCustom: false },
    { id: 'rowing-machine', name: 'Rowing Machine', mode: 'cardio_duration', musclesPrimary: ['UpperBack', 'Quadriceps'], musclesSecondary: ['Biceps'], equipment: ['Machine'], isCustom: false },
];

export async function seedExercises() {
    const count = await db.exercises.count();
    if (count > 0) return;
    await db.exercises.bulkAdd(EXERCISES);
}
