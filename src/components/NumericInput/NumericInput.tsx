import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete } from 'lucide-react';
import styles from './NumericInput.module.css';

const LONG_PRESS_MS = 250;
const TAP_MOVE_THRESHOLD_PX = 8;
const SCRUB_PIXELS_PER_STEP = 12;
const OVERLAY_EXIT_MS = 120;

function clamp(value: number, min = 0, max?: number): number {
    if (max === undefined) return Math.max(min, value);
    return Math.min(max, Math.max(min, value));
}

function getPrecision(step: number): number {
    const text = step.toString();
    if (!text.includes('.')) return 0;
    return text.split('.')[1]?.length ?? 0;
}

function roundToPrecision(value: number, precision: number): number {
    if (precision <= 0) return Math.round(value);
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}

function formatNumber(value: number, precision: number): string {
    const rounded = roundToPrecision(value, precision);
    if (precision <= 0) return `${rounded}`;
    return rounded.toFixed(precision).replace(/\.?0+$/, '');
}

interface ScrubbableNumberFieldProps {
    value: number;
    onChange: (v: number) => void;
    onCommit?: (v: number) => void;
    step: number;
    min?: number;
    max?: number;
    format: (v: number) => string;
    renderValue: (v: number) => ReactNode;
    openCalculator: () => void;
    label?: string;
}

type PressState = {
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    moved: boolean;
    startValue: number;
    lastStepOffset: number;
};

