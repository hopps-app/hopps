import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './InvoicesTable.scss';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { CellMouseOverEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import AgGridSetFilter from '@/components/AgGrid/agGridSetFilter';
import BommelCellRenderer from '@/components/InvoicesTable/BommelCellRenderer/BommelCellRenderer.tsx';

interface Props {
    invoices: InvoicesTableData[];
}

const InvoicesTable = ({ invoices }: Props) => {
    const { t, i18n } = useTranslation();

    const dateFormat = import.meta.env.VITE_GENERAL_DATE_FORMAT;
    const currencySymbolAfter = import.meta.env.VITE_GENERAL_CURRENCY_SYMBOL_AFTER;

    const [api, setApi] = useState<GridApi | null>(null);
    const [rowData, setRowData] = useState<InvoicesTableData[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [filteredData, setFilteredData] = useState<InvoicesTableData[]>(invoices);

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat(i18n.language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    useEffect(() => {
        setRowData(invoices);
        setColumnDefs(getColumnDefs());
    }, [invoices]);

    const summary = useMemo(() => {
        const totalAmount = filteredData.reduce((sum, invoice) => sum + invoice.amount, 0);

        return `${t('invoices.summary.totalFirstPart')} ${filteredData.length} ${t('invoices.summary.invoicesPart')} ${formatNumber(totalAmount)}${currencySymbolAfter || ''}`;
    }, [filteredData, currencySymbolAfter]);

    const updateFilteredData = useCallback(() => {
        const items: InvoicesTableData[] = [];

        api?.forEachNodeAfterFilter((node) => {
            items.push(node.data);
        });
        setFilteredData(items);
    }, [api]);

    const getBommelFilterItems = () => {
        const ids: number[] = [];
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
                headerName: `${t('invoices.table.date')}`,
                field: 'date',
                filter: 'agDateColumnFilter',
                width: 150,
                flex: 1,
                valueFormatter: (params) => moment(params.value).format(dateFormat),
            },

            {
                headerName: `${t('invoices.table.bommel')}`,
                field: 'bommel',
                filter: AgGridSetFilter,
                filterParams: { items: getBommelFilterItems() },
                flex: 1,
            },
            {
                headerName: `${t('invoices.table.amount')}`,
                headerClass: 'amount-header',
                field: 'amount',
                filter: 'agNumberColumnFilter',
                flex: 1,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', paddingLeft: '4px' },
                valueFormatter: (params) => `${formatNumber(params.value)}${currencySymbolAfter || ''}`,
            },
            {
                headerName: '',
                filter: null,
                filterParams: { items: getBommelFilterItems() },
                flex: 1,
                resizable: false,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' },
                cellRenderer: BommelCellRenderer,
            },
        ];
    }

    const onFilterChanged = useCallback(() => {
        updateFilteredData();
    }, [updateFilteredData]);

    const onRowHover = (event: CellMouseOverEvent<InvoicesTableData>) => {
        if (!event.data) return;
        api?.refreshCells({ force: true });
    };

    const onGridReady = useCallback(
        (event: GridReadyEvent) => {
            setApi(event.api);
        },
        [setApi]
    );

    const Grid = useMemo(
        () => (
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                getRowId={(params) => params.data.id?.toString()}
                defaultColDef={{ filter: true, sortable: true, resizable: true }}
                domLayout="autoHeight"
                overlayNoRowsTemplate={t('invoices.noInvoices')}
                onGridReady={onGridReady}
                onRowDataUpdated={updateFilteredData}
                onFirstDataRendered={updateFilteredData}
                onFilterChanged={onFilterChanged}
                onCellMouseOver={onRowHover}
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
