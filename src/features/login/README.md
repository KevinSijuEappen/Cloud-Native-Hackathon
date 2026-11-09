# Login feature

Clerk sign-in and sign-up, rendered in-app with the native `AuthView`.

- `screens/LoginScreen.tsx`: embedded Clerk authentication. It does not open a browser.
- The app stays on this screen until the Clerk session is active, then shows the journey screen.
- Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`. Enable the Native API for this app in the Clerk dashboard.
