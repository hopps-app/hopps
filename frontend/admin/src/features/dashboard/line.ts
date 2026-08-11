/**
 * Shared geometry for the overview's line charts, so the two sit at the same scale and read as one
 * family rather than two hand-rolled SVGs that drifted apart.
 *
 * The charts draw into a unitless square viewBox that is then stretched to fill its container. That
 * keeps the maths free of pixel measurement — but it also means strokes get smeared with the
 * stretch, so every path must set `vector-effect="non-scaling-stroke"`.
 */

/**
 * The overview's two rows split the viewport one third / two thirds: the Kennzahlen cards on top, the
 * charts below.
 *
 * Sized against the viewport *height*, not width — what is being fought over is whether the page fits
 * on screen without scrolling, and a wide monitor is not necessarily a tall one. `210px` is the fixed
 * furniture both rows sit inside: page heading, layout padding and the gap between the rows. Both are
 * clamped, so the cards never collapse and a very tall monitor does not turn the charts into
 * billboards.
 *
 * Underscores are Tailwind's escape for the spaces CSS `calc` requires around `+` and `-`. Both spell
 * out `100vh - 210px` rather than sharing a constant, because Tailwind's scanner reads this file as
 * raw text — an interpolated class name would never reach the stylesheet. Keep the two in step by
 * hand.
 */

/** Height of the Kennzahlen row — one third of what is left after the page furniture. */
export const CARD_HEIGHT = 'h-[clamp(130px,calc((100vh_-_210px)/3),280px)]';

/**
 * Plot height shared by every overview chart. Two thirds of the available height, less the card's own
 * chrome (eyebrow, title, subtitle, axis labels) which sits outside the plot itself.
 */
export const PLOT_HEIGHT = 'h-[clamp(170px,calc((100vh_-_210px)*2/3_-_110px),520px)]';

/** Edge length of the square viewBox everything is drawn into. */
export const VIEW = 100;

/** Breathing room top and bottom, so a peak and a zero line are not flush against the edge. */
export const PAD = 3;

/** Where a value sits vertically in the viewBox, as a fraction of its height. */
export function yFor(value: number, peak: number): number {
    return VIEW - PAD - (value / Math.max(1, peak)) * (VIEW - PAD * 2);
}

/**
 * Turns a series into an SVG `points` string, scaled against `peak` and spread evenly across the
 * full width. A single point is centred rather than pinned to the left edge, where it would look
 * like the start of a line that failed to render.
 */
export function buildPoints(values: number[], peak: number): string {
    const count = values.length;
    const scale = Math.max(1, peak);

    return values
        .map((value, i) => {
            const x = count <= 1 ? VIEW / 2 : (i / (count - 1)) * VIEW;
            const y = VIEW - PAD - (value / scale) * (VIEW - PAD * 2);
            return `${x},${y}`;
        })
        .join(' ');
}

/**
 * The same series closed down to the baseline, for the tint under a line. Drawn as a polygon rather
 * than a stroked path, so it carries no outline of its own and sits cleanly beneath the line.
 */
export function buildAreaPoints(values: number[], peak: number): string {
    return `0,${VIEW} ${buildPoints(values, peak)} ${VIEW},${VIEW}`;
}

/**
 * Which points along an axis of `count` entries should carry a label, anchored to the last one and
 * spaced backwards. Anchoring at the end guarantees the most recent point is always labelled and
 * that no label ever collides with it — which spacing forwards from index 0 cannot promise.
 */
export function isLabelled(index: number, count: number, maxLabels = 6): boolean {
    const every = Math.max(1, Math.ceil(count / maxLabels));
    return (count - 1 - index) % every === 0;
}
