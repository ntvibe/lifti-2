import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import styles from './PageHeader.module.css';

interface Props {
    title?: string;
    editableTitle?: { value: string; onChange: (v: string) => void };
    showBack?: boolean;
    right?: ReactNode;
}

export function PageHeader({ title, editableTitle, showBack = true, right }: Props) {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            {showBack && (
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} />
                </button>
            )}
            {editableTitle ? (
                <input
                    className={styles.titleInput}
                    value={editableTitle.value}
                    onChange={e => editableTitle.onChange(e.target.value)}
                />
            ) : (
                <h1 className={styles.title}>{title}</h1>
            )}
            {right && <div className={styles.right}>{right}</div>}
        </header>
    );
}
