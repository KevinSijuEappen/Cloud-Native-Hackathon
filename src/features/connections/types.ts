export type ParticipantRole = 'attending' | 'presenting';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export type MatchProfile = {
  role: ParticipantRole;
  jobTitle?: string;
  organization?: string;
  interests: string[];
};

export type ParticipantProfile = MatchProfile & {
  eventId: string;
  userId: string;
  displayName: string;
  sessionRoom?: string;
  sessionTime?: string;
};

export type CompatibilityReason =
  | { kind: 'shared_interests'; label: string; value: string }
  | { kind: 'complementary_roles'; label: string; value: string }
  | { kind: 'shared_work'; label: string; value: string };

export type CompatibleParticipant = ParticipantProfile & {
  score: number;
  reasons: CompatibilityReason[];
};

export type ParticipantConnection = {
  id: string;
  event_id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
};
