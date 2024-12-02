import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './InvoicesTable.scss';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi } from 'ag-grid-community';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import type { FilterChangedEvent } from 'ag-grid-community/dist/types/core/events';

import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import AgGridSetFilter from '@/components/AgGrid/agGridSetFilter';

interface Props {
    invoices: InvoicesTableData[];
}

const InvoicesTable = ({ invoices }: Props) => {
    const dateFormat = import.meta.env.VITE_GENERAL_DATE_FORMAT;
    const currencySymbolAfter = import.meta.env.VITE_GENERAL_CURRENCY_SYMBOL_AFTER;

    const { t } = useTranslation();
    const [isShowTable, setIsShowTable] = useState(false);
    const [rowData, setRowData] = useState<InvoicesTableData[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [filteredData, setFilteredData] = useState<InvoicesTableData[]>(invoices);
    const summary = useMemo(() => {
        const totalAmount = filteredData.reduce((sum, invoice) => sum + invoice.amount, 0);

        return `Total ${invoices.length} invoices with sum ${totalAmount}${currencySymbolAfter ? currencySymbolAfter : ''}`;
    }, [filteredData]);

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
        const filterItems = getBommelFilterItems();
        const colDefs: ColDef<InvoicesTableData>[] = [
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
                filterParams: { items: filterItems },
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
        return colDefs;
    }

    const onFilterChanged = useCallback((event: FilterChangedEvent) => {
        const filteredData: InvoicesTableData[] = [];
        (event.api as GridApi).forEachNodeAfterFilter((node) => {
            filteredData.push(node.data);
        });
        setFilteredData(filteredData);
    }, []);

    useEffect(() => {
        setIsShowTable(false);
        setRowData(invoices);
        setColumnDefs(getColumnDefs());
        setIsShowTable(true);
    }, [invoices]);

    const Grid = useMemo(
        () => (
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{ filter: true, sortable: true, resizable: true }}
                domLayout="autoHeight"
                overlayNoRowsTemplate={t('invoices.noInvoices')}
                onFilterChanged={onFilterChanged}
            />
        ),
        [rowData, columnDefs, onFilterChanged]
    );

    return (
        isShowTable && (
            <div className="invoices-table ag-theme-quartz w-full">
                {Grid}
                <div className="h-10 leading-10 text-right font-semibold">{summary}</div>
            </div>
        )
    );
};

export default InvoicesTable;
