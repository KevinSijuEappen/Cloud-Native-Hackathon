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
  eventId?: string;
  here?: string;
};

export type SearchHit = ({ kind: 'event' } & EventItem) | ({ kind: 'contact' } & DirectoryContact);

const CONTACTS: DirectoryContact[] = [
  { id: 'c1', name: 'Mina Cho', jobTitle: 'Product designer', company: 'Northwind', interests: 'Design systems, tokens, product', situation: 'working', source: 'seed' },
  { id: 'c2', name: 'Andre Walsh', jobTitle: 'Platform engineer', company: 'Harbor', interests: 'Kubernetes, cloud native, engineering', situation: 'working', source: 'seed' },
  { id: 'c3', name: 'Priya Nair', jobTitle: 'Computer science', company: 'University of Utah', interests: 'AI, startups', situation: 'student', source: 'seed' },
  { id: 'c4', name: 'Luis Ortega', jobTitle: 'Founding engineer', company: '', interests: 'Indie products, community, founders', situation: 'looking', source: 'seed' },
];

const FLOOR: DirectoryContact[] = [
  { id: 'f1', name: 'Sasha Nguyen', jobTitle: 'iOS engineer', company: 'Lumen', interests: 'Mobile, React Native', situation: 'working', source: 'floor', eventId: '5', here: 'By the stage' },
  { id: 'f2', name: 'Jonah Ellis', jobTitle: 'Founder', company: 'Northline', interests: 'Devtools, hiring', situation: 'working', source: 'floor', eventId: '5', here: 'Coffee bar' },
  { id: 'f3', name: 'Amina Farouk', jobTitle: 'Design engineer', company: 'Keel', interests: 'Interfaces, motion', situation: 'working', source: 'floor', eventId: '5', here: 'Workshop room' },
  { id: 'f4', name: 'Elena Voss', jobTitle: 'Community lead', company: 'Convergence', interests: 'People, events, introductions', situation: 'working', source: 'floor', eventId: '5', here: 'Registration' },
];

const created: DirectoryContact[] = [];

export function peopleAt(eventId: string): DirectoryContact[] {
  return [...created.filter((contact) => contact.eventId === eventId), ...FLOOR.filter((contact) => contact.eventId === eventId)];
}

export async function createContact(input: { name: string; jobTitle: string; eventId: string }): Promise<DirectoryContact> {
  const contact: DirectoryContact = {
    id: `floor-${Date.now()}`,
    name: input.name.trim(),
    jobTitle: input.jobTitle.trim(),
    company: '',
    interests: input.jobTitle.trim(),
    situation: 'working',
    source: 'floor',
    eventId: input.eventId,
    here: 'Here now',
  };
  created.unshift(contact);
  if (CLOUD_URL && API_KEY) {
    try {
      await fetch(`${CLOUD_URL}/contacts/_doc/${encodeURIComponent(contact.id)}`, {
        method: 'PUT',
        headers: {
          Authorization: `ApiKey ${API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(contact),
      });
    } catch {
      // The contact stays on this phone if the cloud does not answer.
    }
  }
  return contact;
}

const searchFields = ['name^3', 'topic^2', 'place', 'blurb', 'highlights', 'jobTitle^2', 'company', 'interests^2'];

export function localHits(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const events = EVENTS.filter((event) => includesAny(needle, [event.name, event.place, event.topic, event.blurb, event.highlights.join(' ')]))
    .map((event) => ({ kind: 'event' as const, ...event }));
  const contacts = [...created, ...FLOOR, ...CONTACTS].filter((contact) => includesAny(needle, [contact.name, contact.jobTitle, contact.company, contact.interests, contact.situation, contact.here ?? '']))
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
