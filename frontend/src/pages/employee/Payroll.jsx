import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Printer, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import { Card, CardBody } from '../../components/ui/Card';
import { AnimatedNumber } from '../../components/ui/StatCard';
import { ChartSkeleton, Skeleton, TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/feedback/EmptyState';
import QueryBoundary from '../../components/feedback/QueryBoundary';
import { ANIMATION, AXIS, ChartCard, ChartTooltip, GRID } from '../../components/charts/common';
import { useAuth } from '../../context/AuthContext';
import { useMyPayroll } from '../../api/queries';
import { formatCurrency } from '../../lib/format';
import { rise, stagger } from '../../lib/motion';

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #payslip, #payslip * { visibility: visible !important; }
  #payslip { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
  .no-print { display: none !important; }
}`;

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" rounded="rounded-3xl" />
      <Card>
        <CardBody>
          <ChartSkeleton height={200} />
        </CardBody>
      </Card>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <TableSkeleton rows={4} cols={3} />
      </div>
    </div>
  );
}

function Line({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-white/75">{label}</span>
      <span className={`font-semibold tabular-nums ${tone || ''}`}>{value}</span>
    </div>
  );
}

function Payslip({ pay, name }) {
  return (
    <motion.div variants={rise}>
      <style>{PRINT_CSS}</style>
      <div id="payslip" className="bg-brand relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Payslip - {pay.month}</p>
            <p className="mt-1 text-sm text-white/80">{name}</p>
          </div>
          <Button variant="secondary" size="sm" icon={Printer} className="no-print" onClick={() => window.print()}>
            Download / Print
          </Button>
        </div>

        <p className="relative mt-6 text-sm text-white/75">Net pay</p>
        <p className="font-display relative text-4xl font-extrabold tabular-nums sm:text-5xl">
          <AnimatedNumber value={pay.net_salary} format={(n) => formatCurrency(n, true)} />
        </p>

        <div className="relative mt-6 divide-y divide-white/20 rounded-2xl bg-white/10 px-4 backdrop-blur">
          <Line label="Basic salary" value={formatCurrency(pay.basic_salary, true)} />
          <Line label="Bonus" value={`+ ${formatCurrency(pay.bonus, true)}`} />
          <Line label="Deductions" value={`- ${formatCurrency(pay.deductions, true)}`} />
        </div>
      </div>
    </motion.div>
  );
}

function Content({ records }) {
  const { user } = useAuth();
  const latest = records[0];
  const chartData = [...records].reverse().map((r) => ({ month: r.month, net: r.net_salary }));

  const columns = [
    { key: 'month', header: 'Month', primary: true, render: (r) => <span className="font-semibold">{r.month}</span> },
    { key: 'basic_salary', header: 'Basic', align: 'right', render: (r) => formatCurrency(r.basic_salary, true) },
    { key: 'bonus', header: 'Bonus', align: 'right', render: (r) => formatCurrency(r.bonus, true) },
    { key: 'deductions', header: 'Deductions', align: 'right', render: (r) => formatCurrency(r.deductions, true) },
    { key: 'net_salary', header: 'Net pay', align: 'right', render: (r) => <span className="font-bold">{formatCurrency(r.net_salary, true)}</span> },
  ];

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-6">
      <Payslip pay={latest} name={latest.employee_name || user?.name} />

      {chartData.length > 1 && (
        <motion.div variants={rise}>
          <ChartCard title="Net pay by month" description="Take-home over time">
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -6, right: 4, top: 4 }} barCategoryGap="28%">
                  <defs>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" />
                      <stop offset="100%" stopColor="var(--chart-2)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="month" {...AXIS} />
                  <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} {...AXIS} />
                  <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<ChartTooltip format={(v) => formatCurrency(v)} />} />
                  <Bar dataKey="net" name="Net pay" fill="url(#netFill)" radius={[8, 8, 0, 0]} {...ANIMATION} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>
      )}

      <motion.div variants={rise}>
        <DataTable data={records} columns={columns} pageSize={8} searchKeys={['month']} searchPlaceholder="Search by month" />
      </motion.div>
    </motion.div>
  );
}

export default function EmployeePayroll() {
  const query = useMyPayroll();

  return (
    <>
      <PageHeader eyebrow="My workspace" title="My payroll" description="Your payslips and earnings history." />
      <QueryBoundary
        query={query}
        skeleton={<PageSkeleton />}
        isEmpty={(d) => !d.length}
        empty={
          <Card>
            <EmptyState icon={Wallet} title="No payslips yet" description="Once payroll is processed for you, your payslip will appear here. If you expected one, ask an administrator." />
          </Card>
        }
      >
        {(records) => <Content records={records} />}
      </QueryBoundary>
    </>
  );
}
