export type EventItem = {
  id: string;
  name: string;
  place: string;
  date: string;
  topic: string;
  blurb: string;
  highlights: string[];
  color: string;
  x: number;
  y: number;
};

export const EVENTS: EventItem[] = [
  {
    id: '1',
    name: 'Cloud Native Summit',
    place: 'Salt Lake City',
    date: 'Nov 12–14',
    topic: 'Cloud · Engineering',
    blurb: 'Three days of platform talks, hallway tracks, and the people shipping them.',
    highlights: ['Opening keynote · Nov 12, 9:00 AM', 'Platform engineering track', 'Evening meetup at the venue'],
    color: '#71d7ff',
    x: 22,
    y: 26,
  },
  {
    id: '2',
    name: 'Design Systems Orbit',
    place: 'Online',
    date: 'Nov 18',
    topic: 'Design · Product',
    blurb: 'A one-day remote session on tokens, component APIs, and keeping design and engineering in sync.',
    highlights: ['Live critique · 11:00 AM', 'Office hours with maintainers'],
    color: '#c79bff',
    x: 69,
    y: 34,
  },
  {
    id: '3',
    name: 'Frontier AI Forum',
    place: 'San Francisco',
    date: 'Nov 21–22',
    topic: 'AI · Startups',
    blurb: 'Founders, researchers, and engineers comparing what actually ships in applied AI.',
    highlights: ['Demo floor all day', 'Lightning talks · Nov 21, 3:00 PM'],
    color: '#ffb66d',
    x: 29,
    y: 59,
  },
  {
    id: '4',
    name: 'Indie Makers Meetup',
    place: 'Denver',
    date: 'Nov 26',
    topic: 'Community · Founders',
    blurb: 'A small evening meetup for people shipping their own products and looking for collaborators.',
    highlights: ['Show and tell · 6:30 PM', 'Open coworking after'],
    color: '#ff7da8',
    x: 73,
    y: 68,
  },
  {
    id: '5',
    name: 'Live Floor',
    place: 'Salt Lake City',
    date: 'Nov 9–10',
    topic: 'People · Now',
    blurb: 'The floor is open right now. See who is here and keep the people you want to meet again.',
    highlights: ['8:30 AM · Doors open', '10:00 AM · Hallway track', 'All day · Open floor', '4:00 PM · Meet people in the room'],
    color: '#8fd18a',
    x: 48,
    y: 46,
  },
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export type CountdownParts = { days: number; hours: number; minutes: number };

export function countdownParts(date: string, now = new Date()): CountdownParts {
  const span = eventWindow(date, now);
  if (!span) return { days: 0, hours: 0, minutes: 0 };
  const target = now < span.start ? span.start : span.end;
  const minutesLeft = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
  return {
    days: Math.floor(minutesLeft / 1440),
    hours: Math.floor((minutesLeft % 1440) / 60),
    minutes: minutesLeft % 60,
  };
}

export function isHappening(date: string, now = new Date()): boolean {
  const span = eventWindow(date, now);
  return !!span && now >= span.start && now < span.end;
}

function eventWindow(date: string, now: Date): { start: Date; end: Date } | null {
  const match = date.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
  const startDay = Number(match[2]);
  const endDay = match[3] ? Number(match[3]) : startDay;
  if (month < 0 || !startDay || !endDay) return null;
  let year = now.getFullYear();
  if (new Date(year, month, endDay + 1).getTime() < now.getTime() - 20 * 86400000) year += 1;
  return {
    start: new Date(year, month, startDay),
    end: new Date(year, month, endDay + 1),
  };
}
