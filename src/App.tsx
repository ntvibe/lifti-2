import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import './App.css';
import { Navigation } from './components/Navigation/Navigation';
import { useAuthStore } from './state/authStore';
import { useAdminStore } from './state/adminStore';
import { useSyncStore } from './state/syncStore';

const PlansHome = lazy(async () => {
    const module = await import('./features/plans/PlansHome/PlansHome');
    return { default: module.PlansHome };
});

const PlanEditor = lazy(async () => {
    const module = await import('./features/plans/PlanEditor/PlanEditor');
    return { default: module.PlanEditor };
});

const ExerciseSetEditor = lazy(async () => {
    const module = await import('./features/plans/ExerciseSetEditor/ExerciseSetEditor');
    return { default: module.ExerciseSetEditor };
});

const PlanExercisePicker = lazy(async () => {
    const module = await import('./features/plans/PlanExercisePicker/PlanExercisePicker');
    return { default: module.PlanExercisePicker };
});

const PlanExerciseDetail = lazy(async () => {
    const module = await import('./features/plans/PlanExerciseDetail/PlanExerciseDetail');
    return { default: module.PlanExerciseDetail };
});

const WorkoutSession = lazy(async () => {
    const module = await import('./features/workout/WorkoutSession');
    return { default: module.WorkoutSession };
});

const HistoryView = lazy(async () => {
    const module = await import('./features/history/HistoryView');
    return { default: module.HistoryView };
});

const ExerciseLibrary = lazy(async () => {
    const module = await import('./features/exercises/ExerciseLibrary');
    return { default: module.ExerciseLibrary };
});

const AIImport = lazy(async () => {
    const module = await import('./features/exercises/AIImport');
    return { default: module.AIImport };
});

const ProfileView = lazy(async () => {
    const module = await import('./features/profile/ProfileView');
    return { default: module.ProfileView };
});

const ExerciseCatalogAdmin = lazy(async () => {
    const module = await import('./features/admin/ExerciseCatalogAdmin');
    return { default: module.ExerciseCatalogAdmin };
});

function RouteLoadingFallback() {
    return (
        <div className="route-loading" aria-live="polite">
            Loading...
        </div>
    );
}

function LegacyWorkoutRedirect() {
    const { planId } = useParams<{ planId: string }>();
    return <Navigate to={planId ? `/session/${planId}` : '/'} replace />;
}

function AppLayout() {
    const location = useLocation();
    const isImmersiveRoute =
        /^\/session\/[^/]+$/u.test(location.pathname)
        || /^\/workout\/[^/]+$/u.test(location.pathname)
        || /^\/plan\/[^/]+\/exercise\/[^/]+$/u.test(location.pathname);
    const mainClassName = `app-main ${isImmersiveRoute ? 'app-main-immersive' : ''}`;

    return (
        <div className="app-shell">
            <div className="app-bg" />
            <div className="app-content">
                <main className={mainClassName}>
                    <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                            <Route path="/" element={<PlansHome />} />
                            <Route path="/plan/:id" element={<PlanEditor />} />
                            <Route path="/plan/:id/add-exercise" element={<PlanExercisePicker />} />
                            <Route path="/plan/:id/add-exercise/:templateId" element={<PlanExerciseDetail />} />
                            <Route path="/plan/:planId/exercise/:exerciseIndex" element={<ExerciseSetEditor />} />
                            <Route path="/session/:planId" element={<WorkoutSession />} />
                            <Route path="/history" element={<HistoryView />} />
                            <Route path="/library" element={<ExerciseLibrary />} />
                            <Route path="/library/import" element={<AIImport />} />
                            <Route path="/admin/exercises" element={<ExerciseCatalogAdmin />} />
                            <Route path="/profile" element={<ProfileView />} />
                            <Route path="/workout/:planId" element={<LegacyWorkoutRedirect />} />
                            <Route path="/exercises/import" element={<Navigate to="/library/import" replace />} />
                            <Route path="/exercises" element={<Navigate to="/library" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </main>
            </div>
            {!isImmersiveRoute && <Navigation />}
        </div>
    );
}

export default function App() {
    const hydrateSession = useAuthStore(state => state.hydrateSession);
    const refreshAdmin = useAdminStore(state => state.refresh);
    const resetAdmin = useAdminStore(state => state.reset);
    const initializeSync = useSyncStore(state => state.initialize);
    const refreshPendingOps = useSyncStore(state => state.refreshPendingOps);
    const syncNow = useSyncStore(state => state.syncNow);
    const authStatus = useAuthStore(state => state.status);

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            try {
                await initializeSync();
                await hydrateSession();
                if (useAuthStore.getState().status === 'authenticated') {
                    await refreshAdmin();
                    await syncNow();
                } else {
                    resetAdmin();
                    await refreshPendingOps();
                }
            } catch (error) {
                if (cancelled) return;
                useSyncStore.setState(state => ({
                    ...state,
                    status: 'error',
                    lastError: error instanceof Error ? error.message : 'Failed to initialize app state.',
                }));
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [hydrateSession, initializeSync, refreshAdmin, refreshPendingOps, resetAdmin, syncNow]);

    useEffect(() => {
        if (authStatus !== 'authenticated') return;
        const timer = window.setInterval(() => {
            void refreshPendingOps();
        }, 4000);
        return () => window.clearInterval(timer);
    }, [authStatus, refreshPendingOps]);

    useEffect(() => {
        if (authStatus === 'authenticated') {
            void refreshAdmin();
            return;
        }

        resetAdmin();
    }, [authStatus, refreshAdmin, resetAdmin]);

    // GitHub Pages serves apps from a subpath and does not support SPA history fallback.
    // Use hash routing for non-root builds so refresh/deep links remain stable.
    if (import.meta.env.BASE_URL !== '/') {
        return (
            <HashRouter>
                <AppLayout />
            </HashRouter>
        );
    }

    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AppLayout />
        </BrowserRouter>
    );
}
