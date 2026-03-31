import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { hydrateExerciseCatalog } from './sync/exerciseCatalog';

void hydrateExerciseCatalog().catch(error => {
    console.error('Failed to hydrate exercise catalog:', error);
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
