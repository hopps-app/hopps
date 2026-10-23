// Layout constants shared by the NGO details page and the placeholders that stand in for it while it loads. They live
// outside the view so the route-level skeleton can match the cards without pulling in the view's chunk.

/** In dark mode the drop shadow is invisible, so a hairline ring separates the card from the page instead. */
export const CARD =
    'rounded-[18px] bg-white shadow-[0_1px_2px_rgba(20,20,40,0.05),0_6px_22px_rgba(20,20,40,0.05)] ' +
    'dark:bg-[#1C1C21] dark:shadow-none dark:ring-1 dark:ring-[#2E2E36]';
