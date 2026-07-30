import { useEffect, useRef } from 'react';

import apiService from '@/services/ApiService';

/** How often presence is reported while the member is actually using the application. */
const INTERVAL_MS = 60_000;

/** No mouse or keyboard for this long counts as away, even with the tab still in the foreground. */
const IDLE_AFTER_MS = 3 * 60_000;

/**
 * Listened to with `capture: true` so interaction inside scroll containers is seen too — `scroll`
 * does not bubble, and the app scrolls an inner element rather than the window.
 */
const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Reports that the member is present, feeding the time-in-application figure on the admin activity
 * chart.
 *
 * This exists because ordinary API traffic cannot measure attention in a single-page app: typing
 * into a form or reading a document produces no backend calls at all, so without a heartbeat a
 * member who spends forty minutes entering a Beleg is indistinguishable from one who walked away.
 * The client is the only party that can tell those apart.
 *
 * It deliberately stays quiet when the member is not really there — tab in the background, or no
 * interaction for {@link IDLE_AFTER_MS} — so a forgotten open tab logs nothing. The backend adds the
 * real time between beats rather than a fixed amount per beat, so changing {@link INTERVAL_MS} does
 * not change the totals, and it is safe to call more often than needed.
 */
export function useActivityHeartbeat() {
    const lastInputAt = useRef(Date.now());

    useEffect(() => {
        const markInput = () => {
            lastInputAt.current = Date.now();
        };
        INPUT_EVENTS.forEach((event) => window.addEventListener(event, markInput, { passive: true, capture: true }));

        const beat = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            if (Date.now() - lastInputAt.current > IDLE_AFTER_MS) {
                return;
            }
            // Swallowed on purpose: this is telemetry, and a failed beat (an expired token mid-refresh,
            // say) must never surface to someone doing their bookkeeping.
            apiService.orgService.heartbeat().catch(() => {});
        };

        // Beat right away so a visit shorter than one interval still registers, and again whenever the
        // tab returns to the foreground. Firing on the hidden transition too is harmless — the
        // visibility guard turns it into a no-op.
        beat();
        const timer = window.setInterval(beat, INTERVAL_MS);
        document.addEventListener('visibilitychange', beat);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', beat);
            INPUT_EVENTS.forEach((event) => window.removeEventListener(event, markInput, { capture: true }));
        };
    }, []);
}
