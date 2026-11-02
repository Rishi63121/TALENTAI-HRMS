import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';
import { ChartCard, ChartTooltip, ANIMATION } from '../charts/common';
import EmptyState from '../feedback/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useSkills } from '../../api/queries';

/** Radar of the skills your jobs ask for (demand) against how often candidates matched them (supply). */
export default function SkillsRadar({ className }) {
  const q = useSkills();
  const data = q.data || [];

  return (
    <ChartCard title="Skills radar" description="Jobs asking for a skill vs candidates who match it" className={className}>
      {q.isLoading ? (
        <Skeleton className="mx-auto size-60 rounded-full" />
      ) : data.length >= 3 ? (
        <div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Radar name="Jobs asking" dataKey="demand" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.28} strokeWidth={2.5} {...ANIMATION} />
                <Radar name="Candidates matching" dataKey="supply" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.22} strokeWidth={2.5} {...ANIMATION} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-medium text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-chart-1" /> Jobs asking
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-chart-2" /> Candidates matching
            </li>
          </ul>
        </div>
      ) : (
        <EmptyState compact icon={RadarIcon} title="Not enough data yet" description="Post a few jobs with required skills and screen some resumes to light up the radar." />
      )}
    </ChartCard>
  );
}
