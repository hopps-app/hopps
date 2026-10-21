import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './styles/InvoicesTable.scss';

import { CellMouseOverEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { format } from 'date-fns';
import { de, enUS, fr, it, uk } from 'date-fns/locale';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import InvoiceTableHeader from './InvoiceTableHeader';

import AgGridSetFilter from '@/components/AgGrid/agGridSetFilter';
import BommelCellRenderer from '@/components/InvoicesTable/BommelCellRenderer/BommelCellRenderer.tsx';
import { InvoicesTableData } from '@/components/InvoicesTable/types.ts';
import InvoiceUploadForm from '@/components/InvoiceUploadForm/InvoiceUploadForm.tsx';
import { useCurrency } from '@/hooks/use-currency';

interface Props {
    invoices: InvoicesTableData[];
    reload: () => void;
}

const InvoicesTable = ({ invoices, reload }: Props) => {
    const { t, i18n } = useTranslation();

    const { format: formatCurrency } = useCurrency();

    // Get the appropriate date-fns locale based on the current language
    const getDateLocale = useCallback(() => {
        switch (i18n.language) {
            case 'de':
                return de;
            case 'uk':
                return uk;
            case 'it':
                return it;
            case 'fr':
                return fr;
            default:
                return enUS;
        }
    }, [i18n.language]);

    const [api, setApi] = useState<GridApi | null>(null);
    const [rowData, setRowData] = useState<InvoicesTableData[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [filteredData, setFilteredData] = useState<InvoicesTableData[]>(invoices);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadInvoice, setIsUploadInvoice] = useState(false);

    useEffect(() => {
        api?.setGridOption('quickFilterText', searchQuery);
    }, [searchQuery, api]);

    const summary = useMemo(() => {
        const totalAmount = filteredData.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

        return `${t('invoices.summary.totalFirstPart')} ${filteredData.length} ${t('invoices.summary.invoicesPart')} ${formatCurrency(totalAmount)}`;
    }, [filteredData, formatCurrency, t]);

    const updateFilteredData = useCallback(() => {
        const items: InvoicesTableData[] = [];

        api?.forEachNodeAfterFilter((node) => {
            items.push(node.data);
        });
        setFilteredData(items);
    }, [api]);

    const getBommelFilterItems = useCallback(() => {
        const ids: number[] = [];
        invoices.forEach((invoice) => {
            if (!ids.includes(invoice.bommel || -1)) {
                ids.push(invoice.bommel || -1);
            }
        });

        return ids.map((id) => ({ title: id, value: id }));
    }, [invoices]);

    const getColumnDefs = useCallback((): ColDef<InvoicesTableData>[] => {
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
                valueFormatter: (params) => formatCurrency(params.value),
            },
            {
                headerName: `${t('invoices.table.date')}`,
                field: 'date',
                filter: 'agDateColumnFilter',
                width: 150,
                flex: 1,
                valueFormatter: (params) => {
                    if (!params.value) return '';
                    try {
                        return format(new Date(params.value), 'P', { locale: getDateLocale() });
                    } catch {
                        return String(params.value);
                    }
                },
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
    }, [t, getBommelFilterItems, formatCurrency, getDateLocale]);

    useEffect(() => {
        setRowData(invoices);
        setColumnDefs(getColumnDefs());
    }, [invoices, getColumnDefs]);

    const onFilterChanged = useCallback(() => {
        updateFilteredData();
    }, [updateFilteredData]);

    const onRowHover = useCallback(
        (event: CellMouseOverEvent<InvoicesTableData>) => {
            if (!event.data) return;
            api?.refreshCells({ force: true });
        },
        [api]
    );

    const onGridReady = useCallback(
        (event: GridReadyEvent) => {
            setApi(event.api);
        },
        [setApi]
    );

    const onUploadInvoiceChange = useCallback(() => {
        setIsUploadInvoice(!isUploadInvoice);
        if (isUploadInvoice) {
            reload();
        }
    }, [isUploadInvoice, reload]);

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
        [rowData, columnDefs, onFilterChanged, onGridReady, onRowHover, t, updateFilteredData]
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
