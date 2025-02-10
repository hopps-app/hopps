import { Bommel } from '@/services/api/types/Bommel';

type BommelCellListPropsType = {
    filteredBommels: Bommel[];
    reassignTransaction: (bommelId: number) => void;
};

const BommelCellList = ({ filteredBommels, reassignTransaction }: BommelCellListPropsType) => {
    return (
        <ul className="w-full max-h-44 overflow-scroll">
            {filteredBommels.map((bommel: Bommel) => {
                return (
                    <li
                        key={bommel.id}
                        className="w-full py-2 pl-5 border-b-[1px] border-b-[var(--separator)] last-of-type:border-none pr-5 text-sm hover:bg-[var(--hover-effect)] "
                    >
                        <button className="w-full text-start" onClick={() => reassignTransaction(bommel.id)}>
                            <span>{bommel.name}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default BommelCellList;
