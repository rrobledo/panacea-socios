import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { DataGrid } from '../components/grid/DataGrid';
import { StatusBadge, Modal, ConfirmDialog } from '../components/ui';
import { useToast } from '../context/ToastContext';

// Mock data
const MOCK = Array.from({ length: 80 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  sku: `SKU-${String(i + 1).padStart(4, '0')}`,
  category: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][i % 5],
  price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
  stock: Math.floor(Math.random() * 200),
  status: ['active', 'inactive', 'pending'][i % 3],
  created_at: new Date(Date.now() - i * 86400000).toLocaleDateString(),
}));

const fmt = (v) => `$${Number(v).toFixed(2)}`;

const COLUMNS = [
  { accessorKey: 'name',      header: 'Product Name', size: 180 },
  { accessorKey: 'sku',       header: 'SKU',          size: 120 },
  { accessorKey: 'category',  header: 'Category',     size: 120 },
  { accessorKey: 'price',     header: 'Price',        size: 100, cell: ({ getValue }) => fmt(getValue()) },
  { accessorKey: 'stock',     header: 'Stock',        size: 80,  cell: ({ getValue }) => {
    const v = getValue();
    return <span style={{ color: v < 10 ? 'var(--danger)' : v < 30 ? 'var(--warning)' : 'inherit' }}>{v}</span>;
  }},
  { accessorKey: 'status',    header: 'Status',       size: 100, cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
  { accessorKey: 'created_at',header: 'Created',      size: 110 },
  {
    id: 'actions', header: 'Actions', size: 90,
    cell: ({ row }) => <RowActions row={row.original} />,
  },
];

const RowActions = ({ row }) => {
  const toast = useToast();
  const [del, setDel] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit2 size={14} /></button>
      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => setDel(true)}><Trash2 size={14} color="var(--danger)" /></button>
      <ConfirmDialog
        open={del}
        onConfirm={() => { setDel(false); toast.success(`Product "${row.name}" deleted`); }}
        onCancel={() => setDel(false)}
        title="Delete product?"
        message={`Are you sure you want to delete "${row.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export const ProductsPage = () => {
  const toast = useToast();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Products</div>
          <div className="page-subtitle">Manage your product catalog</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => toast.info('Open create product modal')}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      <DataGrid
        title="Product Catalog"
        columns={COLUMNS}
        data={MOCK}
        selectable
        total={MOCK.length}
        emptyText="No products found"
      />
    </div>
  );
};
