import { useState, useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Filter } from 'lucide-react';
import { SearchInput, Select } from '../ui';

const SortIcon = ({ sorted }) => {
  if (sorted === 'asc')  return <ChevronUp size={13} />;
  if (sorted === 'desc') return <ChevronDown size={13} />;
  return <ChevronsUpDown size={13} style={{ color: 'var(--gray-400)' }} />;
};

export const DataGrid = ({
  columns,
  data,
  loading = false,
  total,
  title,
  actions,
  onExport,
  pageSize: defaultPageSize = 20,
  showSearch = true,
  showExport = true,
  rowKey = 'id',
  onRowClick,
  selectable = false,
  emptyText = 'No records found',
}) => {
  const [globalFilter, setGlobalFilter]   = useState('');
  const [rowSelection, setRowSelection]   = useState({});
  const [sorting, setSorting]             = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const table = useReactTable({
    data: data || [],
    columns: useMemo(() => [
      ...(selectable ? [{
        id: 'select',
        header: ({ table }) => (
          <input type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={e => e.stopPropagation()}
          />
        ),
        size: 40,
      }] : []),
      ...columns,
    ], [columns, selectable]),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = total ?? data?.length ?? 0;
  const selectedCount = Object.keys(rowSelection).length;

  const handleExport = () => {
    if (onExport) { onExport(table.getFilteredRowModel().rows.map(r => r.original)); return; }
    const rows = table.getFilteredRowModel().rows;
    const headers = columns.filter(c => c.accessorKey).map(c => c.header || c.accessorKey);
    const keys = columns.filter(c => c.accessorKey).map(c => c.accessorKey);
    const csv = [
      headers.join(','),
      ...rows.map(r => keys.map(k => JSON.stringify(r.original[k] ?? '')).join(',')),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${title || 'export'}.csv`;
    a.click();
  };

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          {title && <h3 className="card-title">{title}</h3>}
          {selectedCount > 0 && (
            <span className="badge badge-primary" style={{ marginTop: 4 }}>{selectedCount} selected</span>
          )}
        </div>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          {showSearch && (
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              style={{ width: 220 }}
            />
          )}
          {actions}
          {showExport && (
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    style={{ width: h.column.columnDef.size, cursor: h.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && <SortIcon sorted={h.column.getIsSorted()} />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                {emptyText}
              </td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="card-footer">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="flex items-center gap-3" style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            <span>
              {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)} of {totalRows} rows
            </span>
            <Select
              options={[10, 20, 50, 100].map(n => ({ value: String(n), label: `${n} / page` }))}
              value={String(pageSize)}
              onChange={v => table.setPageSize(Number(v))}
              placeholder=""
              style={{ width: 110 }}
            />
          </div>
          <div className="pagination" style={{ padding: 0 }}>
            <button className="page-btn" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>«</button>
            <button className="page-btn" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>‹</button>
            {Array.from({ length: Math.min(table.getPageCount(), 7) }, (_, i) => {
              const p = i + Math.max(0, pageIndex - 3);
              if (p >= table.getPageCount()) return null;
              return (
                <button
                  key={p}
                  className={`page-btn ${pageIndex === p ? 'active' : ''}`}
                  onClick={() => table.setPageIndex(p)}
                >{p + 1}</button>
              );
            })}
            <button className="page-btn" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>›</button>
            <button className="page-btn" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>»</button>
          </div>
        </div>
      </div>
    </div>
  );
};
