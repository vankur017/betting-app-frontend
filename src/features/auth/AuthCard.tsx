import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-night-800 bg-night-900 p-6 sm:p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-night-300">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
