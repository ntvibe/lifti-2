// Lifti domain types (strict discriminated unions)

export type ExerciseMode =
  | 'strength_reps'
  | 'bodyweight_reps'
  | 'timed_hold'
  | 'cardio_duration'
  | 'cardio_distance';

export type MuscleId =
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Deltoids'
  | 'RotatorCuff'
  | 'Pectorals'
  | 'UpperBack'
  | 'Trapezius'
  | 'Paravertebrals'
  | 'Abdominals'
  | 'LowerBack'
  | 'Oblique'
  | 'AbdomenTransverse'
  | 'Diaphragm'
  | 'Adductors'
  | 'Gluteus'
  | 'Hamstrings'
  | 'Calves'
  | 'Quadriceps'
  | 'Ileopsoas';

export type EquipmentId =
  | 'Bodyweight'
  | 'Dumbbell'
  | 'Barbell'
  | 'Kettlebell'
  | 'Machine'
  | 'Cable'
  | 'Band'
  | 'SmithMachine'
  | 'Bench'
  | 'PullupBar'
  | 'CardioMachine'
  | 'Other';

export type IsoDateString = string;
export type UUID = string;

export interface Exercise {
  id: UUID;
  name: string;
  mode: ExerciseMode;
  musclesPrimary: MuscleId[];
  equipment: EquipmentId[];
  media?: ExerciseMedia;
  notes?: string;
  isCustom?: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type ExerciseImage = {
  id: UUID;
  src: string;
  label?: string;
};

export type ExerciseImageLoop = 'forward' | 'pingpong';

export type ExerciseMedia = {
  images: ExerciseImage[];
  loop?: ExerciseImageLoop;
  sequence?: number[];
  frameMs?: number;
};

export interface SetBase {
  id: UUID;
  order: number;
  restSec: number;
}

export type PlanSetStrengthReps = SetBase & {
  mode: 'strength_reps';
  reps: number;
  weightKg: number;
};

export type PlanSetBodyweightReps = SetBase & {
  mode: 'bodyweight_reps';
  reps: number;
  weightKg?: number;
};

export type PlanSetTimedHold = SetBase & {
  mode: 'timed_hold';
  durationSec: number;
  weightKg?: number;
};

export type PlanSetCardioDuration = SetBase & {
  mode: 'cardio_duration';
  durationMin: number;
};

export type PlanSetCardioDistance = SetBase & {
  mode: 'cardio_distance';
  distanceKm: number;
};

export type PlanSet =
  | PlanSetStrengthReps
  | PlanSetBodyweightReps
  | PlanSetTimedHold
  | PlanSetCardioDuration
  | PlanSetCardioDistance;

export interface SessionSetBase extends SetBase {
  planSetId: UUID;
  completed: boolean;
  completedAt?: IsoDateString;
  saveToPlan?: boolean;
}

export type SessionSetStrengthReps = SessionSetBase & {
  mode: 'strength_reps';
  reps: number;
  weightKg: number;
};

export type SessionSetBodyweightReps = SessionSetBase & {
  mode: 'bodyweight_reps';
  reps: number;
  weightKg?: number;
};

export type SessionSetTimedHold = SessionSetBase & {
  mode: 'timed_hold';
  durationSec: number;
  weightKg?: number;
};

export type SessionSetCardioDuration = SessionSetBase & {
  mode: 'cardio_duration';
  durationMin: number;
};

export type SessionSetCardioDistance = SessionSetBase & {
  mode: 'cardio_distance';
  distanceKm: number;
};

export type SessionSet =
  | SessionSetStrengthReps
  | SessionSetBodyweightReps
  | SessionSetTimedHold
  | SessionSetCardioDuration
  | SessionSetCardioDistance;

export type PlanSetByMode<M extends ExerciseMode> = Extract<PlanSet, { mode: M }>;
export type SessionSetByMode<M extends ExerciseMode> = Extract<SessionSet, { mode: M }>;
