import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { KpiCard, RevenueChart, DonutChart, GroupedBarChart } from '../components/charts';

const REVENUE = [
  { month: 'Jan', revenue: 42000 }, { month: 'Feb', revenue: 55000 },
  { month: 'Mar', revenue: 48000 }, { month: 'Apr', revenue: 61000 },
  { month: 'May', revenue: 75000 }, { month: 'Jun', revenue: 69000 },
  { month: 'Jul', revenue: 83000 }, { month: 'Aug', revenue: 91000 },
];

const SALES_BY_CATEGORY = [
  { name: 'Software', value: 4200 }, { name: 'Hardware', value: 2800 },
  { name: 'Services', value: 1900 }, { name: 'Support', value: 1100 },
];

const BAR_DATA = [
  { name: 'Q1', target: 120000, actual: 110000 },
  { name: 'Q2', target: 140000, actual: 158000 },
  { name: 'Q3', target: 160000, actual: 149000 },
  { name: 'Q4', target: 180000, actual: 192000 },
];

export const DashboardPage = () => (
  <div>
    <div className="page-header">
      <div className="page-header-left">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Welcome back! Here's what's happening.</div>
      </div>
    </div>

    {/* KPIs */}
    <div className="grid-4" style={{ marginBottom: 24 }}>
      <KpiCard label="Total Revenue"   value="$524,780"  change={12.5}  icon={DollarSign}    color="#2563eb" />
      <KpiCard label="Active Users"    value="3,842"     change={8.1}   icon={Users}         color="#7c3aed" />
      <KpiCard label="Total Orders"    value="1,293"     change={-3.2}  icon={ShoppingCart}  color="#d97706" />
      <KpiCard label="Growth Rate"     value="24.6%"     change={4.7}   icon={TrendingUp}    color="#16a34a" />
    </div>

    {/* Charts row 1 */}
    <div className="grid-2" style={{ marginBottom: 24 }}>
      <RevenueChart data={REVENUE} />
      <DonutChart data={SALES_BY_CATEGORY} title="Sales by Category" />
    </div>

    {/* Charts row 2 */}
    <GroupedBarChart data={BAR_DATA} keys={['target', 'actual']} title="Quarterly Target vs Actual" />
  </div>
);
