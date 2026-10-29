// The relay for live games: free public MQTT brokers, several at once so a
// game keeps going if one is down. Each game has a short code; the topic is a
// hash of it and every message is encrypted with a key made from it, so the
// brokers (and anyone listening on them) see only noise. Each player who uses
// friends also has an inbox the same way, named after their friend code, for
// invites.
import { MqttClient } from './mqtt';

const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081'];

/** Brokers to use; tests point this at a local broker through localStorage. */
function brokers(): string[] {
  try {
    const own = JSON.parse(localStorage.getItem('grandmasters.brokers') ?? 'null');
    if (Array.isArray(own) && own.length) return own;
  } catch {
    /* ignore */
  }
  return BROKERS;
}

// Crockford base32, without the letters that look like digits.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 10;

/** A new game code: 10 characters, 50 random bits. */
export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join('');
}

/** Tidies a typed or pasted code: upper case, no dashes or spaces, O read as 0 and I/L as 1. */
export function normaliseCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return c.length === CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

export const formatCode = (c: string) => `${c.slice(0, 5)}-${c.slice(5)}`;

const te = new TextEncoder();
const td = new TextDecoder();

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)));
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

interface Channel {
  topic: string;
  key: CryptoKey;
}

const channels = new Map<string, Promise<Channel>>();

function channel(code: string): Promise<Channel> {
  let c = channels.get(code);
  if (!c) {
    c = (async () => {
      const topic = `grandmasters/v1/${hex(await sha256(`grandmasters-topic:${code}`)).slice(0, 32)}`;
      const key = await crypto.subtle.importKey('raw', (await sha256(`grandmasters-key:${code}`)) as BufferSource, 'AES-GCM', false, [
        'encrypt',
        'decrypt',
      ]);
      return { topic, key };
    })();
    channels.set(code, c);
  }
  return c;
}

async function seal(key: CryptoKey, data: unknown): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(data))));
  const out = new Uint8Array(12 + body.length);
  out.set(iv);
  out.set(body, 12);
  return out;
}

async function open(key: CryptoKey, payload: Uint8Array): Promise<unknown> {
  if (payload.length < 13) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: payload.subarray(0, 12) as BufferSource },
      key,
      payload.subarray(12) as BufferSource,
    );
    return JSON.parse(td.decode(plain));
  } catch {
    return null; // not ours, or tampered with
  }
}

type Listener = (kind: 'state' | 'beat' | 'inbox', data: unknown, from?: string) => void;

const inboxCode = (friendCode: string) => `inbox:${friendCode}`;

class Relay {
  private clients: MqttClient[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private keys = new Map<string, CryptoKey>();
  private statusListeners = new Set<(n: number) => void>();
  /** States a broker missed while it was down, sent when it comes back. */
  private pending = new Map<MqttClient, Map<string, Uint8Array>>();

  private start() {
    if (this.clients.length) return;
    const wake = () => {
      if (document.visibilityState === 'visible') this.clients.forEach((c) => c.wake());
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    this.clients = brokers().map(
      (url) =>
        new MqttClient({
          url,
          onMessage: (topic, payload) => void this.dispatch(topic, payload),
          onStatus: (up) => {
            if (up) this.flush();
            this.statusListeners.forEach((f) => f(this.connectedCount()));
          },
        }),
    );
  }

  private flush() {
    for (const c of this.clients) {
      const missed = this.pending.get(c);
      if (!missed || !c.connected) continue;
      for (const [topic, p] of missed) if (c.publish(topic, p, true)) missed.delete(topic);
    }
  }

  connectedCount() {
    return this.clients.filter((c) => c.connected).length;
  }

  onStatus(f: (n: number) => void): () => void {
    this.statusListeners.add(f);
    return () => this.statusListeners.delete(f);
  }

  private async dispatch(topic: string, payload: Uint8Array) {
    const m = /^(grandmasters\/v1\/[0-9a-f]+)\/(s|b|i)(?:\/(\w))?$/.exec(topic);
    if (!m) return;
    const base = m[1];
    const key = this.keys.get(base);
    const ls = this.listeners.get(base);
    if (!key || !ls?.size || !payload.length) return;
    const data = await open(key, payload);
    if (data === null) return;
    ls.forEach((l) => l(m[2] === 's' ? 'state' : m[2] === 'b' ? 'beat' : 'inbox', data, m[3]));
  }

  private async listen(code: string, subtopics: string[], listener: Listener): Promise<() => void> {
    this.start();
    const { topic, key } = await channel(code);
    this.keys.set(topic, key);
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
      for (const c of this.clients) for (const sub of subtopics) c.subscribe(`${topic}/${sub}`);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size) return;
      this.listeners.delete(topic);
      for (const c of this.clients) for (const sub of subtopics) c.unsubscribe(`${topic}/${sub}`);
    };
  }

  /** Listens to a game's state and heartbeats. */
  join(code: string, listener: Listener): Promise<() => void> {
    return this.listen(code, ['s', 'b/+'], listener);
  }

  /** Listens to this player's inbox. */
  inbox(friendCode: string, listener: Listener): Promise<() => void> {
    return this.listen(inboxCode(friendCode), ['i'], listener);
  }

  /** Publishes retained on every broker, and again on any that's down when it comes back. */
  private publishRetained(topic: string, p: Uint8Array) {
    for (const c of this.clients) {
      const missed = this.pending.get(c) ?? new Map<string, Uint8Array>();
      this.pending.set(c, missed);
      if (c.publish(topic, p, true)) missed.delete(topic);
      else missed.set(topic, p);
    }
  }

  /** Publishes the game's state, retained, so whoever connects later gets it straight away. */
  async publishState(code: string, state: unknown) {
    this.start();
    const { topic, key } = await channel(code);
    this.publishRetained(`${topic}/s`, await seal(key, state));
  }

  /**
   * Drops a message in a player's inbox. A retained one waits there for them
   * (only the latest is kept), so an invite reaches a friend who opens the app
   * a little later.
   */
  async send(friendCode: string, data: unknown, retain: boolean) {
    this.start();
    const { topic, key } = await channel(inboxCode(friendCode));
    const p = await seal(key, data);
    if (retain) this.publishRetained(`${topic}/i`, p);
    else for (const c of this.clients) c.publish(`${topic}/i`, p, false);
  }

  /** Empties a player's inbox (an empty retained message removes the kept one). */
  async clearInbox(friendCode: string) {
    this.start();
    const { topic } = await channel(inboxCode(friendCode));
    this.publishRetained(`${topic}/i`, new Uint8Array(0));
  }

  /** "I'm here": sent every few seconds while a game is open. */
  async beat(code: string, color: string, data: unknown) {
    this.start();
    const { topic, key } = await channel(code);
    const p = await seal(key, data);
    for (const c of this.clients) c.publish(`${topic}/b/${color}`, p, false);
  }
}

export const relay = new Relay();
