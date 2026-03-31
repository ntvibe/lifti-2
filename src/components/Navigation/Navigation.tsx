import { NavLink } from 'react-router-dom';
import { Home, BarChart3, Dumbbell, UserRound } from 'lucide-react';
import styles from './Navigation.module.css';

export function Navigation() {
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `${styles.link} ${isActive ? styles.active : ''}`;

    return (
        <nav className={styles.nav} aria-label="Primary">
            <NavLink to="/" className={linkClass} end>
                <Home className={styles.icon} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/library" className={linkClass}>
                <Dumbbell className={styles.icon} />
                <span>Library</span>
            </NavLink>
            <NavLink to="/history" className={linkClass}>
                <BarChart3 className={styles.icon} />
                <span>History</span>
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
                <UserRound className={styles.icon} />
                <span>Profile</span>
            </NavLink>
        </nav>
    );
}
