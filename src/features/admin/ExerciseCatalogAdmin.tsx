import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    CircleOff,
    LoaderCircle,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldAlert,
} from 'lucide-react';
import { BodyMap } from '../../components/BodyMap/BodyMap';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { useAdminStore } from '../../state/adminStore';
import { useAuthStore } from '../../state/authStore';
import {
    archiveExerciseCatalogEntry,
    listExerciseCatalogEntries,
    saveExerciseCatalogEntry,
    type ExerciseCatalogRow,
} from '../../sync/exerciseCatalog';
import {
    EQUIPMENT_IDS,
    EXERCISE_MODES,
    MUSCLE_IDS,
    type EquipmentId,
    type ExerciseMode,
    type ExerciseTemplate,
    type MuscleId,
} from '../../types/domain';
import styles from './ExerciseCatalogAdmin.module.css';

type DraftExercise = {
    id: string;
    name: string;
    description: string;
    mode: ExerciseMode;
    musclesPrimary: MuscleId[];
    musclesSecondary: MuscleId[];
    equipment: EquipmentId[];
    isActive: boolean;
    sortOrder: number;
    isNew: boolean;
};

function slugifyExerciseName(name: string) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

function createNewDraft(nextSortOrder: number): DraftExercise {
    return {
        id: '',
        name: '',
        description: '',
        mode: 'strength_reps',
        musclesPrimary: [],
        musclesSecondary: [],
        equipment: [],
        isActive: true,
        sortOrder: nextSortOrder,
        isNew: true,
    };
}

function toDraft(row: ExerciseCatalogRow): DraftExercise | null {
    const definition = row.definition as Partial<ExerciseTemplate> | null;
    if (!definition || typeof definition !== 'object' || typeof definition.id !== 'string' || typeof definition.name !== 'string' || typeof definition.mode !== 'string') {
        return null;
    }

    return {
        id: definition.id,
        name: definition.name,
        description: definition.description ?? '',
        mode: definition.mode as ExerciseMode,
        musclesPrimary: (definition.musclesPrimary ?? []) as MuscleId[],
        musclesSecondary: (definition.musclesSecondary ?? []) as MuscleId[],
        equipment: (definition.equipment ?? []) as EquipmentId[],
        isActive: row.is_active,
        sortOrder: row.sort_order,
        isNew: false,
    };
}

function toTemplate(draft: DraftExercise): ExerciseTemplate {
    return {
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        mode: draft.mode,
        musclesPrimary: draft.musclesPrimary,
        musclesSecondary: draft.musclesSecondary,
        equipment: draft.equipment,
        isCustom: false,
    };
}

function toggleItem<T extends string>(list: T[], item: T) {
    return list.includes(item) ? list.filter(value => value !== item) : [...list, item];
}

