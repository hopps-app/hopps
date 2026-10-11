// Colours of the reconciliation progress bar segments, one per link in link order, repeated on the link's icon tile.
// Purely visual: they only tell neighbouring segments apart and carry no meaning. Shared by the Kontoumsatz drawer and
// the Zahlungsabgleich section so both read the same.
const SEGMENT_COLORS = ['#9955CC', '#3E9C8C', '#E0A33A', '#4F7FD1', '#D16A9B', '#7E8A3A'];

export const segmentColor = (i: number) => SEGMENT_COLORS[i % SEGMENT_COLORS.length];

// Light tint of a segment colour, for the background of an icon tile.
export const segmentTint = (color: string) => `color-mix(in oklab, ${color} 16%, transparent)`;