export function ScrubbableNumberField({
    value,
    onChange,
    onCommit,
    step,
    min = 0,
    max,
    format,
    renderValue,
    openCalculator,
    label = 'Value',
}: ScrubbableNumberFieldProps) {
    const fieldRef = useRef<HTMLButtonElement | null>(null);
    const holdTimerRef = useRef<number | null>(null);
    const overlayTimerRef = useRef<number | null>(null);
    const pressRef = useRef<PressState | null>(null);
    const isScrubbingRef = useRef(false);
    const displayedValueRef = useRef(value);

    const [displayedValue, setDisplayedValue] = useState(value);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [overlayActive, setOverlayActive] = useState(false);
    const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

    const precision = useMemo(() => getPrecision(step), [step]);

    const normaliseValue = useCallback((next: number) => {
        const clamped = clamp(next, min, max);
        return roundToPrecision(clamped, precision);
    }, [max, min, precision]);

    useEffect(() => {
        if (isScrubbingRef.current) return;
        displayedValueRef.current = value;
        setDisplayedValue(value);
    }, [value]);

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const clearOverlayTimer = useCallback(() => {
        if (overlayTimerRef.current) {
            window.clearTimeout(overlayTimerRef.current);
            overlayTimerRef.current = null;
        }
    }, []);

    const stopOverlay = useCallback(() => {
        clearOverlayTimer();
        setOverlayActive(false);
        overlayTimerRef.current = window.setTimeout(() => {
            setOverlayVisible(false);
            setOverlayRect(null);
        }, OVERLAY_EXIT_MS);
    }, [clearOverlayTimer]);

    const releasePointer = useCallback((pointerId: number) => {
        const node = fieldRef.current;
        if (!node) return;
        try {
            if (node.hasPointerCapture(pointerId)) node.releasePointerCapture(pointerId);
        } catch {
            // Pointer capture can already be released by the browser.
        }
    }, []);

    const commitValue = useCallback((next: number) => {
        const normalized = normaliseValue(next);
        if (normalized === displayedValueRef.current) return normalized;
        displayedValueRef.current = normalized;
        setDisplayedValue(normalized);
        onChange(normalized);
        return normalized;
    }, [normaliseValue, onChange]);

    const activateScrubber = useCallback(() => {
        const press = pressRef.current;
        if (!press || press.moved) return;
        const node = fieldRef.current;
        if (!node) return;

        isScrubbingRef.current = true;
        setIsScrubbing(true);
        setOverlayRect(node.getBoundingClientRect());
        setOverlayVisible(true);
        requestAnimationFrame(() => setOverlayActive(true));

        try {
            node.setPointerCapture(press.pointerId);
        } catch {
            // Some browsers throw if capture is unavailable.
        }

        if (navigator.vibrate) navigator.vibrate(10);
    }, []);

    const endScrubber = useCallback((commit: boolean) => {
        if (!isScrubbingRef.current) return;
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        stopOverlay();
        if (commit) onCommit?.(displayedValueRef.current);
    }, [onCommit, stopOverlay]);

    useEffect(() => () => {
        clearHoldTimer();
        clearOverlayTimer();
    }, [clearHoldTimer, clearOverlayTimer]);

    useEffect(() => {
        if (!isScrubbing) return;

        const { body, documentElement } = document;
        const prevBodyOverflow = body.style.overflow;
        const prevHtmlOverflow = documentElement.style.overflow;
        const prevBodyTouchAction = body.style.touchAction;
        const prevHtmlTouchAction = documentElement.style.touchAction;

        const preventGlobalScroll = (event: Event) => {
            if (event.cancelable) event.preventDefault();
        };

        body.style.overflow = 'hidden';
        documentElement.style.overflow = 'hidden';
        body.style.touchAction = 'none';
        documentElement.style.touchAction = 'none';

        window.addEventListener('wheel', preventGlobalScroll, { passive: false });
        window.addEventListener('touchmove', preventGlobalScroll, { passive: false });

        return () => {
            window.removeEventListener('wheel', preventGlobalScroll);
            window.removeEventListener('touchmove', preventGlobalScroll);
            body.style.overflow = prevBodyOverflow;
            documentElement.style.overflow = prevHtmlOverflow;
            body.style.touchAction = prevBodyTouchAction;
            documentElement.style.touchAction = prevHtmlTouchAction;
        };
    }, [isScrubbing]);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!e.isPrimary || e.button !== 0) return;

        clearHoldTimer();
        pressRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startedAt: performance.now(),
            moved: false,
            startValue: normaliseValue(displayedValueRef.current),
            lastStepOffset: 0,
        };

        holdTimerRef.current = window.setTimeout(activateScrubber, LONG_PRESS_MS);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const press = pressRef.current;
        if (!press || press.pointerId !== e.pointerId) return;

        if (!isScrubbingRef.current) {
            const distance = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
            if (distance > TAP_MOVE_THRESHOLD_PX) {
                press.moved = true;
                clearHoldTimer();
            }
            return;
        }

        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const stepOffset = Math.trunc((press.startY - e.clientY) / SCRUB_PIXELS_PER_STEP);
        if (stepOffset === press.lastStepOffset) return;

        press.lastStepOffset = stepOffset;
        const nextValue = press.startValue + stepOffset * step;
        const previousValue = displayedValueRef.current;
        const changedValue = commitValue(nextValue);

        if (changedValue !== previousValue && navigator.vibrate) {
            navigator.vibrate(6);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        const press = pressRef.current;
        if (!press || press.pointerId !== e.pointerId) return;
        clearHoldTimer();

        if (isScrubbingRef.current) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            endScrubber(true);
        } else {
            const duration = performance.now() - press.startedAt;
            const distance = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
            const isTap = duration < LONG_PRESS_MS && !press.moved && distance <= TAP_MOVE_THRESHOLD_PX;
            if (isTap) openCalculator();
        }

        releasePointer(e.pointerId);
        pressRef.current = null;
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
        const press = pressRef.current;
        if (!press || press.pointerId !== e.pointerId) return;
        clearHoldTimer();
        endScrubber(true);
        releasePointer(e.pointerId);
        pressRef.current = null;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCalculator();
        }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
    };

    const nextUp = normaliseValue(displayedValue + step);
    const nextDown = normaliseValue(displayedValue - step);

    return (
        <>
            <div className={styles.stepper}>
                <button
                    ref={fieldRef}
                    type="button"
                    className={`${styles.displayButton} ${isScrubbing ? styles.displayButtonScrubbing : ''}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onKeyDown={handleKeyDown}
                    onContextMenu={handleContextMenu}
                    aria-label={label}
                >
                    {renderValue(displayedValue)}
                </button>
            </div>
            {overlayVisible && overlayRect && createPortal(
                <div
                    className={`${styles.scrubHud} ${overlayActive ? styles.scrubHudActive : ''}`}
                    style={{
                        top: overlayRect.top,
                        left: overlayRect.left,
                        width: overlayRect.width,
                        height: overlayRect.height,
                    }}
                    aria-hidden
                >
                    <div className={`${styles.scrubPreview} ${styles.scrubPreviewUp}`}>+ {format(nextUp)}</div>
                    <div className={styles.scrubCurrent}>{format(displayedValue)}</div>
                    <div className={`${styles.scrubPreview} ${styles.scrubPreviewDown}`}>- {format(nextDown)}</div>
                </div>,
                document.body,
            )}
        </>
    );
}

interface NumericInputProps {
    value: number;
    onChange: (v: number) => void;
    onCommit?: (v: number) => void;
    label?: string;
    unit?: string;
    step?: number;
    min?: number;
    max?: number;
    format?: (v: number) => string;
}

export function NumericInput({
    value,
    onChange,
    onCommit,
    label = '',
    unit,
    step = 1,
    min = 0,
    max,
    format,
}: NumericInputProps) {
    const [keypadOpen, setKeypadOpen] = useState(false);
    const precision = useMemo(() => getPrecision(step), [step]);

    const formatValue = useCallback((next: number) => {
        if (format) return format(next);
        const base = formatNumber(next, precision);
        return unit ? `${base} ${unit}` : base;
    }, [format, precision, unit]);

    const renderDisplayValue = useCallback((next: number): ReactNode => {
        if (format) return format(next);
        const base = formatNumber(next, precision);
        return (
            <>
                <span className={styles.displayNumber}>{base}</span>
                {unit && <span className={styles.displayUnit}>{unit}</span>}
            </>
        );
    }, [format, precision, unit]);

    return (
        <>
            <ScrubbableNumberField
                value={value}
                onChange={onChange}
                onCommit={onCommit}
                step={step}
                min={min}
                max={max}
                format={formatValue}
                renderValue={renderDisplayValue}
                openCalculator={() => setKeypadOpen(true)}
                label={label}
            />
            {keypadOpen && createPortal(
                <NumberKeypad
                    value={value}
                    label={label}
                    unit={unit}
                    step={step}
                    min={min}
                    max={max}
                    onConfirm={(v) => {
                        onChange(v);
                        onCommit?.(v);
                        setKeypadOpen(false);
                    }}
                    onClose={() => setKeypadOpen(false)}
                />,
                document.body,
            )}
        </>
    );
}

// ── Keypad Bottom Sheet ──

interface KeypadProps {
    value: number;
    label: string;
    unit?: string;
    step: number;
    min: number;
    max?: number;
    onConfirm: (v: number) => void;
    onClose: () => void;
}

function NumberKeypad({ value, label, unit, step, min, max, onConfirm, onClose }: KeypadProps) {
    const precision = useMemo(() => getPrecision(step), [step]);
    const normalise = useCallback((next: number) => {
        const clamped = clamp(next, min, max);
        return roundToPrecision(clamped, precision);
    }, [max, min, precision]);
    const [buf, setBuf] = useState(() => formatNumber(normalise(value), precision));

    const digit = useCallback((d: string) => {
        setBuf(prev => {
            if (d === '.' && prev.includes('.')) return prev;
            if (prev === '0' && d !== '.') return d;
            return prev + d;
        });
    }, []);

    const del = useCallback(() => {
        setBuf(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    }, []);

    const preset = useCallback((delta: number) => {
        setBuf(prev => {
            const next = normalise(parseFloat(prev || '0') + delta);
            return formatNumber(next, precision);
        });
    }, [normalise, precision]);

    const presets = step < 1
        ? [-step * 2, -step, step, step * 2]
        : [-step * 5, -step, step, step * 5];

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.sheet}>
                <div className={styles.sheetHeader}>
                    <span className={styles.sheetTitle}>{label}</span>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>

                <div className={styles.sheetValue}>
                    <span className={styles.sheetNum}>{buf}</span>
                    {unit && <span className={styles.sheetUnit}>{unit}</span>}
                </div>

                <div className={styles.grid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(d => (
                        <button key={d} className={styles.key} onClick={() => digit(d.toString())}>
                            {d}
                        </button>
                    ))}
                    <button className={styles.key} onClick={del}><Delete size={20} /></button>
                </div>

                <div className={styles.presets}>
                    {presets.map(p => (
                        <button key={p} className={styles.preset} onClick={() => preset(p)}>
                            {p > 0 ? `+${p}` : p}
                        </button>
                    ))}
                </div>

                <button className={styles.doneBtn} onClick={() => onConfirm(normalise(parseFloat(buf) || 0))}>
                    Done
                </button>
            </div>
        </>
    );
}
