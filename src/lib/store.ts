import { useCallback, useEffect, useReducer } from 'react';
import type { Answers, Kit, MasterResume, Settings } from './types';

const listeners = new Set<() => void>();

export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((l) => l());
}

export function useLocal<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  const value = read(key, fallback);
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(read(key, fallback)) : v;
      write(key, next);
    },
    [key, fallback],
  );
  return [value, set];
}

export const KEYS = { master: 'afm.master', answers: 'afm.answers', settings: 'afm.settings', kits: 'afm.kits' };
export const DEFAULT_SETTINGS: Settings = { provider: 'free', apiKey: '', model: '', baseUrl: '' };
export const EMPTY_ANSWERS: Answers = {};
export const NO_KITS: Kit[] = [];
export const NO_MASTER: MasterResume | null = null;

export function exportAll() {
  return JSON.stringify(
    { master: read(KEYS.master, null), answers: read(KEYS.answers, {}), kits: read(KEYS.kits, []), exportedAt: new Date().toISOString() },
    null,
    2,
  );
}

export function importAll(json: string) {
  const data = JSON.parse(json);
  if (data.master !== undefined) write(KEYS.master, data.master);
  if (data.answers !== undefined) write(KEYS.answers, data.answers);
  if (data.kits !== undefined) write(KEYS.kits, data.kits);
}
