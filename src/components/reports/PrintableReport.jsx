import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download } from 'lucide-react';

export const PrintableReport = ({ title, subtitle, data = [], columns = [], summary, children }) => {
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({ contentRef });

  const handleExportCSV = () => {
    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row =>
      columns.map(c => JSON.stringify(row[c.key] ?? '')).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${title}.csv`;
    a.click();
  };

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div>
      {/* Print controls – hidden in print */}
      <div className="flex items-center gap-2 no-print" style={{ marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
          <Printer size={14} /> Print / PDF
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Report content */}
      <div ref={contentRef} style={{ background: 'white' }}>
        <style>{`
          @media print {
            @page { margin: 20mm; }
            body { font-family: Arial, sans-serif; font-size: 11pt; }
          }
        `}</style>

        {/* Report header */}
        <div style={{ borderBottom: '2px solid var(--gray-900)', paddingBottom: 16, marginBottom: 24 }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>{subtitle}</div>}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--gray-500)' }}>
              <div style={{ fontWeight: 600 }}>EnterpriseApp</div>
              <div>Generated: {now}</div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 24 }}>
            {summary.map((s, i) => (
              <div key={i} style={{ padding: 16, border: '1px solid var(--gray-200)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Custom content */}
        {children}

        {/* Data table */}
        {columns.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {columns.map((c, i) => (
                  <th key={i} style={{
                    padding: '8px 12px', textAlign: c.align || 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--gray-600)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '2px solid var(--gray-200)',
                    width: c.width,
                  }}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  {columns.map((c, ci) => (
                    <td key={ci} style={{
                      padding: '8px 12px', textAlign: c.align || 'left',
                      color: c.highlight?.(row) || 'var(--gray-800)',
                    }}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            {columns.some(c => c.total) && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--gray-300)', fontWeight: 700 }}>
                  {columns.map((c, i) => (
                    <td key={i} style={{ padding: '10px 12px', textAlign: c.align || 'left', background: 'var(--gray-50)' }}>
                      {c.total ? c.total(data) : (i === 0 ? 'TOTAL' : '')}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* Report footer */}
        <div style={{
          marginTop: 40, paddingTop: 16,
          borderTop: '1px solid var(--gray-200)',
          fontSize: 11, color: 'var(--gray-400)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Confidential – {title}</span>
          <span>Page 1</span>
        </div>
      </div>
    </div>
  );
};
