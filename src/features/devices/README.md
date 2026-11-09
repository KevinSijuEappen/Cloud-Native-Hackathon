# Device feature

Bluetooth logic belongs in this feature, behind a platform-neutral service interface. Keep UI independent of the Bluetooth library so native implementations can evolve without spreading platform checks across screens.

Suggested structure as functionality grows:

- `screens/` and `components/` for device discovery and controls
- `services/` for Bluetooth adapter and connection lifecycle
- `types/` for device and capability contracts
- `hooks/` for UI-facing state

Use a development/native build for Bluetooth libraries; Expo Go does not load arbitrary native modules. Confirm target Bluetooth profiles and permissions before selecting a BLE/classic Bluetooth library.
