// Column templates of the Konten tables. They live outside the view so the route-level skeleton can line its columns
// up without pulling in the view's chunk. Header and rows of each table must use the same template.

// Abgleich: Datum, Konto, Gegenpartei / Zweck, Betrag, Status, action.
export const ABGLEICH_COLUMNS = '7.5rem minmax(0, 0.9fr) minmax(0, 2fr) minmax(0, 1fr) 7.5rem 7.5rem';

// Account tab: Datum, Gegenpartei / Zweck, Betrag, Status, action. The trailing status and action columns are
// fixed-width so the pills and buttons line up down the list regardless of row content.
export const ACCOUNT_TX_COLUMNS = '7.5rem minmax(0, 2fr) minmax(0, 1fr) 7.5rem 7.5rem';

// Importe: Datum, Konto, Datei, Importiert, Duplikate, Zugeordnet, Status, delete. The rows keep a minimum width;
// narrower screens scroll the table horizontally.
export const IMPORT_COLUMNS = '104px minmax(130px,.8fr) minmax(200px,1.6fr) 96px 96px 120px 130px 34px';
