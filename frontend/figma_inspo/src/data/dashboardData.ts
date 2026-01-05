export interface DashboardData {
  ausgaben: number;
  einnahmen: number;
  unterschied: number;
  chartData: ChartDataPoint[];
  offeneAufgaben: TaskItem[];
  notizen: NoteItem[];
}

export interface ChartDataPoint {
  month: string;
  ausgaben: number;
  einnahmen: number;
}

export interface TaskItem {
  label: string;
  count: number;
}

export interface NoteItem {
  label: string;
  date: string;
}

export const dashboardData: DashboardData = {
  ausgaben: 2893,
  einnahmen: 3893,
  unterschied: 1000,
  chartData: [
    { month: 'Jan', ausgaben: 7000, einnahmen: 6500 },
    { month: 'Feb', ausgaben: 10000, einnahmen: 8000 },
    { month: 'Mär', ausgaben: 6500, einnahmen: 15000 },
    { month: 'Apr', ausgaben: 8000, einnahmen: 12000 },
    { month: 'Mai', ausgaben: 6000, einnahmen: 16000 },
    { month: 'Jun', ausgaben: 6500, einnahmen: 14000 },
    { month: 'Jul', ausgaben: 5000, einnahmen: 12000 },
    { month: 'Aug', ausgaben: 0, einnahmen: 0 },
  ],
  offeneAufgaben: [
    { label: 'Unfertige Belege', count: 3 },
    { label: 'Fehlende Informationen', count: 1 },
    { label: 'Offene Rechnungen', count: 3 },
    { label: 'Fehlende Kategorien', count: 4 },
    { label: 'Unfertige Belege', count: 1 },
  ],
  notizen: [
    { label: 'Steuererklärung', date: '31.09.2026' },
    { label: 'Letzter Tag', date: '17.08.2026' },
  ],
};
