import { RevenueChart, DonutChart, GroupedBarChart, MultiLineChart, RadarChartWidget } from '../components/charts';

const REV = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  revenue: 30000 + Math.random() * 60000,
}));

const PIE = [
  { name: 'North', value: 3200 }, { name: 'South', value: 2100 },
  { name: 'East', value: 1800 }, { name: 'West', value: 2700 }, { name: 'Online', value: 4500 },
];

const BAR = ['Q1','Q2','Q3','Q4'].map(n => ({ name: n, Sales: Math.random()*50000+30000, Returns: Math.random()*5000+1000 }));

const LINE = REV.map((r, i) => ({ date: r.month, revenue: r.revenue, expenses: r.revenue * 0.6 + Math.random()*5000 }));

const RADAR = [
  { subject: 'Sales', A: 120, B: 110 }, { subject: 'Marketing', A: 98, B: 130 },
  { subject: 'Support', A: 86, B: 130 }, { subject: 'Tech', A: 99, B: 100 },
  { subject: 'Operations', A: 85, B: 90 }, { subject: 'Finance', A: 65, B: 85 },
];

export const ChartsPage = () => (
  <div>
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-title">Charts</div>
        <div className="page-subtitle">Recharts-powered data visualizations</div>
      </div>
    </div>

    <div className="grid-2" style={{ marginBottom: 24 }}>
      <RevenueChart data={REV} />
      <DonutChart data={PIE} title="Sales by Region" />
    </div>
    <div className="grid-2" style={{ marginBottom: 24 }}>
      <GroupedBarChart data={BAR} keys={['Sales', 'Returns']} title="Quarterly Sales vs Returns" />
      <MultiLineChart data={LINE} keys={['revenue', 'expenses']} title="Revenue vs Expenses" />
    </div>
    <div style={{ maxWidth: 560 }}>
      <RadarChartWidget data={RADAR} keys={['A', 'B']} title="Team Performance Radar" />
    </div>
  </div>
);
