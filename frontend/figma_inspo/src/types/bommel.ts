export interface Bommel {
  id: string;
  name: string;
  parentId: string | null;
  einnahmen: number;
  ausgaben: number;
  anzahlBelege: number;
  unpaidInvoices: number;
  anzahlEntwuerfe: number;
  children?: Bommel[];
}

export interface BommelStats {
  totalBommels: number;
  subBommels: number;
}
