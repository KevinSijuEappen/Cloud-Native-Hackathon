import type { MatchProfile, ParticipantProfile, CompatibleParticipant, CompatibilityReason } from './types';

const normalize = (value: string) => value
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const tokens = (values: string[]) => new Set(values.map(normalize).filter(Boolean));

function overlap(left: Set<string>, right: Set<string>) {
  const shared = [...left].filter((value) => right.has(value));
  const union = new Set([...left, ...right]);
  return { shared, ratio: union.size ? shared.length / union.size : 0 };
}

export function rankParticipants(
  viewer: MatchProfile,
  participants: ParticipantProfile[],
): CompatibleParticipant[] {
  const viewerInterests = tokens(viewer.interests);
  const viewerWork = tokens([viewer.jobTitle ?? '', viewer.organization ?? '']);

  return participants
    .map((participant) => {
      const interests = overlap(viewerInterests, tokens(participant.interests));
      const work = overlap(viewerWork, tokens([participant.jobTitle ?? '', participant.organization ?? '']));
      const complementary = viewer.role !== participant.role;
      const reasons: CompatibilityReason[] = [];

      if (interests.shared.length) {
        reasons.push({ kind: 'shared_interests', label: 'Shared interests', value: interests.shared.join(', ') });
      }
      if (complementary) {
        reasons.push({ kind: 'complementary_roles', label: 'Different roles', value: `${viewer.role} + ${participant.role}` });
      }
      if (work.shared.length) {
        reasons.push({ kind: 'shared_work', label: 'Related work', value: work.shared.join(', ') });
      }

      const score = Math.min(100, Math.round(interests.ratio * 65 + (complementary ? 20 : 0) + work.ratio * 15));
      return { ...participant, score, reasons };
    })
    .filter((participant) => participant.score > 0)
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
}
