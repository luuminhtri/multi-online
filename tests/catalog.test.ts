import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROLE_CATALOG, isImplementedRole, roleCoverage } from '../src/catalog/roles.ts';
import { ROLE_IMAGES } from '../src/catalog/images.ts';
import { ROLES, RULES } from '../src/engine/rules.ts';
import { createGame, dispatch, RuleError, stepId } from '../src/engine/engine.ts';

test('catalog maps every source record exactly once as main and preserves repaired source names', () => {
  const data = JSON.parse(readFileSync(new URL('../cards.json', import.meta.url), 'utf8'));
  const keys = new Set<string>();
  for (const [group, value] of Object.entries(data) as [string, { 'Deck of cards': Record<string, unknown> }][]) {
    for (const name of Object.keys(value['Deck of cards'])) {
      const main = ROLE_CATALOG.filter(r => r.source?.group === group && r.source.name === name && r.source.section === 'main');
      assert.equal(main.length, 1, `${group}/${name}`);
      keys.add(JSON.stringify([group, name]));
    }
  }
  for (const role of ROLE_CATALOG) if (role.source) assert.ok(keys.has(JSON.stringify([role.source.group, role.source.name])));
  assert.equal(keys.size, 64);
  assert.equal(ROLE_CATALOG.length, 64); // One validated HTML section per source role
  assert.equal(new Set(ROLE_CATALOG.map(r => r.id)).size, 64);
  for (const id of Object.keys(ROLES)) assert.ok(ROLE_CATALOG.some(r => r.id === id));
});

test('catalog metadata never enables unimplemented roles and does not expose mutable entries', () => {
  const coverage = roleCoverage();
  assert.equal(coverage.filter(r => r.implemented).length, 27);
  for (const r of coverage.filter(r => !r.implemented)) {
    assert.equal(isImplementedRole(r.id), false);
    assert.throws(() => createGame('bad', [
      { id: 'w', name: 'w', role: 'wolf' }, { id: 'a', name: 'a', role: 'villager' },
      { id: 'x', name: 'x', role: r.id as never },
    ]), (e: unknown) => e instanceof RuleError && e.code === 'INVALID_PLAYER');
  }
  coverage[0].notes.push('mutated');
  assert.ok(!ROLE_CATALOG[0].notes.includes('mutated'));
});

test('new schema is validated; v5 snapshot is not silently migrated', () => {
  const g = createGame('schema', [{ id: 'w', name: 'w', role: 'wolf' }, { id: 'a', name: 'a', role: 'villager' }, { id: 'b', name: 'b', role: 'villager' }]);
  const request = { id: 's', gameId: g.id, stepId: stepId(g), command: { type: 'advance' } as const };
  g.rulesVersion = 'classic-core-v5';
  assert.throws(() => dispatch(g, { kind: 'moderator' }, request), (e: unknown) => e instanceof RuleError && e.code === 'UNSUPPORTED_RULES_VERSION');
  g.rulesVersion = RULES.version;
  (g as unknown as {schemaVersion: number}).schemaVersion = 999;
  assert.throws(() => dispatch(g, { kind: 'moderator' }, request), (e: unknown) => e instanceof RuleError && e.code === 'UNSUPPORTED_SCHEMA_VERSION');
});

test('generated image map covers every source role and matches cards.json exactly', () => {
  const data = JSON.parse(readFileSync(new URL('../cards.json', import.meta.url), 'utf8'));
  for (const role of ROLE_CATALOG) {
    const expected = data[role.source.group]['Deck of cards'][role.source.name]['Image Url'];
    assert.equal(ROLE_IMAGES[role.id], expected, role.id);
  }
  assert.equal(Object.keys(ROLE_IMAGES).length, 64);
});

test('saved HTML extraction reproduces all card descriptions and image URLs', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { createHash } = await import('node:crypto');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync('python3', ['beauti.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  const report = JSON.parse(result.stdout);
  assert.equal(report.totalRoles, 64);
  assert.deepEqual(report.changes, { added: [], removed: [], changed: [] });
  const audit = JSON.parse(readFileSync(new URL('../docs/data-audit.json', import.meta.url), 'utf8'));
  const html = readFileSync(new URL('../response.html', import.meta.url));
  assert.equal(createHash('sha256').update(html).digest('hex'), audit.sourceSha256);
  assert.equal(audit.locations.length, 64);
  assert.deepEqual(new Set(audit.locations.map((r: { group: string; name: string }) => JSON.stringify([r.group, r.name]))),
    new Set(ROLE_CATALOG.map(r => JSON.stringify([r.source.group, r.source.name]))));
});


test('display catalog descriptions preserve cards.json verbatim for all supported roles', async () => {
  const { supportedCatalog } = await import('../src/server/rooms.ts');
  const { ROLE_DESCRIPTIONS } = await import('../src/catalog/descriptions.ts');
  const data = JSON.parse(readFileSync(new URL('../cards.json', import.meta.url), 'utf8'));
  for (const entry of ROLE_CATALOG) assert.equal(ROLE_DESCRIPTIONS[entry.id], data[entry.source.group]['Deck of cards'][entry.source.name].Description, entry.id);
  for (const role of supportedCatalog()) assert.equal(role.description, ROLE_DESCRIPTIONS[role.id], role.id);
});
