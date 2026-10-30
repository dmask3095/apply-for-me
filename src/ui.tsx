import type { ReactNode } from 'react';

export const card = 'rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900';
export const input = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';
export const btn = 'inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
export const btnGhost = 'inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800';
export const muted = 'text-zinc-500 dark:text-zinc-400';
export const chip = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

export function Section({ title, hint, children, id }: { title: string; hint?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={card + ' mb-4'}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {hint ? <p className={'mt-0.5 text-sm ' + muted}>{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
  return (
    <button className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => navigator.clipboard.writeText(text).catch(() => {})}>{label}</button>
  );
}
