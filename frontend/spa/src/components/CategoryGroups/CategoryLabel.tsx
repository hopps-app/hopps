import { FC } from 'react';

type CategoryLabelProps = {
    item: { value?: string; parentValue?: string };
    className?: string;
};

/** A category with its position, e.g. "Einnahmen › Spenden". The parent stays quiet, so the category itself stands out. */
const CategoryLabel: FC<CategoryLabelProps> = ({ item, className }) => (
    <span className={className}>
        {item.parentValue && <span className="text-[0.86em] font-medium text-[var(--muted)]">{item.parentValue} › </span>}
        {item.value}
    </span>
);

export default CategoryLabel;
