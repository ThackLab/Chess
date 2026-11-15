// The talking coach's voice. Browsers speak with the Web Speech API; the
// Android app's WebView has none, so there the app's native text-to-speech
// does it through the bridge (MainActivity.speak). Everything stays on the
// device: no audio is fetched from anywhere.
import { nativeSpeech } from '../platform';
import { useSettings } from '../../state/settings';

export interface VoiceStyle {
  /** Multiplies the speed set in Settings. */
  rate: number;
  pitch: number;
}

type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();
let speaking = false;
let current = '';

function setSpeaking(on: boolean) {
  if (on === speaking) return;
  speaking = on;
  for (const l of [...listeners]) l(on);
}

/** Called by the Android app when an utterance starts or finishes. */
(globalThis as { __grandmastersSpeech?: (event: string, id: string) => void }).__grandmastersSpeech = (event, id) => {
  if (id !== current) return;
  if (event === 'start') setSpeaking(true);
  else setSpeaking(false);
};

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export function voiceSupported(): boolean {
  return !!nativeSpeech || !!synth();
}

export function onSpeakingChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const isSpeaking = () => speaking;

/** English voices the browser offers (empty in the Android app, which uses the phone's default voice). */
export function englishVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s || nativeSpeech) return Promise.resolve([]);
  const pick = () => s.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
  const now = pick();
  if (now.length) return Promise.resolve(now);
  // Chrome loads its voice list after the page; wait for it briefly.
  return new Promise((resolve) => {
    const done = () => resolve(pick());
    s.addEventListener?.('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Ranks a voice: an Australian accent first (it's an Aussie coach), then British, then the rest; natural-sounding voices win ties. */
export function voiceRank(v: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>): number {
  const lang = v.lang.toLowerCase().replace('_', '-');
  let r = lang === 'en-au' ? 300 : lang === 'en-gb' ? 200 : lang === 'en-us' ? 150 : lang.startsWith('en') ? 100 : 0;
  if (/natural|neural|enhanced|premium|online/i.test(v.name)) r += 60;
  if (/google/i.test(v.name)) r += 40;
  if (/compact|novelty|whisper|bells|bubbles|cellos|zarvox|trinoids|albert|bad news|good news|jester|organ|superstar|wobble/i.test(v.name)) r -= 250;
  return r;
}

function chooseVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const all = s.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
  const wanted = useSettings.getState().coachVoiceUri;
  if (wanted) {
    const v = all.find((x) => x.voiceURI === wanted);
    if (v) return v;
  }
  return all.sort((a, b) => voiceRank(b) - voiceRank(a))[0] ?? null;
}

/** Text as it should be read out: no markup, and a few words said the way a person would. */
export function speakable(text: string): string {
  return text
    .replace(/\*/g, '')
    .replace(/[“”]/g, '"')
    .replace(/\s+—\s+|\s+–\s+/g, ', ')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chrome stops long utterances after about 15 seconds, so text is spoken a
 * sentence or two at a time.
 */
export function chunks(text: string, max = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let seq = 0;
let keepAlive: ReturnType<typeof setInterval> | undefined;

/** Says `text`, cutting off anything still being said. */
export function speak(text: string, style: VoiceStyle = { rate: 1, pitch: 1 }) {
  const { coachVoice, coachRate } = useSettings.getState();
  if (!coachVoice) return;
  const said = speakable(text);
  if (!said) return;
  const rate = Math.max(0.5, Math.min(2, style.rate * coachRate));
  const id = `u${++seq}`;
  current = id;
  if (nativeSpeech) {
    try {
      nativeSpeech.speak(said, rate, style.pitch, id);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
    return;
  }
  const s = synth();
  if (!s) return;
  s.cancel();
  if (keepAlive) clearInterval(keepAlive);
  const voice = chooseVoice();
  const parts = chunks(said);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = 'en-AU';
    u.rate = rate;
    u.pitch = Math.max(0, Math.min(2, style.pitch));
    if (i === 0) u.onstart = () => current === id && setSpeaking(true);
    if (i === parts.length - 1) {
      u.onend = () => {
        if (current !== id) return;
        if (keepAlive) clearInterval(keepAlive);
        setSpeaking(false);
      };
    }
    u.onerror = () => {
      if (current !== id) return;
      if (keepAlive) clearInterval(keepAlive);
      setSpeaking(false);
    };
    s.speak(u);
  });
  // Chrome on Android sometimes pauses a queue it was handed; a nudge keeps it going.
  keepAlive = setInterval(() => {
    if (!s.speaking) {
      if (keepAlive) clearInterval(keepAlive);
      return;
    }
    if (s.paused) s.resume();
  }, 5000);
}

export function stopSpeaking() {
  current = '';
  if (keepAlive) clearInterval(keepAlive);
  if (nativeSpeech) nativeSpeech.stop();
  else synth()?.cancel();
  setSpeaking(false);
}
