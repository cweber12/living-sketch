#!/usr/bin/env node
/**
 * gen-arch.mjs
 *
 * Generates docs/architecture.md — a dependency map for agent navigation.
 * Produces: Module Overview, Module Relationships (Sketch/Extract/Console),
 * Pages & Routes, File Index (sub-grouped, role-tagged, exports listed),
 * Hot Modules, and Cross-cutting Dependencies.
 *
 * Usage:  node scripts/gen-arch.mjs
 *         npm run arch
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app', 'components', 'hooks', 'lib'];
const ROOT_FILES = ['middleware.ts'];
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'public', '__tests__']);
const TS_EXTS = new Set(['.ts', '.tsx']);
const OUT_PATH = path.join(ROOT, 'docs', 'architecture.md');

// The three core application modules — page/component/hook boundaries.
const MODULE_DEFS = {
  sketch: {
    label: 'Sketch',
    desc: 'Drawing and SVG logic, saving SVGs',
    prefixes: ['app/sketch', 'components/sketch'],
    ownFiles: new Set(['hooks/use-sketch-canvas-rig.ts']),
  },
  extract: {
    label: 'Extract',
    desc: 'Pose detection, video/webcam handling, saving pose landmarks',
    prefixes: ['app/extract', 'components/extract'],
    ownFiles: new Set(['hooks/use-pose-detection.ts']),
  },
  console: {
    label: 'Console',
    desc: 'SVG anchoring, rendering logic, fetching landmarks and SVGs',
    prefixes: ['app/console', 'components/console'],
    ownFiles: new Set(['hooks/use-cache-svgs.ts']),
  },
};

// Deps that are purely cosmetic UI (toolbar chrome, nav, icon components).
const UI_SHARED_PREFIXES = ['components/shared/'];
const UI_SHARED_EXACT = new Set(['lib/constants/icons.ts', 'lib/theme.ts', 'lib/cn.ts']);

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, acc);
    else if (TS_EXTS.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Import extraction (import + re-export specifiers)
// ---------------------------------------------------------------------------

function extractImportSpecifiers(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true);
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return specifiers;
}

// ---------------------------------------------------------------------------
// Export extraction
// ---------------------------------------------------------------------------

function extractExports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true);
  const names = [];

  function hasExportKw(node) {
    return !!(node.modifiers ?? []).find((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && hasExportKw(node) && node.name) {
      names.push(node.name.text);
    } else if (ts.isClassDeclaration(node) && hasExportKw(node) && node.name) {
      names.push(node.name.text);
    } else if (ts.isInterfaceDeclaration(node) && hasExportKw(node)) {
      names.push(node.name.text);
    } else if (ts.isTypeAliasDeclaration(node) && hasExportKw(node)) {
      names.push(node.name.text);
    } else if (ts.isEnumDeclaration(node) && hasExportKw(node)) {
      names.push(node.name.text);
    } else if (ts.isVariableStatement(node) && hasExportKw(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.push(decl.name.text);
      }
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) names.push(el.name.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return [...new Set(names)];
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function resolveSpecifier(fromFile, spec) {
  if (spec.startsWith('@/')) return path.join(ROOT, spec.slice(2));
  if (spec.startsWith('.')) return path.resolve(path.dirname(fromFile), spec);
  return null;
}

function resolveToFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      // try next
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// File classification
// ---------------------------------------------------------------------------

function classifyFile(rel) {
  const parts = rel.split('/');
  const name = parts[parts.length - 1];
  const base = name.replace(/\.[^.]+$/, '');

  if (rel === 'middleware.ts') return 'Middleware';
  if (rel.startsWith('app/') && name === 'page.tsx') return 'Page';
  if (rel.startsWith('app/') && name === 'layout.tsx') return 'Layout';
  if (rel.startsWith('app/') && name === 'route.ts') return 'API Route';
  if (rel.startsWith('app/') && ['loading.tsx', 'error.tsx', 'not-found.tsx'].includes(name)) return 'Next.js';
  if (rel.startsWith('app/actions/')) return 'Server Action';
  if (rel.startsWith('lib/supabase/')) return 'Supabase';
  if (rel.startsWith('lib/3d/') && name !== 'index.ts') return '3D Pipeline';
  if (rel.startsWith('lib/stores/') && name !== 'index.ts') return 'Store';
  if (rel.startsWith('lib/utils/') && name !== 'index.ts') return 'Util';
  if (rel.startsWith('lib/constants/') && name !== 'index.ts') return 'Constant';
  if (base.startsWith('use-')) return 'Hook';
  if (name === 'types.ts') return 'Types';
  if (name === 'theme.ts' || name === 'cn.ts') return 'Util';
  if (name === 'index.ts' || name === 'index.tsx') return 'Barrel';
  if (rel.includes('/icons/')) return 'Icon';
  if (rel.includes('/canvas/')) return 'Canvas';
  if (rel.includes('/toolbar/') || name.includes('toolbar') || name.includes('tool-rail')) return 'Toolbar';
  if (rel.includes('/controls/')) return 'Control';
  if (rel.includes('/nav/')) return 'Nav';
  if (rel.includes('/sketch-constants')) return 'Constant';
  if (name.endsWith('.tsx')) return 'Component';
  return 'Module';
}

// ---------------------------------------------------------------------------
// Group key: 2-level for lib/, components/, app/
// ---------------------------------------------------------------------------

function groupKey(rel) {
  const parts = rel.split('/');
  if (parts.length === 1) return '.';
  if (parts.length >= 3 && (parts[0] === 'lib' || parts[0] === 'components' || parts[0] === 'app')) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

// ---------------------------------------------------------------------------
// Build dependency maps
// ---------------------------------------------------------------------------

const allFiles = SOURCE_ROOTS.flatMap((dir) => {
  const full = path.join(ROOT, dir);
  return fs.existsSync(full) ? collectFiles(full) : [];
});
for (const name of ROOT_FILES) {
  const full = path.join(ROOT, name);
  if (fs.existsSync(full)) allFiles.push(full);
}

const toRel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

const depMap = new Map();
const reverseMap = new Map();

for (const file of allFiles) {
  const rel = toRel(file);
  const internal = new Set();
  const external = new Set();

  for (const spec of extractImportSpecifiers(file)) {
    const resolved = resolveSpecifier(file, spec);
    if (!resolved) {
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      external.add(pkg);
    } else {
      const actual = resolveToFile(resolved);
      if (actual) {
        const relDep = toRel(actual);
        internal.add(relDep);
      }
    }
  }

  const exports = extractExports(file);
  const role = classifyFile(rel);
  depMap.set(rel, { internal, external, exports, role });

  for (const dep of internal) {
    if (!reverseMap.has(dep)) reverseMap.set(dep, new Set());
    reverseMap.get(dep).add(rel);
  }
}

// ---------------------------------------------------------------------------
// Module relationship analysis
// ---------------------------------------------------------------------------

function getModuleOwnership(rel) {
  return Object.entries(MODULE_DEFS)
    .filter(([, def]) => def.ownFiles.has(rel) || def.prefixes.some((p) => rel.startsWith(p + '/')))
    .map(([key]) => key);
}

const moduleImports = { sketch: new Set(), extract: new Set(), console: new Set() };
for (const [rel, { internal }] of depMap) {
  for (const mod of getModuleOwnership(rel)) {
    for (const dep of internal) moduleImports[mod].add(dep);
  }
}

function isUiShared(rel) {
  // Icon files anywhere in the tree are cosmetic regardless of which module they live in
  return UI_SHARED_EXACT.has(rel) || UI_SHARED_PREFIXES.some((p) => rel.startsWith(p)) || rel.includes('/icons/');
}

function sharedDepKind(rel) {
  if (isUiShared(rel)) return 'ui';
  if (rel.startsWith('lib/supabase/')) return 'supabase';
  if (rel.startsWith('app/api/')) return 'api';
  if (rel.startsWith('lib/stores/')) return 'state';
  return 'functional';
}

const allModuleDeps = new Set([
  ...moduleImports.sketch,
  ...moduleImports.extract,
  ...moduleImports.console,
]);

const sharedDeps = [];
for (const dep of allModuleDeps) {
  const usedByMods = Object.keys(moduleImports).filter((m) => moduleImports[m].has(dep));
  if (usedByMods.length < 2) continue;
  sharedDeps.push({ dep, usedBy: usedByMods, kind: sharedDepKind(dep) });
}

const kindOrder = { functional: 0, state: 1, supabase: 2, api: 3, ui: 4 };
sharedDeps.sort((a, b) => (kindOrder[a.kind] ?? 5) - (kindOrder[b.kind] ?? 5) || a.dep.localeCompare(b.dep));

const functionalShared = sharedDeps.filter((d) => d.kind === 'functional');
const stateShared = sharedDeps.filter((d) => d.kind === 'state');
const supabaseShared = sharedDeps.filter((d) => d.kind === 'supabase');
const uiShared = sharedDeps.filter((d) => d.kind === 'ui');

const moduleExclusive = {};
for (const mod of Object.keys(MODULE_DEFS)) {
  moduleExclusive[mod] = [...moduleImports[mod]]
    .filter((dep) => {
      const usedByMods = Object.keys(moduleImports).filter((m) => moduleImports[m].has(dep));
      if (usedByMods.length > 1) return false;
      const ownership = getModuleOwnership(dep);
      if (ownership.includes(mod)) return false;
      if (isUiShared(dep)) return false;
      return true;
    })
    .sort();
}

// ---------------------------------------------------------------------------
// Icon leaf detection
// ---------------------------------------------------------------------------

function isLeafIcon(rel) {
  if (!rel.includes('/icons/')) return false;
  const entry = depMap.get(rel);
  if (!entry || entry.role !== 'Icon') return false;
  const internalArr = [...entry.internal];
  return internalArr.length <= 1 && internalArr.every((d) => d === 'lib/constants/icons.ts');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const topDir = (rel) => (rel.includes('/') ? rel.split('/')[0] : '.');

function modTags(rel) {
  const mods = getModuleOwnership(rel);
  return mods.length ? ` _(${mods.join(', ')})_` : '';
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

const now = new Date().toISOString().slice(0, 10);
const L = [];
const push = (...lines) => L.push(...lines);
const blank = () => L.push('');

push('# Architecture Map');
blank();
push(`_Generated ${now} — run \`npm run arch\` to refresh._`);
blank();
push('> Auto-generated. Do not edit by hand.');
push('> Maps source files to roles, imports, exports, and reverse dependents.');
blank();
push('## Contents');
blank();
push('1. [Module Overview](#module-overview)');
push('2. [Module Relationships](#module-relationships)');
push('3. [Pages & Routes](#pages--routes)');
push('4. [File Index](#file-index)');
push('5. [Hot Modules](#hot-modules)');
push('6. [Cross-cutting Dependencies](#cross-cutting-dependencies)');
blank();

// ── 1. Module Overview -------------------------------------------------------
push('## Module Overview');
blank();

const groupCounts = new Map();
for (const rel of depMap.keys()) {
  const g = groupKey(rel);
  groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
}

const groupDescriptions = {
  '.': 'Root — Next.js middleware',
  'app/sketch': 'Sketch page',
  'app/extract': 'Extract page',
  'app/console': 'Console page',
  'app/actions': 'Server actions (auth)',
  'app/api': 'API Route Handlers (Supabase storage bridge)',
  'app/auth': 'Auth callback',
  'app/login': 'Login page',
  'app/register': 'Register page',
  'app/docs': 'Docs page',
  app: 'Root app files (layout, error, globals)',
  'components/sketch': 'Sketch-specific components (canvas, toolbar, body-thumbnail)',
  'components/extract': 'Extract-specific components (pose canvas, icons)',
  'components/console': 'Console-specific components (animation canvas, toolbar, controls)',
  'components/shared': 'Shared UI chrome (toolbar, icons, nav)',
  hooks: 'Custom React hooks — one per module + shared SVG cache',
  lib: 'Top-level lib files (types, theme, cn)',
  'lib/3d': '3D pipeline — coordinate transforms, part transforms, scene orchestration',
  'lib/stores': 'Zustand stores — landmarks, scale factors, shift factors',
  'lib/utils': 'Pure utility functions — frame processing, SVG rendering, anchor math',
  'lib/constants': 'Domain constants — body parts, anchor map, landmark names, sizes',
  'lib/supabase': 'Supabase clients — server, admin, browser, middleware',
  'lib/storage': 'Storage barrel (empty — utilities imported directly)',
};

push('| Group | Files | Description |');
push('|-------|-------|-------------|');
for (const [g, count] of [...groupCounts.entries()].sort()) {
  const desc = groupDescriptions[g] ?? '';
  push(`| \`${g}/\` | ${count} | ${desc} |`);
}
blank();

// ── 2. Module Relationships --------------------------------------------------
push('## Module Relationships');
blank();
push('Sketch, Extract, and Console are architecturally isolated by page, components, and hooks.');
push('They communicate exclusively through Supabase storage — there is no direct React state sharing.');
blank();

push('### Boundaries');
blank();
push('| Module | Purpose | Owns |');
push('|--------|---------|------|');
for (const [key, def] of Object.entries(MODULE_DEFS)) {
  const ownList = [...def.prefixes, ...[...def.ownFiles]].join(', ');
  push(`| **${def.label}** | ${def.desc} | \`${ownList}\` |`);
}
blank();

push('### Storage Bridge');
blank();
push('Module communication happens via API route fetch calls — not in the import graph.');
blank();
push('| Producer | Route | Consumer |');
push('|----------|-------|----------|');
push('| Extract | `POST /api/storage/landmarks` | Console (reads via `GET`) |');
push('| Sketch | `POST /api/storage/upload` | Console (reads via `GET`) |');
push('| Console | `POST /api/storage/animations` | Console (reads back) |');
push('| — | `GET /api/storage/files`, `/list` | Console (file listing) |');
blank();

push('### Functionally Shared (real logic, not just UI)');
blank();
if (functionalShared.length > 0) {
  push('| File | Role | Used by | Exports |');
  push('|------|------|---------|---------|');
  for (const { dep, usedBy } of functionalShared) {
    const { role, exports } = depMap.get(dep) ?? {};
    const expStr = exports?.length ? exports.join(', ') : '—';
    push(`| \`${dep}\` | ${role ?? ''} | ${usedBy.join(', ')} | ${expStr} |`);
  }
  blank();
} else {
  push('_None — modules share no functional logic._');
  blank();
}

if (stateShared.length > 0) {
  push('### Shared State');
  blank();
  push('| File | Used by | Exports |');
  push('|------|---------|---------|');
  for (const { dep, usedBy } of stateShared) {
    const { exports } = depMap.get(dep) ?? {};
    const expStr = exports?.length ? exports.join(', ') : '—';
    push(`| \`${dep}\` | ${usedBy.join(', ')} | ${expStr} |`);
  }
  blank();
}

if (supabaseShared.length > 0) {
  push('### Shared Supabase Clients');
  blank();
  push('| File | Used by |');
  push('|------|---------|');
  for (const { dep, usedBy } of supabaseShared) {
    push(`| \`${dep}\` | ${usedBy.join(', ')} |`);
  }
  blank();
}

if (uiShared.length > 0) {
  push('### Shared UI (cosmetic — toolbar chrome, icons, nav)');
  blank();
  const seen = new Set();
  for (const { dep, usedBy } of uiShared) {
    // Group by parent directory for files, or first 3 segments for deeper paths.
    // Exact entries (lib/constants/icons.ts) always shown as-is.
    let displayKey;
    if (UI_SHARED_EXACT.has(dep)) {
      displayKey = dep;
    } else {
      const parts = dep.split('/');
      const lastName = parts[parts.length - 1];
      displayKey = lastName.includes('.')
        ? parts.slice(0, -1).join('/') + '/…'
        : parts.slice(0, 3).join('/') + '/…';
    }
    if (seen.has(displayKey)) continue;
    seen.add(displayKey);
    push(`- \`${displayKey}\` — ${usedBy.join(', ')}`);
  }
  blank();
}

push('### Module-Exclusive Dependencies');
blank();
push('Deps imported by exactly one module (no cross-module coupling):');
blank();
push('| Module | Exclusive dependencies |');
push('|--------|------------------------|');
for (const [mod, deps] of Object.entries(moduleExclusive)) {
  const label = MODULE_DEFS[mod].label;
  const depsStr = deps.length ? deps.map((d) => `\`${d}\``).join(', ') : '_none_';
  push(`| ${label} | ${depsStr} |`);
}
blank();

push('### Verdict');
blank();
push('The modules are well-isolated at the component and hook level.');
blank();
push('**Shared:**');
blank();
push('- **UI chrome** (`components/shared/`, icon files) — cosmetic; expected.');
const pipelineUtils = functionalShared.filter((d) => d.dep.startsWith('lib/utils/'));
const typesDeps = functionalShared.filter((d) => d.dep.endsWith('/types.ts') || d.dep === 'lib/types.ts');
const otherFunctional = functionalShared.filter(
  (d) => !pipelineUtils.includes(d) && !typesDeps.includes(d),
);
if (typesDeps.length > 0) {
  const names = typesDeps.map((d) => `\`${d.dep}\``).join(', ');
  push(`- **Core types** — ${names}: domain type library (LandmarkFrame, AnchorsMap, ShiftFactors, …). All modules depend on it.`);
}
if (pipelineUtils.length > 0) {
  const list = pipelineUtils.map((d) => `\`${d.dep}\``).join(', ');
  push(`- **Frame-processing pipeline** — ${list} are shared between Extract and Console.`);
  push('  Console re-processes the same landmark data Extract produces. Intentional pipeline reuse, not accidental coupling.');
}
if (otherFunctional.length > 0) {
  const list = otherFunctional.map((d) => `\`${d.dep}\` (${d.usedBy.join(' + ')})`).join('; ');
  push(`- **Other shared logic** — ${list}.`);
}
blank();
push('**Not shared (each module owns these exclusively):**');
blank();
for (const [mod, deps] of Object.entries(moduleExclusive)) {
  if (deps.length === 0) continue;
  push(`- **${MODULE_DEFS[mod].label}**: ${deps.map((d) => `\`${d}\``).join(', ')}`);
}
blank();

// ── 3. Pages & Routes -------------------------------------------------------
push('## Pages & Routes');
blank();
push('| Route | File | Type |');
push('|-------|------|------|');
for (const [rel, { role }] of [...depMap.entries()].sort()) {
  // Server Actions are not HTTP routes — exclude them
  if (!['Page', 'Layout', 'API Route', 'Next.js'].includes(role)) continue;
  let route = rel
    .replace(/^app/, '')
    .replace(/\/(page|layout|route)\.tsx?$/, '')
    .replace(/\/(error|loading|not-found)\.tsx?$/, '');
  if (route === '' || route === '/') route = '/';
  else if (!route.startsWith('/')) route = '/' + route;
  push(`| \`${route}\` | \`${rel}\` | ${role} |`);
}
blank();

// ── 4. File Index -----------------------------------------------------------
push('## File Index');
blank();
push('Grouped by sub-module. `[Role]` | exports | imports | imported by.');
push('Icon leaf files are collapsed into a directory summary.');
blank();

const groups = new Map();
for (const rel of [...depMap.keys()].sort()) {
  const g = groupKey(rel);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(rel);
}

for (const [group, files] of [...groups.entries()].sort()) {
  const count = files.length;
  push(`### \`${group}/\` (${count} files)`);
  blank();

  const leafIcons = files.filter(isLeafIcon);
  const normalFiles = files.filter((f) => !isLeafIcon(f));

  for (const rel of normalFiles) {
    const { internal, external, exports, role } = depMap.get(rel);
    const importedBy = reverseMap.get(rel);
    const roleTag = role ? ` \`[${role}]\`` : '';
    const modTag = modTags(rel);

    push(`#### \`${rel}\`${roleTag}${modTag}`);

    if (exports.length > 0) {
      push('');
      push(`exports: ${exports.join(', ')}`);
    }
    if (internal.size > 0) {
      push('');
      push('imports:');
      for (const dep of [...internal].sort()) push(`- \`${dep}\``);
    }
    if (external.size > 0) {
      push('');
      push(`packages: ${[...external].sort().join(', ')}`);
    }
    if (importedBy && importedBy.size > 0) {
      push('');
      push('imported by:');
      for (const imp of [...importedBy].sort()) push(`- \`${imp}\``);
    }
    blank();
  }

  if (leafIcons.length > 0) {
    const iconDir = leafIcons[0].split('/').slice(0, -1).join('/');
    const useLucide = leafIcons.some((f) => depMap.get(f)?.external.has('lucide-react'));
    const names = leafIcons.map((f) => path.basename(f)).join(', ');
    push(`**\`${iconDir}/\`** — ${leafIcons.length} icon components \`[Icon]\``);
    blank();
    push(`All import \`lib/constants/icons.ts\`${useLucide ? ' and/or `lucide-react`' : ''}. Files: ${names}`);
    blank();
  }
}

// ── 5. Hot Modules -----------------------------------------------------------
push('## Hot Modules');
blank();
push('Top 25 most-imported files. High importer count = high coupling risk if the file changes.');
blank();

const hotModules = [...reverseMap.entries()]
  .map(([rel, importers]) => ({ rel, count: importers.size }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 25);

push('| # | File | Role | Importers | Exports |');
push('|---|------|------|-----------|---------|');
for (let i = 0; i < hotModules.length; i++) {
  const { rel, count } = hotModules[i];
  const { role, exports } = depMap.get(rel) ?? {};
  const expStr = exports?.length ? exports.join(', ') : '—';
  push(`| ${i + 1} | \`${rel}\` | ${role ?? ''} | ${count} | ${expStr} |`);
}
blank();

// ── 6. Cross-cutting Dependencies --------------------------------------------
push('## Cross-cutting Dependencies');
blank();
push('Files imported from more than one top-level source group:');
blank();

const crossCutting = [...reverseMap.entries()]
  .map(([rel, importers]) => {
    const dirs = new Set([...importers].map(topDir));
    return { rel, importers, dirs };
  })
  .filter(({ dirs }) => dirs.size > 1)
  .sort((a, b) => b.dirs.size - a.dirs.size || b.importers.size - a.importers.size);

if (crossCutting.length === 0) {
  push('_None detected._');
} else {
  push('| File | Role | Top-level groups | Importers |');
  push('|------|------|------------------|-----------|');
  for (const { rel, importers, dirs } of crossCutting) {
    const { role } = depMap.get(rel) ?? {};
    const dirList = [...dirs].sort().join(', ');
    push(`| \`${rel}\` | ${role ?? ''} | ${dirList} | ${importers.size} |`);
  }
}
blank();
push('---');
blank();
push(`_${depMap.size} files indexed._`);
blank();

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, L.join('\n'), 'utf8');
console.log(`✓ docs/architecture.md written (${depMap.size} files, ${sharedDeps.length} shared deps)`);
