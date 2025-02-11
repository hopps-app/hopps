import { useEffect, useState, useRef } from 'react';

import { Bommel } from '@/services/api/types/Bommel';
import Icon from '@/components/ui/Icon';

type BommelCellListPropsType = {
    filteredBommels: Bommel[];
    reassignTransaction: (bommelId: number) => void;
    currentBommelId: number | null;
    isPopoverVisible: boolean;
};

const BommelCellList = ({ filteredBommels, reassignTransaction, currentBommelId, isPopoverVisible }: BommelCellListPropsType) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (!filteredBommels.length) return;

        setFocusedIndex((prevIndex) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                return prevIndex === null ? 0 : Math.min(prevIndex + 1, filteredBommels.length - 1);
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                return prevIndex === null ? filteredBommels.length - 1 : Math.max(prevIndex - 1, 0);
            }
            if (event.key === 'Enter' && prevIndex !== null) {
                reassignTransaction(filteredBommels[prevIndex].id);
                event.preventDefault();
                return prevIndex;
            }
            return prevIndex;
        });
    };

    useEffect(() => {
        itemRefs.current = [];
    }, [filteredBommels]);

    useEffect(() => {
        if (!isPopoverVisible) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredBommels, isPopoverVisible, reassignTransaction]);

    useEffect(() => {
        if (focusedIndex !== null && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [focusedIndex]);

    return (
        <ul ref={listRef} className="w-full max-h-44 overflow-y-auto">
            {filteredBommels.map((bommel: Bommel, index) => {
                const isActive = bommel.id === currentBommelId;
                const getActiveBommel = () => {
                    if (isActive) return 'bg-[var(--hover-active)]';
                    if (index === focusedIndex) return 'bg-[var(--hover-effect)]';
                    return 'hover:bg-[var(--hover-effect)]';
                };
                return (
                    <li
                        key={bommel.id}
                        ref={(el) => (itemRefs.current[index] = el)}
                        onMouseMove={() => setFocusedIndex(bommel.id)}
                        className={`w-full flex justify-between items-center py-2 pl-5 pr-5 border-b-[1px] border-b-[var(--separator)] last-of-type:border-none text-sm ${getActiveBommel()}`}
                    >
                        <button className="w-full text-start flex items-center focus:outline-none" onClick={() => reassignTransaction(bommel.id)}>
                            <span>{bommel.name}</span>
                        </button>
                        {isActive && <Icon icon="Check" size="md" />}
                    </li>
                );
            })}
        </ul>
    );
};

export default BommelCellList;
