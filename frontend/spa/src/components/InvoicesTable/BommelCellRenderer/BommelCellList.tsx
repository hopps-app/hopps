import { useEffect, useState, useRef, useCallback } from 'react';

import Icon from '@/components/ui/Icon';
import { Bommel } from '@/services/api/types/Bommel';

type BommelCellListPropsType = {
    filteredBommels: Bommel[];
    reassignTransaction: (bommelId: number) => void;
    currentBommelId: number | null;
    isPopoverVisible: boolean;
};

const BommelCellList = ({ filteredBommels, reassignTransaction, currentBommelId, isPopoverVisible }: BommelCellListPropsType) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [inputMode, setInputMode] = useState<'mouse' | 'keyboard'>('mouse');

    const listRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!filteredBommels.length) return;

            setInputMode('keyboard');

            setFocusedIndex((prevIndex) => {
                const startIndex = prevIndex ?? 0;

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    return Math.min(startIndex + 1, filteredBommels.length - 1);
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    return Math.max(startIndex - 1, 0);
                }
                if (event.key === 'Enter' && prevIndex !== null) {
                    event.preventDefault();
                    reassignTransaction(filteredBommels[prevIndex].id);
                    return prevIndex;
                }
                return prevIndex;
            });
        },
        [filteredBommels, reassignTransaction]
    );

    useEffect(() => {
        if (!isPopoverVisible) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isPopoverVisible, handleKeyDown]);

    useEffect(() => {
        if (focusedIndex !== null && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [focusedIndex]);

    const handleMouseMove = (index: number) => {
        if (inputMode === 'keyboard') return;
        setInputMode('mouse');
        if (focusedIndex !== index) setFocusedIndex(index);
    };

    return (
        <ul ref={listRef} className="w-full max-h-44 overflow-y-auto">
            {filteredBommels.map((bommel: Bommel, index) => {
                const isActive = bommel.id === currentBommelId;
                const isHighlighted = index === focusedIndex;
                const getActiveBommel = () => {
                    if (isActive) return 'bg-[var(--hover-active)]';
                    if (isHighlighted) return 'bg-[var(--hover-effect)] text-[var(--font-color)]';
                    return 'hover:bg-[var(--hover-effect)]';
                };

                return (
                    <li
                        key={bommel.id}
                        ref={(el) => (itemRefs.current[index] = el)}
                        onMouseMove={() => handleMouseMove(index)}
                        className={`w-full flex justify-between items-center py-2 pl-5 pr-5 border-b-[1px] border-b-[var(--separator)] last-of-type:border-none text-sm hover:text-[var(--font-color)] ${getActiveBommel()}`}
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
