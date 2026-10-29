// Finding people nearby over Bluetooth. Only the Android app can do it
// (android/src/.../Nearby.java): browsers can't advertise or scan, and iOS
// Safari has no Bluetooth at all. Each phone shows its friend code and name to
// phones close by while the Nearby screen is open, and nothing else.

export type NearbyStatus =
  | 'off'
  /** Waiting for the person to allow "Nearby devices" (or location, on Android 11 and older). */
  | 'asking'
  | 'on'
  /** Scanning, but this phone can't advertise: it sees others, they don't see it. */
  | 'on-hidden'
  | 'bluetooth-off'
  | 'location-off'
  | 'denied'
  | 'unsupported'
  | 'failed';

export type NearbyEvent = { type: 'status'; status: NearbyStatus } | { type: 'seen'; id: string; name: string; av?: number; rssi: number };

interface NearbyBridge {
  nearbyStart(id: string, name: string, avatar: number): void;
  nearbyStop(): void;
  openSettings(which: 'bluetooth' | 'location' | 'app'): void;
}

const bridge = () => (globalThis as { GrandmastersAndroid?: Partial<NearbyBridge> }).GrandmastersAndroid;

/** The Android app, version 1.4 or later (1.5 for avatars). */
export const nearbySupported = () => typeof bridge()?.nearbyStart === 'function';

type Receiver = (json: string) => void;
const win = globalThis as { __grandmastersNearby?: Receiver };

/** Starts showing this phone (code, name and avatar) to others nearby and looking for them; returns a function that stops. */
export function startNearby(id: string, name: string, avatar: number, on: (e: NearbyEvent) => void): () => void {
  const b = bridge();
  if (!b?.nearbyStart) return () => {};
  const receive: Receiver = (json) => {
    try {
      on(JSON.parse(json) as NearbyEvent);
    } catch {
      // ignore a malformed event
    }
  };
  win.__grandmastersNearby = receive;
  b.nearbyStart(id, name, avatar);
  return () => {
    if (win.__grandmastersNearby === receive) {
      delete win.__grandmastersNearby;
      b.nearbyStop?.();
    }
  };
}

export const openNearbySettings = (which: 'bluetooth' | 'location' | 'app') => bridge()?.openSettings?.(which);

/** A rough distance from the signal strength. */
export const closeness = (rssi: number) => (rssi > -60 ? 'Right next to you' : rssi > -78 ? 'Close by' : 'Nearby');
