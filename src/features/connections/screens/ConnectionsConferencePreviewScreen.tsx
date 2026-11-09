import { EVENTS } from '../../journey/events';
import { ConnectionsConferenceEntryScreen } from './ConnectionsConferenceEntryScreen';

// Device preview of the same post-join screen, backed by the signed-in account
// and real Supabase participant records (no synthetic attendees).
export function ConnectionsConferencePreviewScreen() {
  return <ConnectionsConferenceEntryScreen event={EVENTS[0]} />;
}
