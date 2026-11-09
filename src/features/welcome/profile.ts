export type ContactProfile = {
  welcomeComplete: boolean;
  jobTitle: string;
  company: string;
  interests: string;
};

export type WorkSituation = 'working' | 'student' | 'looking';
export type AttendanceRole = 'attending' | 'presenting';

export type AttendeeProfile = {
  situation: WorkSituation;
  jobTitle: string;
  interests: string;
};

export type EventPlan = {
  eventId: string;
  eventName: string;
  role: AttendanceRole;
  room: string;
  time: string;
};

export const EMPTY_PROFILE: ContactProfile = {
  welcomeComplete: false,
  jobTitle: '',
  company: '',
  interests: '',
};

export const SITUATION_LABEL: Record<WorkSituation, string> = {
  working: 'Working',
  student: 'Student',
  looking: 'Looking to be hired',
};

export function titleLabel(situation: WorkSituation): string {
  if (situation === 'student') return 'What you study';
  if (situation === 'looking') return 'Role you want';
  return 'Job title';
}

export function readContactProfile(metadata: unknown): ContactProfile | null {
  const saved = readRecord(metadata)?.contactProfile;
  if (!isRecord(saved) || saved.welcomeComplete !== true) return null;
  return {
    welcomeComplete: true,
    jobTitle: readString(saved.jobTitle),
    company: readString(saved.company),
    interests: readString(saved.interests),
  };
}

export function readStoredAttendee(metadata: unknown): AttendeeProfile | null {
  const saved = readRecord(metadata)?.attendeeProfile;
  if (!isRecord(saved) || !isSituation(saved.situation)) return null;
  const profile = {
    situation: saved.situation,
    jobTitle: readString(saved.jobTitle),
    interests: readString(saved.interests),
  };
  return profile.jobTitle || profile.interests ? profile : null;
}

/** Saved event details, or a suggestion taken from the welcome profile. */
export function suggestAttendee(metadata: unknown): AttendeeProfile | null {
  const stored = readStoredAttendee(metadata);
  if (stored) return stored;
  const contact = readContactProfile(metadata);
  if (!contact || (!contact.jobTitle && !contact.interests)) return null;
  return {
    situation: inferSituation(contact.company),
    jobTitle: contact.jobTitle,
    interests: contact.interests,
  };
}

export function readEventPlans(metadata: unknown): EventPlan[] {
  const plans = readRecord(metadata)?.eventPlans;
  if (!isRecord(plans)) return [];
  return Object.entries(plans).flatMap(([eventId, value]) => {
    if (!isRecord(value) || (value.role !== 'attending' && value.role !== 'presenting')) return [];
    return [{
      eventId,
      eventName: readString(value.eventName) || 'Event',
      role: value.role,
      room: readString(value.room),
      time: readString(value.time),
    }];
  });
}

function inferSituation(company: string): WorkSituation {
  const text = company.toLowerCase();
  if (/\b(student|university|college|school)\b/.test(text)) return 'student';
  if (/\b(hiring|job hunt|open to work|looking)\b/.test(text)) return 'looking';
  return 'working';
}

function readRecord(metadata: unknown): Record<string, unknown> | null {
  return isRecord(metadata) ? metadata : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSituation(value: unknown): value is WorkSituation {
  return value === 'working' || value === 'student' || value === 'looking';
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
