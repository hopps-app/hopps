// Layout constants shared by the receipts table and the placeholders that stand in for it while it loads. They live
// outside the view so the route-level skeleton can line its columns up without pulling in the view's chunk.

// Shared column layout for the documents table header and rows (must stay in sync), same order as the transactions
// table. Checkbox | Beleg | Bommel | Datum | Erstellt am | Status | Betrag
export const DOC_GRID = '20px minmax(0,2.3fr) 1.2fr 0.9fr 0.9fr 1.1fr 1.1fr';
// Narrow screens drop the Bommel column, like the transactions table.
export const DOC_GRID_NARROW = '20px minmax(0,2.3fr) 0.9fr 0.9fr 1.1fr 1.1fr';
