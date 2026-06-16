import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2'];

const chartCard = (title, subtitle, children) => (
  <div className="card">
    <div className="card-header">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{subtitle}</p>}
      </div>
    </div>
    <div className="card-body" style={{ paddingTop: 8 }}>{children}</div>
  </div>
);

// ── Revenue Area Chart ─────────────────────────────────────────────────────
export const RevenueChart = ({ data, height = 280 }) =>
  chartCard('Revenue Over Time', 'Monthly revenue trend', (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#colorRev)" />
      </AreaChart>
    </ResponsiveContainer>
  ));

// ── Grouped Bar Chart ──────────────────────────────────────────────────────
export const GroupedBarChart = ({ data, keys = [], height = 280, title = 'Comparison' }) =>
  chartCard(title, undefined, (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ));

// ── Pie / Donut Chart ──────────────────────────────────────────────────────
export const DonutChart = ({ data, height = 260, title = 'Distribution', donut = true }) =>
  chartCard(title, undefined, (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={donut ? '55%' : 0}
          outerRadius="70%"
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={v => v.toLocaleString()} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  ));

// ── Multi-Line Chart ───────────────────────────────────────────────────────
export const MultiLineChart = ({ data, keys = [], height = 280, title = 'Trends' }) =>
  chartCard(title, undefined, (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {keys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
            strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  ));

// ── Radar Chart ────────────────────────────────────────────────────────────
export const RadarChartWidget = ({ data, keys = [], height = 280, title = 'Radar' }) =>
  chartCard(title, undefined, (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--gray-200)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis tick={{ fontSize: 10 }} />
        {keys.map((k, i) => (
          <Radar key={k} name={k} dataKey={k} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.2} />
        ))}
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  ));

// ── KPI Stat Cards ─────────────────────────────────────────────────────────
export const KpiCard = ({ label, value, change, icon: Icon, color = '#2563eb' }) => (
  <div className="stat-card">
    <div className="stat-icon-wrap" style={{ background: color + '15' }}>
      {Icon && <Icon size={22} color={color} />}
    </div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && (
        <div className="stat-change" style={{ color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last period
        </div>
      )}
    </div>
  </div>
);
