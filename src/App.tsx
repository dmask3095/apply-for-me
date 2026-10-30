import { useEffect, useState } from 'react';
import { Profile } from './pages/Profile';
import { Apply } from './pages/Apply';
import { KitPage } from './pages/Kit';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { useLocal, KEYS, NO_MASTER, NO_KITS } from './lib/store';
import type { Kit, MasterResume } from './lib/types';

function useHash() {
  const [h, setH] = useState(window.location.hash || '#/');
  useEffect(() => { const f = () => setH(window.location.hash || '#/'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h;
}

export default function App() {
  const hash = useHash();
  const [master] = useLocal<MasterResume | null>(KEYS.master, NO_MASTER);
  const [kits] = useLocal<Kit[]>(KEYS.kits, NO_KITS);
  const route = hash.replace(/^#\/?/, '').split('?')[0];
  const page = route.startsWith('kit/') ? <KitPage id={route.slice(4)} /> : route === 'profile' ? <Profile /> : route === 'history' ? <History /> : route === 'settings' ? <Settings /> : master ? <Apply /> : <Profile />;
  const step = (n: number, label: string, done: boolean, href: string, active: boolean) => (
    <a href={href} className={'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ' + (active ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
      <span className={'flex h-5 w-5 items-center justify-center rounded-full text-xs ' + (done ? 'bg-emerald-600 text-white' : 'border border-current')}>{done ? '✓' : n}</span>{label}
    </a>
  );
  const onProfile = route === 'profile' || (!master && route === '');
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <a href="#/" className="mr-2 text-base font-semibold tracking-tight">Apply for me</a>
          {step(1, 'Your profile', !!master, '#/profile', onProfile)}
          {step(2, 'Paste a job', false, '#/', route === '' && !!master)}
          {step(3, 'Your kit', kits.length > 0, kits.length ? '#/history' : '#/', route === 'history' || route.startsWith('kit/'))}
          <a href="#/settings" className={'ml-auto text-sm ' + (route === 'settings' ? 'font-medium' : 'text-zinc-500 hover:underline dark:text-zinc-400')}>Settings</a>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{page}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-8 text-xs text-zinc-500 dark:text-zinc-400">Open source. Runs entirely in your browser; nothing is stored on a server. The AI steps use a model key you own (free tier available), so your resume goes only to the provider you choose. Facts come only from your resume; you always click Submit.</footer>
    </div>
  );
}
