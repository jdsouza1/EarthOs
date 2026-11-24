// Lets plain Node (22+, with --experimental-strip-types) run the site's TypeScript in lib/:
// resolves extension-less relative imports and the "@/" alias to .ts files. Used by scripts/snapshot-brief.ts.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.cwd();
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) spec = pathToFileURL(path.join(ROOT, spec.slice(2))).href;
  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\.[mc]?[jt]sx?$/.test(spec)) {
    const base = spec.startsWith('file:') ? fileURLToPath(spec) : path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (existsSync(base + ext)) return next(pathToFileURL(base + ext).href, ctx);
  }
  return next(spec, ctx);
}
