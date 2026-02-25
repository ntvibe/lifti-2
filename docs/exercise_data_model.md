# Lifti — Exercise Data Model

## Exercise

Each exercise contains:

* id: string (UUID)
* name: string
* mode: ExerciseMode
* musclesPrimary: MuscleId[] (can be empty)
* equipment: EquipmentId[] (can be empty)
* media?: ExerciseMedia
* notes?: string
* isCustom?: boolean
* createdAt: ISO string
* updatedAt: ISO string

---

## ExerciseMode

* strength_reps
  Required set fields: reps, weightKg, restSec

* bodyweight_reps
  Required set fields: reps, restSec
  Optional: weightKg

* timed_hold
  Required set fields: durationSec, restSec
  Optional: weightKg

* cardio_duration
  Required set fields: durationMin, restSec

* cardio_distance
  Required set fields: distanceKm, restSec

Global rule:

* restSec is always required
* default restSec = 60

---

## MuscleId

Biceps
Triceps
Forearms
Deltoids
RotatorCuff
Pectorals
UpperBack
Trapezius
Paravertebrals
Abdominals
LowerBack
Oblique
AbdomenTransverse
Diaphragm
Adductors
Gluteus
Hamstrings
Calves
Quadriceps
Ileopsoas

---

## EquipmentId

Bodyweight
Dumbbell
Barbell
Kettlebell
Machine
Cable
Band
SmithMachine
Bench
PullupBar
CardioMachine
Other

---

# Set Data Model

A Set is a row in the exercise table (reps / weight / rest / etc.).

## PlanSet (template stored inside a plan)

* id: string (UUID)
* order: number
* restSec: number (default 60)
* reps?: number
* weightKg?: number
* durationSec?: number
* durationMin?: number
* distanceKm?: number

Rules by ExerciseMode:

* strength_reps: reps + weightKg + restSec required
* bodyweight_reps: reps + restSec required (weightKg optional)
* timed_hold: durationSec + restSec required (weightKg optional)
* cardio_duration: durationMin + restSec required
* cardio_distance: distanceKm + restSec required

---

## SessionSet (recorded during workout)

SessionSet starts as a copy of PlanSet, then the user can modify it.

* id: string (UUID)
* planSetId: string (UUID)
* order: number
* restSec: number
* reps?: number
* weightKg?: number
* durationSec?: number
* durationMin?: number
* distanceKm?: number
* completed: boolean
* completedAt?: ISO string
* saveToPlan?: boolean

---

## Save for Next Time Behavior

* During workout, user edits a SessionSet.
* If saveToPlan is true for that set, changes are applied back to the matching PlanSet (matched by planSetId).
* Editable fields replaced: reps, weightKg, durationSec, durationMin, distanceKm, restSec.
* If saveToPlan is false, the original plan remains unchanged.

---

# TypeScript Types (Strict)

```ts
// Lifti domain types (strict discriminated unions)

export type ExerciseMode =
  | "strength_reps"
  | "bodyweight_reps"
  | "timed_hold"
  | "cardio_duration"
  | "cardio_distance";

export type MuscleId =
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Deltoids"
  | "RotatorCuff"
  | "Pectorals"
  | "UpperBack"
  | "Trapezius"
  | "Paravertebrals"
  | "Abdominals"
  | "LowerBack"
  | "Oblique"
  | "AbdomenTransverse"
  | "Diaphragm"
  | "Adductors"
  | "Gluteus"
  | "Hamstrings"
  | "Calves"
  | "Quadriceps"
  | "Ileopsoas";

export type EquipmentId =
  | "Bodyweight"
  | "Dumbbell"
  | "Barbell"
  | "Kettlebell"
  | "Machine"
  | "Cable"
  | "Band"
  | "SmithMachine"
  | "Bench"
  | "PullupBar"
  | "CardioMachine"
  | "Other";

export type IsoDateString = string;
export type UUID = string;

export interface Exercise {
  id: UUID;
  name: string;
  mode: ExerciseMode;
  musclesPrimary: MuscleId[]; // can be empty
  equipment: EquipmentId[]; // can be empty
  media?: ExerciseMedia;
  notes?: string;
  isCustom?: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type ExerciseImage = {
  id: UUID;
  // local blob key, url, or drive path depending on storage layer
  src: string;
  // optional label like "Pose 1"
  label?: string;
};

export type ExerciseImageLoop = "forward" | "pingpong";

export type ExerciseMedia = {
  images: ExerciseImage[]; // usually 2, can be 0+ for custom
  loop?: ExerciseImageLoop; // default "forward"
  // optional explicit order; if omitted, use images array order
  sequence?: number[]; // indexes into images, e.g. [0,1,2] or [0,1,2,1,0]
  // optional timing for autoplay preview
  frameMs?: number; // default 800
};

// ---------- Sets ----------

export interface SetBase {
  id: UUID;
  order: number;
  restSec: number; // default 60
}

// PlanSet variants (template rows)
export type PlanSetStrengthReps = SetBase & {
  mode: "strength_reps";
  reps: number;
  weightKg: number;
};

export type PlanSetBodyweightReps = SetBase & {
  mode: "bodyweight_reps";
  reps: number;
  weightKg?: number;
};

export type PlanSetTimedHold = SetBase & {
  mode: "timed_hold";
  durationSec: number;
  weightKg?: number;
};

export type PlanSetCardioDuration = SetBase & {
  mode: "cardio_duration";
  durationMin: number;
};

export type PlanSetCardioDistance = SetBase & {
  mode: "cardio_distance";
  distanceKm: number;
};

export type PlanSet =
  | PlanSetStrengthReps
  | PlanSetBodyweightReps
  | PlanSetTimedHold
  | PlanSetCardioDuration
  | PlanSetCardioDistance;

// SessionSet variants (recorded during workout)
export interface SessionSetBase extends SetBase {
  planSetId: UUID;
  completed: boolean;
  completedAt?: IsoDateString;
  saveToPlan?: boolean;
}

export type SessionSetStrengthReps = SessionSetBase & {
  mode: "strength_reps";
  reps: number;
  weightKg: number;
};

export type SessionSetBodyweightReps = SessionSetBase & {
  mode: "bodyweight_reps";
  reps: number;
  weightKg?: number;
};

export type SessionSetTimedHold = SessionSetBase & {
  mode: "timed_hold";
  durationSec: number;
  weightKg?: number;
};

export type SessionSetCardioDuration = SessionSetBase & {
  mode: "cardio_duration";
  durationMin: number;
};

export type SessionSetCardioDistance = SessionSetBase & {
  mode: "cardio_distance";
  distanceKm: number;
};

export type SessionSet =
  | SessionSetStrengthReps
  | SessionSetBodyweightReps
  | SessionSetTimedHold
  | SessionSetCardioDuration
  | SessionSetCardioDistance;

// Helper: the correct set union for a given mode
export type PlanSetByMode<M extends ExerciseMode> = Extract<PlanSet, { mode: M }>;
export type SessionSetByMode<M extends ExerciseMode> = Extract<SessionSet, { mode: M }>;
```
