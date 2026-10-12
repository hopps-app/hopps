import { describe, expect, it, vi } from 'vitest';

import { SplitPartRow } from '../SplitPartRow';

import { createPart, type SplitGroup } from '@/lib/splitParts';
import { fireEvent, renderWithProviders, screen } from '@/test/test-utils';

// The pickers talk to the store and the server; the row only needs to wire them up.
vi.mock('@/components/Dashboard/BommelSelect', () => ({
    ALL_BOMMELS: 'all',
    BommelSelect: ({ value, onChange, emptyLabel }: { value: string | number; onChange: (v: string | number) => void; emptyLabel?: string }) => (
        <button type="button" data-testid="bommel-select" data-value={String(value)} onClick={() => onChange(value === 'all' ? 7 : 'all')}>
            {value === 'all' ? emptyLabel : `bommel ${value}`}
        </button>
    ),
}));
vi.mock('@/components/CategoryGroups/CategoryValueCombobox', () => ({
    default: ({ groupId, value, onChange, warn }: { groupId: number; value?: string; onChange: (v?: string) => void; warn?: boolean }) => (
        <button type="button" data-testid={`category-${groupId}`} data-warn={warn ? 'true' : 'false'} onClick={() => onChange('Getränke')}>
            {value ?? 'empty'}
        </button>
    ),
}));

const groups: SplitGroup[] = [
    { id: 10, name: 'Kostenstelle', required: true },
    { id: 11, name: 'Projekt', required: false },
];

function renderRow(overrides: Partial<Parameters<typeof SplitPartRow>[0]> = {}) {
    const handlers = {
        onAmountChange: vi.fn(),
        onBommelChange: vi.fn(),
        onCategoryChange: vi.fn(),
        onTouch: vi.fn(),
        onRemove: vi.fn(),
    };
    const part = overrides.part ?? createPart({ name: 'Bier', amount: '500,00', bommelId: 7, categoryValues: { 10: 'Getränke' } });
    renderWithProviders(
        <SplitPartRow part={part} index={0} amount={500} groups={groups} errors={[]} bommelItems={[]} bommelName="Bar" {...handlers} {...overrides} />
    );
    return handlers;
}

describe('SplitPartRow', () => {
    it('renders the number, the bommel, one field per applicable group and the amount', () => {
        renderRow();

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByTestId('bommel-select')).toHaveTextContent('bommel 7');
        expect(screen.getByTestId('category-10')).toHaveTextContent('Getränke');
        expect(screen.getByTestId('category-11')).toHaveTextContent('empty');
        expect(screen.getByLabelText('Amount')).toHaveValue('500,00');
    });

    it('shows the derived amount for the rest part', () => {
        renderRow({ part: createPart({ rest: true, amount: '0,00' }), amount: 123.4 });

        expect(screen.getByLabelText('Amount')).toHaveValue('123,40');
    });

    it('reports amount edits, touched fields, bommel changes, category changes and removal', () => {
        const handlers = renderRow();

        const amount = screen.getByLabelText('Amount');
        fireEvent.change(amount, { target: { value: '400,00' } });
        expect(handlers.onAmountChange).toHaveBeenCalledWith('400,00');
        fireEvent.blur(amount);
        expect(handlers.onTouch).toHaveBeenCalledWith('amount');

        fireEvent.click(screen.getByTestId('bommel-select'));
        expect(handlers.onBommelChange).toHaveBeenCalledWith(null);
        expect(handlers.onTouch).toHaveBeenCalledWith('bommel');

        fireEvent.click(screen.getByTestId('category-10'));
        expect(handlers.onCategoryChange).toHaveBeenCalledWith(10, 'Getränke');
        expect(handlers.onTouch).toHaveBeenCalledWith('group:10');

        fireEvent.click(screen.getByLabelText('Remove part'));
        expect(handlers.onRemove).toHaveBeenCalled();
    });

    it('marks fields with errors and spells them out in the expanded card', () => {
        renderRow({
            part: createPart({ amount: '0,00' }),
            amount: 0,
            errors: [{ field: 'amount' }, { field: 'bommel' }, { field: 'group:10', label: 'Kostenstelle' }],
        });

        expect(screen.getByTestId('category-10')).toHaveAttribute('data-warn', 'true');
        expect(screen.getByTestId('category-11')).toHaveAttribute('data-warn', 'false');

        fireEvent.click(screen.getByLabelText('Expand as card'));
        // Without a bommel the card asks for one instead of listing the groups.
        expect(screen.getByText('Choose a bommel first.')).toBeInTheDocument();
        expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
        expect(screen.getByText('Please choose')).toBeInTheDocument();
    });

    it('summarises bommel and values in the collapsed header of the expanded card', () => {
        renderRow();

        fireEvent.click(screen.getByLabelText('Expand as card'));
        expect(screen.getByText('Bar · Getränke')).toBeInTheDocument();
        expect(screen.getByText('Part 1')).toBeInTheDocument();
        // Both groups are listed in the card, the mandatory one tagged as such.
        expect(screen.getAllByTestId('category-10')).toHaveLength(1);
        expect(screen.getByText('Kostenstelle')).toBeInTheDocument();
        expect(screen.getByText('Projekt')).toBeInTheDocument();
    });
});
