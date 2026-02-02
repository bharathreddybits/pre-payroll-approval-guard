import React, { useEffect, useState } from 'react';
import { useInView } from '../../hooks/useInView';

interface StatConfig {
  value: string;
  numericTarget?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
  color: string;
}

const stats: StatConfig[] = [
  { value: '99.9%', numericTarget: 99.9, suffix: '%', decimals: 1, label: 'Change detection accuracy', color: 'text-brand-blue' },
  { value: '< 5 min', prefix: '< ', numericTarget: 5, suffix: ' min', decimals: 0, label: 'Average review time', color: 'text-brand-red' },
  { value: '100%', numericTarget: 100, suffix: '%', decimals: 0, label: 'Audit trail coverage', color: 'text-brand-blue' },
];

function useCountUp(target: number, decimals: number, duration: number, isActive: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    // Respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [isActive, target, duration, decimals]);

  return value;
}

export function TrustSignal() {
  const { ref, isVisible } = useInView({ threshold: 0.3 });

  return (
    <section id="trust" ref={ref} className="py-16 lg:py-20 border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <p
          className={`text-center text-sm font-medium text-slate-400 uppercase tracking-widest mb-12 scroll-fade-in ${isVisible ? 'is-visible' : ''}`}
        >
          Trusted by payroll teams who can&apos;t afford to miss a thing
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <CountUpStat key={stat.label} stat={stat} index={i} isActive={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUpStat({ stat, index, isActive }: { stat: StatConfig; index: number; isActive: boolean }) {
  const value = useCountUp(
    stat.numericTarget ?? 0,
    stat.decimals ?? 0,
    1500,
    isActive
  );

  const displayValue = stat.numericTarget != null
    ? `${stat.prefix ?? ''}${value}${stat.suffix ?? ''}`
    : stat.value;

  return (
    <div
      className={`text-center scroll-fade-in scroll-delay-${index + 1} ${isActive ? 'is-visible' : ''}`}
    >
      <div className={`text-3xl lg:text-4xl font-bold ${stat.color} mb-1`}>
        {displayValue}
      </div>
      <div className="text-sm text-slate-500">{stat.label}</div>
    </div>
  );
}
