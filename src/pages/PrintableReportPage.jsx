import { PrintableReport } from '../components/reports/PrintableReport';

const MOCK_ORDERS = Array.from({ length: 25 }, (_, i) => ({
  id: `ORD-${String(i + 1001).padStart(5, '0')}`,
  customer: ['Alice Smith','Bob Johnson','Carol White','David Lee','Eva Martinez'][i % 5],
  date: new Date(Date.now() - i * 86400000 * 3).toLocaleDateString(),
  items: Math.floor(Math.random() * 8) + 1,
  total: parseFloat((Math.random() * 2000 + 50).toFixed(2)),
  status: ['completed','pending','cancelled'][i % 3],
}));

const COLUMNS = [
  { key: 'id',       header: 'Order ID',  width: 130 },
  { key: 'customer', header: 'Customer',  width: 160 },
  { key: 'date',     header: 'Date',      width: 110 },
  { key: 'items',    header: 'Items',     width: 70, align: 'center' },
  { key: 'status',   header: 'Status',    width: 100,
    render: (v) => <span style={{ textTransform: 'capitalize', fontWeight: 500,
      color: v === 'completed' ? '#16a34a' : v === 'pending' ? '#d97706' : '#dc2626' }}>{v}</span>
  },
  { key: 'total', header: 'Total', align: 'right',
    render: (v) => `$${Number(v).toFixed(2)}`,
    total: (rows) => `$${rows.reduce((s, r) => s + r.total, 0).toFixed(2)}`,
  },
];

const SUMMARY = [
  { label: 'Total Orders', value: MOCK_ORDERS.length },
  { label: 'Completed',    value: MOCK_ORDERS.filter(o => o.status === 'completed').length },
  { label: 'Pending',      value: MOCK_ORDERS.filter(o => o.status === 'pending').length },
  { label: 'Revenue',      value: `$${MOCK_ORDERS.reduce((s, o) => s + o.total, 0).toFixed(0)}` },
];

export const PrintableReportPage = () => (
  <div>
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-title">Printable Report</div>
        <div className="page-subtitle">Click "Print / PDF" to open the browser print dialog</div>
      </div>
    </div>
    <div className="card">
      <div className="card-body">
        <PrintableReport
          title="Sales Orders Report"
          subtitle="Q3 2026 — All Regions"
          data={MOCK_ORDERS}
          columns={COLUMNS}
          summary={SUMMARY}
        />
      </div>
    </div>
  </div>
);
