import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './InvoicesTable.scss';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import AgGridSetFilter from '@/components/AgGrid/agGridSetFilter';

interface Props {
    invoices: InvoicesTableData[];
}

const InvoicesTable = ({ invoices }: Props) => {
    const dateFormat = import.meta.env.VITE_GENERAL_DATE_FORMAT;
    const currencySymbolAfter = import.meta.env.VITE_GENERAL_CURRENCY_SYMBOL_AFTER;

    const { t } = useTranslation();
    const [api, setApi] = useState<GridApi | null>(null);
    const [rowData, setRowData] = useState<InvoicesTableData[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [filteredData, setFilteredData] = useState<InvoicesTableData[]>(invoices);
    const summary = useMemo(() => {
        const totalAmount = filteredData.reduce((sum, invoice) => sum + invoice.amount, 0);

        console.log('TEST', totalAmount, filteredData.length);
        return `Total ${filteredData.length} invoices with sum ${totalAmount}${currencySymbolAfter ? currencySymbolAfter : ''}`;
    }, [filteredData]);

    const updateFilteredData = useCallback(() => {
        const items: InvoicesTableData[] = [];

        console.log('updateFilteredData', api);
        api?.forEachNodeAfterFilter((node) => {
            items.push(node.data);
        });
        setFilteredData(items);
        console.log('SET FILTERED DATA', items.length);
    }, [api]);

    const getBommelFilterItems = () => {
        const ids: string[] = [];
        invoices.forEach((invoice) => {
            if (!ids.includes(invoice.bommel)) {
                ids.push(invoice.bommel);
            }
        });

        return ids.map((id) => ({ title: id, value: id }));
    };

    function getColumnDefs(): ColDef<InvoicesTableData>[] {
        return [
            {
                headerName: 'Date',
                field: 'date',
                filter: 'agDateColumnFilter',
                width: 150,
                flex: 1,
                valueFormatter: (params) => moment(params.value).format(dateFormat),
            },
            {
                headerName: 'Bommel',
                field: 'bommel',
                filter: AgGridSetFilter,
                filterParams: { items: getBommelFilterItems() },
                flex: 1,
            },
            { headerName: 'Creditor', field: 'creditor', filter: 'agTextColumnFilter', flex: 2 },
            { headerName: 'Submitter', field: 'submitter', filter: 'agTextColumnFilter', flex: 2 },
            {
                headerName: 'Amount',
                field: 'amount',
                filter: 'agNumberColumnFilter',
                flex: 1,
                valueFormatter: (params) => `${params.value}${currencySymbolAfter ? currencySymbolAfter : ''}`,
            },
        ];
    }

    const onFilterChanged = useCallback(() => {
        updateFilteredData();
    }, [api, updateFilteredData]);

    const onGridReady = useCallback(
        (event: GridReadyEvent) => {
            setApi(event.api);
        },
        [setApi]
    );

    useEffect(() => {
        setRowData(invoices);
        setColumnDefs(getColumnDefs());
        updateFilteredData();
    }, [invoices.length]);

    const Grid = useMemo(
        () => (
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{ filter: true, sortable: true, resizable: true }}
                domLayout="autoHeight"
                overlayNoRowsTemplate={t('invoices.noInvoices')}
                onGridReady={onGridReady}
                onFirstDataRendered={updateFilteredData}
                onFilterChanged={onFilterChanged}
            />
        ),
        [rowData, columnDefs, onFilterChanged]
    );

    return (
        <div className="invoices-table ag-theme-quartz w-full">
            {Grid}
            <div className="h-10 leading-10 text-right font-semibold">{summary}</div>
        </div>
    );
};

export default memo(InvoicesTable);
