import Icon from '../ui/Icon';
import { Category } from './CategoryForm';

type Props = {
    categories: Category[];
};

export default function CategoryTable({ categories }: Props) {
    return (
        <div className="flex flex-col gap-3">
            {categories.map((category) => (
                <div key={category.id} className="flex items-start justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
                    <div>
                        <div className="font-semibold text-gray-900">
                            {category.number ?? '00'} – {category.name}
                        </div>
                        {category.description && <p className="text-sm text-gray-500">{category.description}</p>}
                        {!category.description && <p className="text-sm text-gray-400 italic">Keine Beschreibung</p>}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" className="rounded-md p-1 text-gray-500 hover:text-primary focus:outline-none">
                            <Icon icon="Pencil1" size="md" />
                        </button>
                        <button type="button" className="rounded-md p-1 text-gray-500 hover:text-destructive focus:outline-none">
                            <Icon icon="Trash" size="md" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
