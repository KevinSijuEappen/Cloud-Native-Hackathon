import type { SupabaseClient } from '@supabase/supabase-js';
import { rankParticipants } from './matching';
import type {
  CompatibleParticipant,
  ConnectionStatus,
  MatchProfile,
  ParticipantConnection,
  ParticipantProfile,
  ParticipantRole,
} from './types';

const PARTICIPANTS = 'conference_participants';
const CONNECTIONS = 'participant_connections';

export type SaveParticipantInput = {
  eventId: string;
  eventName: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
  workSituation?: 'working' | 'student' | 'looking' | null;
  jobTitle?: string;
  organization?: string;
  interests: string[];
  sessionRoom?: string;
  sessionTime?: string;
  discoverable: boolean;
};

type ParticipantRow = {
  clerk_user_id: string;
  event_id: string;
  display_name: string;
  role: ParticipantRole;
  job_title: string | null;
  organization: string | null;
  interests: string[] | null;
  session_room: string | null;
  session_time: string | null;
};

export async function saveParticipantProfile(client: SupabaseClient, input: SaveParticipantInput): Promise<void> {
  const { error } = await client.from(PARTICIPANTS).upsert({
    event_id: input.eventId,
    clerk_user_id: input.userId,
    event_name: input.eventName,
    display_name: input.displayName.trim() || 'Convergence member',
    role: input.role,
    work_situation: input.workSituation ?? null,
    job_title: input.jobTitle?.trim() ?? '',
    organization: input.organization?.trim() ?? '',
    interests: [...new Set(input.interests.map((interest) => interest.trim()).filter(Boolean))],
    session_room: input.sessionRoom?.trim() ?? '',
    session_time: input.sessionTime?.trim() ?? '',
    discoverable: input.discoverable,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,clerk_user_id' });

  if (error) throw error;
}

export async function removeParticipantProfile(
  client: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from(PARTICIPANTS)
    .delete()
    .eq('event_id', eventId)
    .eq('clerk_user_id', userId);

  if (error) throw error;
}

export async function findCompatibleParticipants(
  client: SupabaseClient,
  eventId: string,
  viewerUserId: string,
  viewer: MatchProfile,
  limit = 20,
): Promise<CompatibleParticipant[]> {
  const { data, error } = await client
    .from(PARTICIPANTS)
    .select('event_id, clerk_user_id, display_name, role, job_title, organization, interests, session_room, session_time')
    .eq('event_id', eventId)
    .eq('discoverable', true)
    .neq('clerk_user_id', viewerUserId);

  if (error) throw error;

  const participants: ParticipantProfile[] = ((data ?? []) as ParticipantRow[]).map((row) => ({
    eventId: row.event_id,
    userId: row.clerk_user_id,
    displayName: row.display_name,
    role: row.role,
    jobTitle: row.job_title ?? '',
    organization: row.organization ?? '',
    interests: row.interests ?? [],
    sessionRoom: row.session_room ?? '',
    sessionTime: row.session_time ?? '',
  }));

  return rankParticipants(viewer, participants).slice(0, Math.max(0, limit));
}

export async function requestConnection(
  client: SupabaseClient,
  eventId: string,
  requesterUserId: string,
  recipientUserId: string,
): Promise<ParticipantConnection> {
  const { data, error } = await client
    .from(CONNECTIONS)
    .insert({ event_id: eventId, requester_user_id: requesterUserId, recipient_user_id: recipientUserId })
    .select('*')
    .single();

  if (error) throw error;
  return data as ParticipantConnection;
}

export async function respondToConnection(
  client: SupabaseClient,
  requestId: string,
  status: Extract<ConnectionStatus, 'accepted' | 'declined'>,
): Promise<ParticipantConnection> {
  const { data, error } = await client
    .from(CONNECTIONS)
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;
  return data as ParticipantConnection;
}

export async function listConnectionRequests(
  client: SupabaseClient,
  userId: string,
  eventId?: string,
): Promise<ParticipantConnection[]> {
  const outgoingQuery = client.from(CONNECTIONS).select('*').eq('requester_user_id', userId).order('created_at', { ascending: false });
  const incomingQuery = client.from(CONNECTIONS).select('*').eq('recipient_user_id', userId).order('created_at', { ascending: false });
  const [outgoing, incoming] = await Promise.all([
    eventId ? outgoingQuery.eq('event_id', eventId) : outgoingQuery,
    eventId ? incomingQuery.eq('event_id', eventId) : incomingQuery,
  ]);

  if (outgoing.error) throw outgoing.error;
  if (incoming.error) throw incoming.error;
  const byId = new Map<string, ParticipantConnection>();
  for (const request of [...(outgoing.data ?? []), ...(incoming.data ?? [])]) {
    byId.set(request.id, request as ParticipantConnection);
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function cancelConnectionRequest(client: SupabaseClient, requestId: string): Promise<void> {
  const { error } = await client.from(CONNECTIONS).delete().eq('id', requestId);
  if (error) throw error;
}
