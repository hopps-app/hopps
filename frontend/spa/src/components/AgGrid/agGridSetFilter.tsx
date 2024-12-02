import React, { useState, useCallback } from 'react';
import { IDoesFilterPassParams, IAfterGuiAttachedParams } from 'ag-grid-community';
import { CustomFilterProps, useGridFilter } from 'ag-grid-react';
import * as _ from 'lodash';
import { CheckedState } from '@radix-ui/react-checkbox';

import { Checkbox } from '@/components/ui/shadecn/Checkbox.tsx';

interface AgGridSetFilterProps extends CustomFilterProps {
    items: { title: string; value: string }[];
    field: string;
}

const AgGridSetFilter = ({ model, onModelChange, items, ...props }: AgGridSetFilterProps) => {
    const [closeFilter, setCloseFilter] = useState<(() => void) | undefined>();
    const [unappliedModel, setUnappliedModel] = useState<string[] | null>(model);
    const field = props.colDef.field!;

    const doesFilterPass = (params: IDoesFilterPassParams) => {
        const value = params.data[field];
        console.log('FILTER ' + field, value, params);

        return !model ? true : model.includes(value);
    };

    const afterGuiAttached = useCallback(({ hidePopup }: IAfterGuiAttachedParams) => {
        setCloseFilter(() => hidePopup);
    }, []);

    const onCheckedChange = (value: string, state: CheckedState) => {
        console.log('CHANGE', value, state);
        let newModel = unappliedModel === null ? [] : [...unappliedModel];

        if (state === true) {
            newModel = [...newModel, value];
        } else {
            newModel = newModel.filter((v) => v !== value);
        }

        if (newModel.length === 0) {
            setUnappliedModel(null);
            onModelChange(null);
            return;
        }

        setUnappliedModel(newModel);
        onModelChange(newModel);
    };

    useGridFilter({
        doesFilterPass,
        afterGuiAttached,
    });

    return (
        <div className="ag-grid-set-filter ag-simple-filter-body-wrapper {">
            <div>
                {items.map((item) => {
                    const id = _.uniqueId('ag-grid-set-filter_');
                    return (
                        <div key={item.value} className="flex justify-between items-center hover:bg-accent">
                            <label htmlFor={id} className="w-full cursor-pointer py-1">
                                {item.title}
                            </label>
                            <Checkbox id={id} className="shrink-0" onCheckedChange={(state) => onCheckedChange(item.value, state)} />
                        </div>
                    );
                })}
            </div>
            {/*<hr />*/}
            {/*<div className="text-right">*/}
            {/*    <Button onClick={onClickApply}>Apply</Button>*/}
            {/*</div>*/}
        </div>
    );
};

export default AgGridSetFilter;
