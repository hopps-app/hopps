import { CheckedState } from '@radix-ui/react-checkbox';
import { IDoesFilterPassParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { CustomFilterProps, useGridFilter } from 'ag-grid-react';
import * as _ from 'lodash';
import { useState, useCallback, useEffect } from 'react';

import { Checkbox } from '@/components/ui/shadecn/Checkbox.tsx';

interface AgGridSetFilterProps extends CustomFilterProps {
    items: { title: string; value: string }[];
    field: string;
}

type Checkbox = {
    checked: boolean;
    id: string;
    title: string;
    value: string;
};

const AgGridSetFilter = ({ model, onModelChange, items, ...props }: AgGridSetFilterProps) => {
    const [, setCloseFilter] = useState<(() => void) | undefined>();
    const [checkboxes, setCheckboxes] = useState(new Map<string, Checkbox>());
    const [isInitialized, setIsInitialized] = useState(false);
    const field = props.colDef.field!;

    const doesFilterPass = (params: IDoesFilterPassParams) => (!model ? true : model.includes(params.data[field]));

    const afterGuiAttached = useCallback(({ hidePopup }: IAfterGuiAttachedParams) => {
        setCloseFilter(() => hidePopup);
    }, []);

    const onCheckedChange = (value: string, state: CheckedState) => {
        const checkbox = checkboxes.get(value);
        if (checkbox) {
            checkbox.checked = !!state;
            setCheckboxes(new Map(checkboxes));
        }
    };

    useEffect(() => {
        if (!isInitialized) return;

        const newModel = Array.from(checkboxes)
            .filter(([, checkbox]) => checkbox.checked)
            .map(([, checkbox]) => checkbox.value);

        if (newModel.length === items.length) {
            onModelChange(null);
            return;
        }

        onModelChange(newModel);
    }, [checkboxes, isInitialized, items.length, onModelChange]);

    useEffect(() => {
        const map = new Map<string, Checkbox>();
        items.forEach((item) => {
            const checked = model !== null ? model.includes(item.value) : true;
            map.set(item.value, {
                checked,
                id: _.uniqueId('ag-grid-set-filter_'),
                title: item.title,
                value: item.value,
            });
        });

        setCheckboxes(map);
        setIsInitialized(true);
    }, [items, model]);

    useGridFilter({
        doesFilterPass,
        afterGuiAttached,
    });

    return (
        <div className="ag-grid-set-filter ag-simple-filter-body-wrapper {">
            <div>
                {Array.from(checkboxes).map(([, item]) => {
                    return (
                        <div key={item.value} className="flex justify-between items-center hover:bg-accent">
                            <label htmlFor={item.id} className="w-full cursor-pointer py-1">
                                {item.title}
                            </label>
                            <Checkbox
                                id={item.id}
                                checked={item.checked}
                                className="shrink-0"
                                onCheckedChange={(state) => onCheckedChange(item.value, state)}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgGridSetFilter;