export function ExerciseCatalogAdmin() {
    const authStatus = useAuthStore(state => state.status);
    const isAdmin = useAdminStore(state => state.isAdmin);
    const isCheckingAdmin = useAdminStore(state => state.isChecking);
    const refreshAdmin = useAdminStore(state => state.refresh);
    const claimInitialAdmin = useAdminStore(state => state.claimInitialAdmin);
    const adminError = useAdminStore(state => state.lastError);

    const [rows, setRows] = useState<ExerciseCatalogRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftExercise | null>(null);
    const [search, setSearch] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const sorted = [...rows].sort((left, right) => {
            if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
            if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
            return left.id.localeCompare(right.id);
        });

        if (!term) return sorted;

        return sorted.filter(row => {
            const definition = row.definition as Partial<ExerciseTemplate>;
            return `${definition.name ?? ''} ${row.id} ${definition.mode ?? ''}`.toLowerCase().includes(term);
        });
    }, [rows, search]);

    const nextSortOrder = useMemo(
        () => rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1,
        [rows],
    );

    const selectFromRows = (loaded: ExerciseCatalogRow[], preferredId?: string | null) => {
        const nextRow = (preferredId ? loaded.find(row => row.id === preferredId) : null)
            ?? loaded.find(row => row.is_active)
            ?? loaded[0]
            ?? null;

        if (!nextRow) {
            setSelectedId('__new__');
            setDraft(createNewDraft(loaded.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1));
            return;
        }

        setSelectedId(nextRow.id);
        setDraft(toDraft(nextRow));
    };

    const loadRows = async (preferredId?: string | null) => {
        setIsLoading(true);
        setError(null);

        try {
            const loaded = await listExerciseCatalogEntries();
            setRows(loaded);
            selectFromRows(loaded, preferredId ?? selectedId);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load the exercise catalog.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (authStatus !== 'authenticated') {
            setIsLoading(false);
            return;
        }

        void refreshAdmin();
    }, [authStatus, refreshAdmin]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !isAdmin) {
            setIsLoading(false);
            return;
        }

        void loadRows(null);
    }, [authStatus, isAdmin]);

    const handleSelect = (row: ExerciseCatalogRow) => {
        setSelectedId(row.id);
        setDraft(toDraft(row));
        setStatusMessage(null);
        setError(null);
    };

    const handleCreateNew = () => {
        setSelectedId('__new__');
        setDraft(createNewDraft(nextSortOrder));
        setStatusMessage(null);
        setError(null);
    };

    const updateDraft = (recipe: (current: DraftExercise) => DraftExercise) => {
        setDraft(current => (current ? recipe(current) : current));
    };

    const handleSave = async () => {
        if (!draft) return;

        const trimmedName = draft.name.trim();
        const nextId = draft.isNew ? slugifyExerciseName(trimmedName) : draft.id;

        if (!trimmedName) {
            setError('Exercise name is required.');
            return;
        }

        if (!nextId) {
            setError('A valid exercise ID could not be generated from the name.');
            return;
        }

        if (draft.isNew && rows.some(row => row.id === nextId)) {
            setError('An exercise with that generated ID already exists. Adjust the name before saving.');
            return;
        }

        setIsSaving(true);
        setError(null);
        setStatusMessage(null);

        try {
            await saveExerciseCatalogEntry({
                id: nextId,
                definition: toTemplate({
                    ...draft,
                    id: nextId,
                }),
                sortOrder: draft.sortOrder,
                isActive: draft.isActive,
            });

            await loadRows(nextId);
            setStatusMessage(draft.isNew ? 'Exercise created.' : 'Exercise updated.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save the exercise.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!draft || draft.isNew) return;

        setIsSaving(true);
        setError(null);
        setStatusMessage(null);

        try {
            await archiveExerciseCatalogEntry(draft.id, !draft.isActive);
            await loadRows(draft.id);
            setStatusMessage(draft.isActive ? 'Exercise archived.' : 'Exercise restored.');
        } catch (archiveError) {
            setError(archiveError instanceof Error ? archiveError.message : 'Failed to update exercise visibility.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authStatus !== 'authenticated') {
        return (
            <div className={styles.page}>
                <PageHeader title="Exercise Admin" backTo="/profile" />
                <div className={styles.emptyState}>
                    <ShieldAlert size={18} />
                    <p>Sign in to open exercise admin tools.</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className={styles.page}>
                <PageHeader title="Exercise Admin" backTo="/profile" />
                <div className={styles.emptyState}>
                    <ShieldAlert size={18} />
                    <p>Admin access is required to edit the shared exercise catalog.</p>
                    {adminError && <p className={styles.errorText}>{adminError}</p>}
                    <div className={styles.emptyActions}>
                        <button className={styles.secondaryBtn} onClick={() => void refreshAdmin()} disabled={isCheckingAdmin}>
                            {isCheckingAdmin ? 'Checking...' : 'Refresh Access'}
                        </button>
                        <button className={styles.primaryBtn} onClick={() => void claimInitialAdmin()} disabled={isCheckingAdmin}>
                            Claim Initial Admin Access
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
                <PageHeader
                title="Exercise Admin"
                backTo="/profile"
                right={(
                    <button className={styles.iconBtn} onClick={() => void loadRows(selectedId)} aria-label="Refresh catalog">
                        <RefreshCw size={16} />
                    </button>
                )}
            />

            <section className={styles.hero}>
                <div>
                    <span className={styles.heroEyebrow}>Shared Catalog</span>
                    <h2 className={styles.heroTitle}>Edit built-in exercises with live Supabase writes</h2>
                    <p className={styles.heroCopy}>
                        Changes here update the shared catalog, then rehydrate the local exercise library for immediate preview.
                    </p>
                </div>
                <button className={styles.primaryBtn} onClick={handleCreateNew}>
                    <Plus size={14} /> New Exercise
                </button>
            </section>

            {(statusMessage || error) && (
                <div className={`${styles.banner} ${error ? styles.bannerError : styles.bannerSuccess}`}>
                    {error ? <AlertCircle size={16} /> : <Check size={16} />}
                    <span>{error ?? statusMessage}</span>
                </div>
            )}

            <div className={styles.layout}>
                <aside className={styles.sidebar}>
                    <div className={styles.searchWrap}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            className={styles.searchInput}
                            placeholder="Search catalog"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            aria-label="Search exercise catalog"
                        />
                    </div>

                    <div className={styles.list}>
                        {isLoading ? (
                            <div className={styles.loadingState}>
                                <LoaderCircle size={16} className={styles.spin} />
                                <span>Loading catalog…</span>
                            </div>
                        ) : filteredRows.length > 0 ? (
                            filteredRows.map(row => {
                                const definition = row.definition as Partial<ExerciseTemplate>;
                                const active = selectedId === row.id;
                                return (
                                    <button
                                        key={row.id}
                                        className={`${styles.listItem} ${active ? styles.listItemActive : ''}`}
                                        onClick={() => handleSelect(row)}
                                    >
                                        <div className={styles.listItemTop}>
                                            <span className={styles.listItemName}>{definition.name ?? row.id}</span>
                                            <span className={`${styles.pill} ${row.is_active ? styles.pillActive : styles.pillMuted}`}>
                                                {row.is_active ? 'Active' : 'Archived'}
                                            </span>
                                        </div>
                                        <div className={styles.listItemMeta}>
                                            <span>{String(definition.mode ?? 'Unknown').replace(/_/g, ' ')}</span>
                                            <span>#{row.sort_order}</span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className={styles.emptyList}>No exercises match your search.</div>
                        )}
                    </div>
                </aside>

                <section className={styles.editor}>
                    {draft ? (
                        <>
                            <div className={styles.previewCard}>
                                <BodyMap size={124} highlightedMuscles={[...draft.musclesPrimary, ...draft.musclesSecondary]} />
                                <div>
                                    <span className={styles.previewEyebrow}>{draft.isNew ? 'New built-in exercise' : draft.id}</span>
                                    <h3 className={styles.previewTitle}>{draft.name || 'Untitled exercise'}</h3>
                                    <p className={styles.previewMeta}>
                                        {draft.mode.replace(/_/g, ' ')} • {draft.isActive ? 'Visible in library' : 'Archived from library'}
                                    </p>
                                </div>
                            </div>

                            <div className={styles.formGrid}>
                                <label className={styles.field}>
                                    <span>Name</span>
                                    <input
                                        className={styles.textInput}
                                        value={draft.name}
                                        onChange={event => updateDraft(current => ({ ...current, name: event.target.value }))}
                                        placeholder="Romanian Deadlift"
                                    />
                                </label>

                                <label className={styles.field}>
                                    <span>Exercise ID</span>
                                    <input
                                        className={styles.textInput}
                                        value={draft.isNew ? slugifyExerciseName(draft.name) : draft.id}
                                        readOnly
                                        aria-readonly="true"
                                    />
                                </label>

                                <label className={styles.field}>
                                    <span>Mode</span>
                                    <select
                                        className={styles.selectInput}
                                        value={draft.mode}
                                        onChange={event => updateDraft(current => ({ ...current, mode: event.target.value as ExerciseMode }))}
                                    >
                                        {EXERCISE_MODES.map(mode => (
                                            <option key={mode} value={mode}>
                                                {mode.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className={styles.field}>
                                    <span>Catalog Order</span>
                                    <input
                                        className={styles.textInput}
                                        type="number"
                                        value={draft.sortOrder}
                                        onChange={event => updateDraft(current => ({ ...current, sortOrder: Number(event.target.value) || 0 }))}
                                    />
                                </label>
                            </div>

                            <label className={styles.field}>
                                <span>Description</span>
                                <textarea
                                    className={styles.textarea}
                                    value={draft.description}
                                    onChange={event => updateDraft(current => ({ ...current, description: event.target.value }))}
                                    placeholder="Optional coaching cue or setup note."
                                />
                            </label>

                            <div className={styles.selectionBlock}>
                                <div className={styles.selectionHeader}>
                                    <h3>Primary Muscles</h3>
                                    <p>These drive the main heatmap and should stay focused.</p>
                                </div>
                                <div className={styles.chips}>
                                    {MUSCLE_IDS.map(muscle => {
                                        const active = draft.musclesPrimary.includes(muscle);
                                        return (
                                            <button
                                                key={muscle}
                                                className={`${styles.chip} ${active ? styles.chipPrimary : ''}`}
                                                onClick={() => updateDraft(current => ({
                                                    ...current,
                                                    musclesPrimary: toggleItem(current.musclesPrimary, muscle),
                                                    musclesSecondary: current.musclesSecondary.filter(item => item !== muscle),
                                                }))}
                                            >
                                                {muscle}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={styles.selectionBlock}>
                                <div className={styles.selectionHeader}>
                                    <h3>Secondary Muscles</h3>
                                    <p>Support muscles can overlap the movement without competing with primary tags.</p>
                                </div>
                                <div className={styles.chips}>
                                    {MUSCLE_IDS.map(muscle => {
                                        const active = draft.musclesSecondary.includes(muscle);
                                        return (
                                            <button
                                                key={muscle}
                                                className={`${styles.chip} ${active ? styles.chipSecondary : ''}`}
                                                onClick={() => updateDraft(current => ({
                                                    ...current,
                                                    musclesSecondary: toggleItem(current.musclesSecondary, muscle),
                                                    musclesPrimary: current.musclesPrimary.filter(item => item !== muscle),
                                                }))}
                                            >
                                                {muscle}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={styles.selectionBlock}>
                                <div className={styles.selectionHeader}>
                                    <h3>Equipment</h3>
                                    <p>Keep this lightweight so the library can still be scanned quickly.</p>
                                </div>
                                <div className={styles.chips}>
                                    {EQUIPMENT_IDS.map(equipment => {
                                        const active = draft.equipment.includes(equipment);
                                        return (
                                            <button
                                                key={equipment}
                                                className={`${styles.chip} ${active ? styles.chipEquipment : ''}`}
                                                onClick={() => updateDraft(current => ({
                                                    ...current,
                                                    equipment: toggleItem(current.equipment, equipment),
                                                }))}
                                            >
                                                {equipment}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={styles.footerBar}>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={() => updateDraft(current => ({ ...current, isActive: !current.isActive }))}
                                >
                                    <CircleOff size={14} />
                                    {draft.isActive ? 'Mark Archived' : 'Mark Active'}
                                </button>
                                {!draft.isNew && (
                                    <button className={styles.secondaryBtn} onClick={() => void handleArchiveToggle()} disabled={isSaving}>
                                        <CircleOff size={14} />
                                        {draft.isActive ? 'Archive in Catalog' : 'Restore to Catalog'}
                                    </button>
                                )}
                                <button className={styles.primaryBtn} onClick={() => void handleSave()} disabled={isSaving}>
                                    {isSaving ? <LoaderCircle size={14} className={styles.spin} /> : <Save size={14} />}
                                    {isSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyEditor}>Choose an exercise or create a new one.</div>
                    )}
                </section>
            </div>
        </div>
    );
}
