import React, { type FC, type ReactNode } from 'react';

export interface SectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Section: FC<SectionProps> = ({ title, children, className = '' }) => {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-sm border border-slate-100 ${className}`}>
      {title && <h3 className="font-bold text-slate-900 mb-3">{title}</h3>}
      {children}
    </section>
  );
};
