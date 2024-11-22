import React, { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { SaleEntry, SpiffEntry, TradeInEntry, calculateCommissions } from '../lib/supabase';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';

interface SalesGridProps {
  sales: SaleEntry[];
  spiffs: SpiffEntry[];
  tradeIns: TradeInEntry[];
  onEdit: (item: SaleEntry | SpiffEntry | TradeInEntry) => void;
  onDelete: (id: string, type: 'sale' | 'spiff' | 'trade-in') => void;
}

type GridRow = {
  id: string;
  date: string;
  stock_number?: string;
  customer_name?: string;
  type: string;
  carCommission: number;
  accessoriesCommission: number;
  warrantyCommission: number;
  maintenanceCommission: number;
  totalCommission: number;
  shared: boolean;
  shared_with_email?: string;
  isSpiff: boolean;
  isTradeIn: boolean;
  comment?: string;
  originalData: SaleEntry | SpiffEntry | TradeInEntry;
};

const columnHelper = createColumnHelper<GridRow>();

const columns = [
  columnHelper.accessor('date', {
    header: 'Date Sold',
    cell: (info) => format(new Date(info.getValue()), 'MM/dd/yyyy'),
  }),
  columnHelper.accessor('stock_number', {
    header: 'Stock #',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('customer_name', {
    header: 'Customer Name',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('carCommission', {
    header: 'Car Commis.',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('accessoriesCommission', {
    header: 'Accessories',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('warrantyCommission', {
    header: 'Warranty',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('maintenanceCommission', {
    header: 'Maintenance',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('totalCommission', {
    header: 'TOTAL',
    cell: info => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('shared', {
    header: 'Shared',
    cell: info => info.getValue() ? 'Yes' : 'No',
  }),
  columnHelper.accessor('shared_with_email', {
    header: 'Shared With',
    cell: info => {
      const email = info.getValue();
      return email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : '-';
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <div className="flex space-x-2">
        <button
          onClick={() => info.table.options.meta?.onEdit(info.row.original.originalData)}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => info.table.options.meta?.onDelete(
            info.row.original.id,
            info.row.original.isSpiff ? 'spiff' : info.row.original.isTradeIn ? 'trade-in' : 'sale'
          )}
          className="p-1 text-red-600 hover:text-red-800 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ),
  }),
];

export default function SalesGrid({ sales, spiffs, tradeIns, onEdit, onDelete }: SalesGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const gridData = useMemo(() => {
    const data: GridRow[] = [];

    // Process sales
    sales.forEach(sale => {
      const commissions = calculateCommissions(sale);
      data.push({
        id: sale.id,
        date: sale.date,
        stock_number: sale.stock_number,
        customer_name: sale.customer_name,
        type: sale.sale_type,
        carCommission: commissions.carCommission,
        accessoriesCommission: commissions.accessoriesCommission,
        warrantyCommission: commissions.warrantyCommission,
        maintenanceCommission: commissions.maintenanceCommission,
        totalCommission: commissions.totalCommission,
        shared: !!sale.shared_with_email,
        shared_with_email: sale.shared_with_email,
        isSpiff: false,
        isTradeIn: false,
        originalData: sale,
      });
    });

    // Process spiffs
    spiffs.forEach(spiff => {
      data.push({
        id: spiff.id,
        date: spiff.date,
        type: 'Spiff',
        carCommission: 0,
        accessoriesCommission: 0,
        warrantyCommission: 0,
        maintenanceCommission: 0,
        totalCommission: spiff.amount,
        shared: false,
        isSpiff: true,
        isTradeIn: false,
        comment: spiff.note,
        originalData: spiff,
      });
    });

    // Process trade-ins
    tradeIns.forEach(tradeIn => {
      data.push({
        id: tradeIn.id,
        date: tradeIn.date,
        type: 'Trade-In',
        carCommission: tradeIn.amount,
        accessoriesCommission: 0,
        warrantyCommission: 0,
        maintenanceCommission: 0,
        totalCommission: tradeIn.amount,
        shared: false,
        isSpiff: false,
        isTradeIn: true,
        comment: tradeIn.comment,
        originalData: tradeIn,
      });
    });

    return data;
  }, [sales, spiffs, tradeIns]);

  const table = useReactTable({
    data: gridData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      onEdit,
      onDelete,
    },
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr 
              key={row.id} 
              className={`
                ${row.original.isSpiff ? 'bg-blue-50' : ''}
                ${row.original.isTradeIn ? 'bg-green-50' : ''}
                hover:bg-gray-50 transition-colors
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}