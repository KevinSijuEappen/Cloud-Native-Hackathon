# Bluetooth Companion

Cross-platform iOS and Android mobile starter built with Expo, React Native, and TypeScript. This gives the project one shared application codebase while retaining access to native Bluetooth APIs through native modules when device work begins.

## Getting started

Install dependencies with `npm install`, then run `npm start`. Use `npm run ios` or `npm run android` to build and launch on a configured simulator/device. Bluetooth integrations require a native development build; Expo Go is not sufficient for arbitrary native Bluetooth modules.

## Architecture

Keep application code under `src/`, grouped by feature. Put Bluetooth access behind a device service interface in `src/features/devices` and keep platform-specific permissions, adapter behavior, and transport details inside that boundary. This lets screens and domain logic remain shared while native configuration can differ between iOS and Android.

The exact Bluetooth library and permissions are intentionally deferred until the hardware and protocol are known: BLE GATT and classic Bluetooth have different platform support and setup requirements.
