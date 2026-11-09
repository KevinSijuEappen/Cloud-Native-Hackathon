import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@elastic/elasticsearch';
import { CONTACTS, EVENTS } from './data.mjs';

loadEnv(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'));

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY ?? '' },
});

const eventMapping = {
  properties: {
    name: { type: 'text' },
    place: { type: 'text' },
    date: { type: 'keyword' },
    topic: { type: 'text' },
    blurb: { type: 'text' },
    highlights: { type: 'text' },
    color: { type: 'keyword', index: false },
    x: { type: 'float', index: false },
    y: { type: 'float', index: false },
  },
};

const contactMapping = {
  properties: {
    name: { type: 'text' },
    jobTitle: { type: 'text' },
    company: { type: 'text' },
    interests: { type: 'text' },
    situation: { type: 'keyword' },
    source: { type: 'keyword' },
  },
};

await ensure('events', eventMapping);
await ensure('contacts', contactMapping);
await upsert('events', EVENTS);
await upsert('contacts', CONTACTS);
const check = await client.search({
  index: 'events,contacts',
  size: 5,
  query: { multi_match: { query: 'design', fields: ['name', 'topic', 'interests', 'jobTitle'] } },
});
console.log(check.hits.hits.map((hit) => `${hit._index}: ${hit._source.name}`).join('\n'));

async function ensure(index, mappings) {
  const exists = await client.indices.exists({ index });
  if (!exists) await client.indices.create({ index, mappings });
}

async function upsert(index, docs) {
  await client.bulk({
    refresh: 'wait_for',
    operations: docs.flatMap((doc) => [
      { index: { _index: index, _id: doc.id } },
      doc,
    ]),
  });
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
