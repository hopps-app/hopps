import React, { FC, useCallback, useState } from 'react';
import { debounce } from 'lodash';

import closeIcon from '@/assets/close.svg';
import searchIcon from '@/assets/search.svg';
import TextField from '@/components/ui/TextField';
import Button from '@/components/ui/Button';

type SearchFieldPropsType = {
    onSearch: (query: string) => void;
    isClose?: boolean;
    onClose?: () => void;
};

const SearchField: FC<SearchFieldPropsType> = ({ onClose, onSearch, isClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const handleOnSearch = useCallback(
        debounce((query) => {
            onSearch(query);
        }, 300),
        [setSearchQuery]
    );

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchQuery(value);
        handleOnSearch(value);
    };

    const clearSearch = () => {
        setSearchQuery('');
        handleOnSearch('');
    };
    return (
        <div className="flex justify-between items-center gap-8 p-2">
            <div className="relative w-full">
                <TextField value={searchQuery} onChange={handleSearchChange} className="pl-4 pr-8 max-h-8 rounded-lg text-[var(--font)]" type="text" />
                {searchQuery ? (
                    <button onClick={clearSearch} className="absolute top-2 right-2 w-4 h-4">
                        <img src={closeIcon} alt="clear" className="w-4 h-4" />
                    </button>
                ) : (
                    <img src={searchIcon} alt="search" className="absolute top-2 right-2 w-4 h-4" />
                )}
            </div>
            {isClose && (
                <Button onClick={onClose} size={'icon'} className="hover:bg-[var(--separator)] bg-transparent w-8 h-8">
                    <img src={closeIcon} alt="close" width={45} height={45} />
                </Button>
            )}
        </div>
    );
};

export default SearchField;
