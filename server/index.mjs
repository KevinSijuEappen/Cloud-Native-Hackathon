import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@elastic/elasticsearch';
import { CONTACTS, EVENTS } from './data.mjs';

loadEnv(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'));

const url = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.ELASTICSEARCH_API_KEY;
const client = new Client({
  node: url,
  ...(apiKey ? { auth: { apiKey } } : {}),
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

const searchFields = ['name^3', 'topic^2', 'place', 'blurb', 'highlights', 'jobTitle^2', 'company', 'interests^2'];

async function ensureIndex(index, mappings) {
  const exists = await client.indices.exists({ index });
  if (!exists) await client.indices.create({ index, mappings });
}

async function seed(index, docs) {
  const count = await client.count({ index });
  if (count.count > 0) return;
  await client.bulk({
    refresh: 'wait_for',
    operations: docs.flatMap((doc) => [
      { index: { _index: index, _id: doc.id } },
      doc,
    ]),
  });
}

async function ready() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await client.ping();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Elasticsearch is not running at ${url}`);
}

function send(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Expected JSON.'));
      }
    });
    request.on('error', reject);
  });
}

async function list(index) {
  const result = await client.search({
    index,
    size: 100,
    query: { match_all: {} },
  });
  return result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source }));
}

async function search(q, kind) {
  const index = kind === 'event' ? 'events' : kind === 'contact' ? 'contacts' : 'events,contacts';
  const result = await client.search({
    index,
    size: 20,
    query: {
      multi_match: {
        query: q,
        fields: searchFields,
        fuzziness: 'AUTO',
      },
    },
  });
  return result.hits.hits.map((hit) => ({
    kind: hit._index === 'contacts' ? 'contact' : 'event',
    id: hit._id,
    ...hit._source,
  }));
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }

  try {
    const location = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const parts = location.pathname.split('/').filter(Boolean);

    if (request.method === 'GET' && location.pathname === '/health') {
      await client.ping();
      send(response, 200, { ok: true });
      return;
    }

    if (request.method === 'GET' && location.pathname === '/search') {
      const q = location.searchParams.get('q')?.trim() ?? '';
      const kind = location.searchParams.get('kind');
      if (!q) {
        send(response, 200, []);
        return;
      }
      if (kind && kind !== 'event' && kind !== 'contact') {
        send(response, 400, { error: 'kind must be event or contact.' });
        return;
      }
      send(response, 200, await search(q, kind));
      return;
    }

    if (parts.length === 1 && (parts[0] === 'events' || parts[0] === 'contacts') && request.method === 'GET') {
      send(response, 200, await list(parts[0]));
      return;
    }

    if (parts.length === 2 && (parts[0] === 'events' || parts[0] === 'contacts')) {
      const [index, id] = parts;
      if (request.method === 'GET') {
        const doc = await client.get({ index, id });
        send(response, 200, { id: doc._id, ...doc._source });
        return;
      }
      if (request.method === 'PUT') {
        const body = await readBody(request);
        if (!body.name || typeof body.name !== 'string') {
          send(response, 400, { error: 'A name is required.' });
          return;
        }
        const document = { ...body, id };
        await client.index({ index, id, document, refresh: 'wait_for' });
        send(response, 200, document);
        return;
      }
      if (request.method === 'DELETE' && index === 'contacts') {
        await client.delete({ index, id, refresh: 'wait_for' });
        send(response, 200, { id, deleted: true });
        return;
      }
    }

    send(response, 404, { error: 'Not found.' });
  } catch (error) {
    const missing = error?.meta?.statusCode === 404;
    send(response, missing ? 404 : 500, { error: missing ? 'Not found.' : 'Database request failed.' });
  }
});

await ready();
await ensureIndex('events', eventMapping);
await ensureIndex('contacts', contactMapping);
await seed('events', EVENTS);
await seed('contacts', CONTACTS);
server.listen(port, () => {
  console.log(`Search API at http://localhost:${port}`);
  console.log(`Elasticsearch at ${url}`);
});

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
