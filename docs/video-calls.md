# Calls and group video

The chat header has one phone button. Audio calls use the friend's registered
number and the device's `tel:` handler, matching the existing friends page.
Video calls use WebRTC inside WAGIE, with authenticated server-side Firestore
signaling and an explicit camera/microphone acceptance step for recipients.

## Deployment

- Existing Firebase Admin credentials are required. No new client-side key.
- HTTPS (or localhost) and camera/microphone permission are required.
- Default connectivity uses STUN. For reliable connections across mobile data,
  restrictive NATs and corporate networks, configure a TURN server supporting
  shared-secret temporary credentials (for example coturn):
  - `WEBRTC_TURN_URLS`: comma-separated `turn:` / `turns:` URLs.
  - `WEBRTC_TURN_SECRET`: server-only TURN shared secret. Never use a NEXT_PUBLIC variable.
  The API issues credentials valid for three hours; calls expire at two hours.
- `videoCalls` and `videoCallUsers` are **server-only collections**. In deployed
  Firestore rules, deny all client access to these collections. An overlapping
  wildcard allow rule must also exclude them; a deny rule does not override it.
  Integrate this into the project's actual rules; this repository has no rules
  source and the deployed rules have not been verified here.
- Configure Firestore TTL on `videoCalls.deleteAfter` to remove expired records.
  Ringing calls expire after 90 seconds; accepted calls expire when a participant
  stops sending heartbeats for 60 seconds. Expiry is enforced on API access even
  before TTL cleanup. Offer/answer data is cleared when ending a call.

Incoming invitations are polled every five seconds while the app is visible;
active calls poll every two seconds. A joined participant can invite friends; each invited friend explicitly accepts before any media exchange. Each call supports up to four distinct participants (including declined/left invitations). Start a new call to re-invite someone who already left. Connections are a bounded peer-to-peer mesh; each pair exchanges only its own SDP through the API. Leaving a group removes only that member and their pair signals; at least two remaining members keep the call active. Older pre-group calls expire during this update. Background push is best effort and requires
an existing FCM token/notification permission. Browsers cannot guarantee native
phone-style ringing or continued calling while the OS suspends the app.
Audio/video are not recorded or uploaded to Firestore.

## Verification

Run `node --test tests/video-call.test.cjs` and `npx tsc --noEmit --incremental false`.
Before production rollout, use two signed-in **friend** accounts and real devices:

1. Call -> receive -> accept -> verify audio/video both directions.
2. Mute, camera off/on, decline, cancel while ringing, disconnect and leave page.
3. Deny camera permission; verify a clear error and stopped tracks.
4. Test Wi-Fi to cellular with TURN enabled; also block autoplay and retry playback.
5. Refresh/open another tab; ensure it cannot steal the existing call.

Mock tests cover authorization, participant roles, state transitions, expiration,
busy reservations, guest acceptance/decline, group departure, the four-person limit and retry idempotency. Tapping a thumbnail changes a local React selection only; stable video elements keep audio playing once per peer. They do not verify real device media,
FCM delivery, TURN reachability or deployed Firestore rules.
