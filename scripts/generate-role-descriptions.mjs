// Verbatim card display copy. Does not change engine rules or source data.
import { readFileSync, writeFileSync } from 'node:fs';
import { ROLE_CATALOG } from '../src/catalog/roles.ts';
const root = new URL('../', import.meta.url);
const cards = JSON.parse(readFileSync(new URL('cards.json', root), 'utf8'));
const descriptions = {};
for (const entry of ROLE_CATALOG) {
  const description = cards[entry.source.group]?.['Deck of cards']?.[entry.source.name]?.Description;
  if (typeof description !== 'string') throw new Error(`Missing Description: ${entry.id}`);
  descriptions[entry.id] = description;
}
writeFileSync(new URL('src/catalog/descriptions.ts', root), '// Generated from cards.json by scripts/generate-role-descriptions.mjs. Do not edit.\nexport const ROLE_DESCRIPTIONS: Record<string, string> = '+JSON.stringify(descriptions, null, 2)+';\n');
console.log(`Đã ghi ${Object.keys(descriptions).length} mô tả nguyên văn.`);
