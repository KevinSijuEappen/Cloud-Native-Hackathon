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
];
