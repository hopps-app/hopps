// Layout constants shared by the transactions table and the placeholders that stand in for it while
// it loads. They live outside the view so the route-level skeleton can line its columns up without
// pulling in the view's chunk.

export const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

// Shared column layout for the transactions table header and rows (must stay in sync).
// Checkbox | Transaktion | Kategorie | Bommel | Datum | Erstellt am | Status | Betrag
export const TX_GRID = '20px minmax(0,2.3fr) 1.3fr 1.2fr 0.9fr 0.9fr 1fr 1.1fr';

// Below this width eight columns leave the Bommel name too little room to be readable, so the column
// is dropped entirely rather than squeezed. Header and rows both read this, so they stay in step.
export const TX_GRID_NARROW = '20px minmax(0,2.3fr) 1.3fr 0.9fr 0.9fr 1fr 1.1fr';

// Gap between the table columns; with the 20px padding of header and rows it replaces the per-cell right padding.
export const TX_GRID_GAP = 16;

export const HIDE_BOMMEL_QUERY = '(max-width: 1023px)';
