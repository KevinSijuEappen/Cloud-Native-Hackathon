import { EVENTS, type EventItem } from '../journey/events';

const CLOUD_URL = (process.env.EXPO_PUBLIC_ELASTICSEARCH_URL ?? '').replace(/\/$/, '');
const API_KEY = process.env.EXPO_PUBLIC_ELASTICSEARCH_API_KEY ?? '';

export type DirectoryContact = {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  interests: string;
  situation: string;
  source: string;
};

export type SearchHit = ({ kind: 'event' } & EventItem) | ({ kind: 'contact' } & DirectoryContact);

const CONTACTS: DirectoryContact[] = [
  { id: 'c1', name: 'Mina Cho', jobTitle: 'Product designer', company: 'Northwind', interests: 'Design systems, tokens, product', situation: 'working', source: 'seed' },
  { id: 'c2', name: 'Andre Walsh', jobTitle: 'Platform engineer', company: 'Harbor', interests: 'Kubernetes, cloud native, engineering', situation: 'working', source: 'seed' },
  { id: 'c3', name: 'Priya Nair', jobTitle: 'Computer science', company: 'University of Utah', interests: 'AI, startups', situation: 'student', source: 'seed' },
  { id: 'c4', name: 'Luis Ortega', jobTitle: 'Founding engineer', company: '', interests: 'Indie products, community, founders', situation: 'looking', source: 'seed' },
];

const searchFields = ['name^3', 'topic^2', 'place', 'blurb', 'highlights', 'jobTitle^2', 'company', 'interests^2'];

export function localHits(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const events = EVENTS.filter((event) => includesAny(needle, [event.name, event.place, event.topic, event.blurb, event.highlights.join(' ')]))
    .map((event) => ({ kind: 'event' as const, ...event }));
  const contacts = CONTACTS.filter((contact) => includesAny(needle, [contact.name, contact.jobTitle, contact.company, contact.interests, contact.situation]))
    .map((contact) => ({ kind: 'contact' as const, ...contact }));
  return [...events, ...contacts];
}

export async function fetchEvents(): Promise<EventItem[]> {
  const hits = await searchIndex('events', { match_all: {} }, 100);
  return hits.filter((hit) => hit.kind === 'event');
}

export async function searchDirectory(query: string, kind?: 'event' | 'contact'): Promise<SearchHit[]> {
  const index = kind === 'event' ? 'events' : kind === 'contact' ? 'contacts' : 'events,contacts';
  return searchIndex(index, {
    multi_match: { query, fields: searchFields, fuzziness: 'AUTO' },
  }, 20);
}

async function searchIndex(index: string, query: object, size: number): Promise<SearchHit[]> {
  const response = await request(`/${index}/_search`, { size, query });
  const body = await response.json() as { hits?: { hits?: EsHit[] } };
  if (!response.ok) throw new Error('Search failed.');
  return (body.hits?.hits ?? []).map(toHit);
}

function request(path: string, body: object) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const attempt = fetch(`${CLOUD_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  const timeout = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error('Search timed out.')), 8000);
  });
  return Promise.race([attempt, timeout]);
}

type EsHit = { _id: string; _index: string; _source: Record<string, unknown> };

function toHit(hit: EsHit): SearchHit {
  const kind = hit._index.startsWith('contacts') ? 'contact' : 'event';
  return { kind, id: hit._id, ...hit._source } as SearchHit;
}

function includesAny(needle: string, values: string[]) {
  return values.join(' ').toLowerCase().includes(needle);
}
