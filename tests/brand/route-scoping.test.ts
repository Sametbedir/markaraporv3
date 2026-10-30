import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Marka verisine dokunan her uç nokta `requireBrand()` kullanmalı ve sorgularda yalnızca
 * `userId` ile filtrelememeli; aksi halde bir markanın verisi diğer markalarda görünür.
 */
const EXEMPT = ['auth', 'signup', 'health', 'ai-analiz', 'brands', join('dashboard', 'campaigns')];

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routes(path);
    return name === 'route.ts' ? [path] : [];
  });
}

const apiDir = join(process.cwd(), 'app', 'api');
const scoped = routes(apiDir).filter((p) => !EXEMPT.some((e) => p.slice(apiDir.length + 1).startsWith(e)));

describe('API marka kapsamı', () => {
  it('kontrol edilecek uç nokta var', () => {
    expect(scoped.length).toBeGreaterThan(20);
  });
  it.each(scoped.map((p) => [p.slice(apiDir.length + 1), p]))('%s requireBrand kullanır', (_name, path) => {
    const src = readFileSync(path, 'utf8');
    expect(src).toContain('requireBrand()');
    expect(src).not.toMatch(/where:\s*\{\s*userId[\s,}]/);
    expect(src).not.toContain('session.user.id');
    expect(src).not.toContain('user_id =');
  });
});
