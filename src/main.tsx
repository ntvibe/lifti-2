import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { seedExercises } from './db/seed';

void seedExercises().catch(error => {
    console.error('Failed to seed exercises:', error);
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
