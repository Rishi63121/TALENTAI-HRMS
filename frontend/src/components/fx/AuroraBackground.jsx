import TalentGraph from './TalentGraph';

/**
 * Site-wide living background: slow gradient orbs plus the interactive "talent graph" network. h-lvh keeps the fixed
 * layer one constant size while mobile browser toolbars collapse and expand, so it never resizes mid-scroll.
 */
export default function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh transform-gpu overflow-hidden">
      <div className="absolute -left-40 -top-48 size-[42rem] rounded-full bg-[var(--aurora-1)] opacity-[var(--orb-opacity)] blur-[110px] [animation:float_16s_ease-in-out_infinite]" />
      <div className="absolute -bottom-56 -right-32 size-[46rem] rounded-full bg-[var(--aurora-2)] opacity-[var(--orb-opacity)] blur-[120px] [animation:float_20s_ease-in-out_infinite_2s]" />
      <div className="absolute right-1/3 top-1/4 size-[26rem] rounded-full bg-[var(--aurora-3)] opacity-[calc(var(--orb-opacity)*0.55)] blur-[110px] [animation:float_18s_ease-in-out_infinite_1s]" />
      <div style={{ opacity: 'var(--graph-opacity)' }} className="absolute inset-0">
        <TalentGraph />
      </div>
    </div>
  );
}
