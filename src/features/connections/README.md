# People connections

This feature is isolated from the journey UI. The journey's “Enter the floor” action keeps its planet zoom and popup transition, then renders `ConnectionsConferencePopup` for the selected event. It reads the signed-in Clerk account and joined event plan, syncs that participant's profile to Supabase, and loads live matches for that event.

It provides:

- Per-event profile upserts for attendees and presenters.
- Ranked, explainable compatibility results based on overlapping interests, related work, and complementary attendee/presenter roles.
- Connection requests, incoming/outgoing request lists, accept/decline, and cancellation.
- A full conference connection view and an embedded popup with matched-peer cards, event information, and connection-request actions.
- An optional `officialUrl` on an event, shown as an official information link beside its metadata.

Only profiles with `discoverable = true` are returned as matches. The database never stores email addresses, Clerk metadata blobs, or authentication tokens. The signed-in user's Clerk ID is used only as the row owner key.

The Supabase project must trust Clerk as a third-party auth provider, and Clerk session tokens must include the `authenticated` role claim. The app's Supabase client supplies the Clerk session token; table access is then enforced by RLS. Keep the Supabase secret key on trusted server infrastructure only.

`ConnectionsConferenceEntryScreen` should be rendered only after the account has joined the selected event. It reads the profile and role from Clerk metadata, syncs that account to Supabase, then loads actual discoverable participants. The current seed events do not contain verified official URLs; provide `officialUrl` in event data for the link to appear.

For lower-level embedding, pass an authenticated Supabase client, the event, and a viewer profile:

```tsx
<ConnectionsConferenceEntryScreen
  event={event}
/>
```

For lower-level embedding after the event join flow has already saved the profile:

```tsx
<ConnectionsConferenceScreen
  client={supabaseClient}
  event={event}
  viewer={{ userId, displayName, profile, discoverable }}
/>
```
