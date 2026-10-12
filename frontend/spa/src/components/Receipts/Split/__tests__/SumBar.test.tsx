import { describe, expect, it, vi } from 'vitest';

import { SumBar } from '../SumBar';

import { fireEvent, renderWithProviders, screen } from '@/test/test-utils';

const segments = [
    { key: 'a', value: 500, color: 'red', title: 'Bier: 500,00 €' },
    { key: 'b', value: 200, color: 'blue', title: 'Pfand: 200,00 €' },
    { key: 'c', value: 0, color: 'green', title: 'Leer: 0,00 €' },
];

describe('SumBar', () => {
    it('shows the assigned amount, the total and the message', () => {
        renderWithProviders(<SumBar value="700,00 €" total="von 700,00 €" ok message="Summe passt" segments={segments} />);

        expect(screen.getByText('700,00 €')).toBeInTheDocument();
        expect(screen.getByText('von 700,00 €')).toBeInTheDocument();
        expect(screen.getByText('Summe passt')).toBeInTheDocument();
    });

    it('sizes the segments by their share and skips empty ones', () => {
        renderWithProviders(<SumBar value="" total="" ok={false} message="" segments={segments} />);

        const bier = screen.getByTitle('Bier: 500,00 €');
        const pfand = screen.getByTitle('Pfand: 200,00 €');
        expect(bier.style.width).toBe(`${(500 / 700) * 100}%`);
        expect(pfand.style.width).toBe(`${(200 / 700) * 100}%`);
        expect(screen.queryByTitle('Leer: 0,00 €')).not.toBeInTheDocument();
    });

    it('selects a part when a segment is clicked and dims the others', () => {
        const onSelect = vi.fn();
        renderWithProviders(<SumBar value="" total="" ok={false} message="" segments={segments} activeKey="a" onSelect={onSelect} />);

        fireEvent.click(screen.getByTitle('Pfand: 200,00 €'));
        expect(onSelect).toHaveBeenCalledWith('b');
        expect(screen.getByTitle('Bier: 500,00 €').style.opacity).toBe('1');
        expect(screen.getByTitle('Pfand: 200,00 €').style.opacity).toBe('0.45');
    });

    it('renders the footer note when given', () => {
        renderWithProviders(<SumBar value="" total="" ok={false} message="" segments={[]} footer={<span>120,00 € nicht gebucht</span>} />);

        expect(screen.getByText('120,00 € nicht gebucht')).toBeInTheDocument();
    });
});
