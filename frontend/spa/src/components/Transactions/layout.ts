// Layout constants shared by the transactions table and the placeholders that stand in for it while
// it loads. They live outside the view so the route-level skeleton can line its columns up without
// pulling in the view's chunk.

export const FONT = '"Hanken Grotesk", "Reddit Sans", sans-serif';

// Shared column layout for the transactions table header and rows (must stay in sync).
// Transaktion | Bommel | Datum | Erstellt am | Status | Betrag
export const TX_GRID = '40px minmax(0,2fr) 1fr 1fr 0.95fr 1fr 0.85fr 1fr';

// Below this width seven columns leave the Bommel name too little room to be readable, so the column
// is dropped entirely rather than squeezed. Header and rows both read this, so they stay in step.
export const TX_GRID_NARROW = '40px minmax(0,2fr) 1fr 0.95fr 1fr 0.85fr 1fr';

export const HIDE_BOMMEL_QUERY = '(max-width: 1023px)';
