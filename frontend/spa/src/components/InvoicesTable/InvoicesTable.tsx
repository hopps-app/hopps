import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './styles/InvoicesTable.scss';

import { CellMouseOverEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import moment from 'moment';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgGridSetFilter from '@/components/AgGrid/agGridSetFilter';
import BommelCellRenderer from '@/components/InvoicesTable/BommelCellRenderer/BommelCellRenderer.tsx';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import InvoiceUploadForm from '@/components/InvoiceUploadForm/InvoiceUploadForm.tsx';
import InvoiceTableHeader from './InvoiceTableHeader';

interface Props {
    invoices: InvoicesTableData[];
    reload: () => void;
}

const InvoicesTable = ({ invoices, reload }: Props) => {
    const { t, i18n } = useTranslation();

    const dateFormat = import.meta.env.VITE_GENERAL_DATE_FORMAT;
    const currencySymbolAfter = import.meta.env.VITE_GENERAL_CURRENCY_SYMBOL_AFTER;

    const [api, setApi] = useState<GridApi | null>(null);
    const [rowData, setRowData] = useState<InvoicesTableData[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [filteredData, setFilteredData] = useState<InvoicesTableData[]>(invoices);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadInvoice, setIsUploadInvoice] = useState(false);

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

    useEffect(() => {
        api?.setGridOption('quickFilterText', searchQuery);
    }, [searchQuery]);

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
                headerName: `${t('invoices.table.name')}`,
                field: 'name',
                filter: 'agDateColumnFilter',
                flex: 1,
            },
            {
                headerName: `Id`,
                field: 'id',
                filter: AgGridSetFilter,
                filterParams: { items: getBommelFilterItems() },
                flex: 1,
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
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', border: 'none', paddingLeft: '4px' },
                valueFormatter: (params) => `${formatNumber(params.value)}${currencySymbolAfter || ''}`,
            },
            {
                headerName: `${t('invoices.table.date')}`,
                field: 'date',
                filter: 'agDateColumnFilter',
                width: 150,
                flex: 1,
                valueFormatter: (params) => moment(params.value).format(dateFormat),
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

    const onUploadInvoiceChange = () => {
        setIsUploadInvoice(!isUploadInvoice);
        if (isUploadInvoice) {
            reload();
        }
    };

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
        <>
            {isUploadInvoice ? (
                <InvoiceUploadForm onUploadInvoiceChange={onUploadInvoiceChange} />
            ) : (
                <div className="invoices-wrapper  w-full flex flex-col gap-2">
                    <InvoiceTableHeader onUploadInvoiceChange={onUploadInvoiceChange} setSearchQuery={setSearchQuery} />

                    <div className="invoices-table ag-theme-quartz w-full">
                        {Grid}
                        <div className="h-10 leading-10 text-right font-semibold">{summary}</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default memo(InvoicesTable);
