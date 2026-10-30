import { useLocal, KEYS, NO_KITS } from '../lib/store';
import type { Kit } from '../lib/types';
import { Section, muted, chip, btnGhost } from '../ui';

export function History() {
  const [kits, setKits] = useLocal<(Kit & { status?: string; appliedAt?: number })[]>(KEYS.kits, NO_KITS);
  if (!kits.length) return <p className={muted}>No kits yet.</p>;
  return (
    <Section title="Your applications" hint="Status is yours to set. Follow-up dates are six days after you marked Applied.">
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {kits.map((k) => {
          const follow = k.appliedAt ? new Date(k.appliedAt + 6 * 86400000) : null;
          const due = follow && follow.getTime() <= Date.now() && (k.status === 'Applied');
          return (
            <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
              <a href={'#/kit/' + k.id} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">{k.posting.company} · {k.posting.title}</a>
              <span className={chip + ' bg-zinc-500/15 text-zinc-600 dark:text-zinc-300'}>{k.status || 'Kit built'}</span>
              {due ? <span className={chip + ' bg-amber-500/15 text-amber-700'}>follow up now</span> : null}
              <span className={'ml-auto text-xs ' + muted}>{new Date(k.createdAt).toLocaleDateString()}</span>
              <button className={btnGhost + ' !px-3 !py-1 text-xs'} onClick={() => { if (confirm('Delete this kit?')) setKits((prev) => prev.filter((x) => x.id !== k.id)); }}>Delete</button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
