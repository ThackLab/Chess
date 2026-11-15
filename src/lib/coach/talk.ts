// The talking coach's mouth: turns a moment in the lesson or game ("they
// slipped", "wrong move, here's why") into a line, shows it in the coach's
// speech bubble and says it out loud.
//
// Lines come from the phrase book (phrases.ts), drawn from shuffled bags so
// nothing repeats until every way of saying it has been used. With an
// Anthropic key and "fresh lines" on, Claude writes each line instead, from
// the same facts (the lesson's note, the engine's verdict) so it never makes
// up chess; if it is slow or fails, the phrase book answers.
import Anthropic from '@anthropic-ai/sdk';
import { create } from 'zustand';
import { useSettings, type CoachChat, type CoachPersona } from '../../state/settings';
import { PERSONAS, phrasesFor, type Moment } from './phrases';
import { onSpeakingChange, speak, stopSpeaking } from './voice';

export const LINE_MODEL = 'claude-haiku-5-5';
const AI_TIMEOUT_MS = 6000;

export interface SayInput {
  moment: Moment;
  /** Why a move is played (from the lesson): fills {idea}. */
  idea?: string;
  /** What went wrong or what to look at: fills {detail}. */
  detail?: string;
  /** A line's name: fills {line}. */
  line?: string;
  n?: number;
  /**
   * How much it matters: 0 small talk ("Yep."), 1 normal, 2 must be said
   * (a warning, the lesson itself). Quieter coaches drop the small talk, and a
   * line never cuts off a more important one that is still being said.
   */
  priority?: 0 | 1 | 2;
  /** Plain facts for the AI writer (what happened on the board, in words). */
  facts?: string;
  /** Use the phrase book even when the AI is on (for quick-fire lines). */
  bookOnly?: boolean;
}

export interface Bubble {
  id: number;
  text: string;
  moment: Moment;
  source: 'book' | 'ai';
  priority: number;
}

interface TalkState {
  bubble: Bubble | null;
  /** The coach is writing a fresh line (AI). */
  thinking: boolean;
  speaking: boolean;
}

export const useTalk = create<TalkState>()(() => ({ bubble: null, thinking: false, speaking: false }));

onSpeakingChange((speaking) => useTalk.setState({ speaking }));

// ---------------------------------------------------------------- phrase bags

const BAGS_KEY = 'grandmasters.coachBags';
let bags: Record<string, number[]> | null = null;
const lastPicked: Record<string, number> = {};

function loadBags(): Record<string, number[]> {
  if (bags) return bags;
  try {
    bags = JSON.parse(localStorage.getItem(BAGS_KEY) ?? '{}') as Record<string, number[]>;
  } catch {
    bags = {};
  }
  return bags;
}

function saveBags() {
  try {
    localStorage.setItem(BAGS_KEY, JSON.stringify(bags ?? {}));
  } catch {
    // Storage full or blocked: the bags just won't survive a reload.
  }
}

function shuffled(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The next phrase for a moment: every phrase is used once before any is used
 * again, and the last one of a round never opens the next.
 */
export function pickPhrase(persona: CoachPersona, moment: Moment, rng: () => number = Math.random): string {
  const list = phrasesFor(persona, moment);
  if (!list.length) return '';
  const key = `${persona}:${moment}`;
  const all = loadBags();
  let bag = (all[key] ?? []).filter((i) => i < list.length);
  if (!bag.length) {
    bag = shuffled(list.length, rng);
    const last = lastPicked[key];
    if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  const i = bag.pop()!;
  all[key] = bag;
  lastPicked[key] = i;
  saveBags();
  return list[i];
}

/** What the coach calls you when you haven't set a name. */
function nameFor(persona: CoachPersona): string {
  const n = useSettings.getState().playerName.trim();
  if (n && n.toLowerCase() !== 'you') return n;
  return persona === 'mate' ? 'mate' : persona === 'hype' ? 'champ' : 'my friend';
}

/** Fills a phrase's blanks; any detail the phrase has no blank for goes on the end. */
export function fill(template: string, input: SayInput, name: string): string {
  let t = template;
  const slot = (key: string, value: string | undefined) => {
    if (t.includes(`{${key}}`)) t = t.split(`{${key}}`).join(value ?? '');
    else if (value && (key === 'idea' || key === 'detail')) t = `${t} ${value}`;
  };
  t = t.split('{name}').join(name);
  slot('line', input.line);
  slot('n', input.n !== undefined ? String(input.n) : undefined);
  slot('idea', input.idea);
  slot('detail', input.detail);
  return t
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/:\s*$/, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ------------------------------------------------------------------- notation

/** Chess notation or a square name (Nf3, exd5, O-O, e4). The coach never says these. */
const NOTATION = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?|0-0(?:-0)?)\b|[♔♕♖♗♘♙♚♛♜♝♞♟]/;

export function hasNotation(text: string): boolean {
  return NOTATION.test(text);
}

// ------------------------------------------------------------- how chatty

const CHAT_FLOOR: Record<CoachChat, number> = { chatty: 0, normal: 1, quiet: 2 };

/** Whether a line this important gets said at the current chattiness. */
export function worthSaying(priority: number, chat: CoachChat = useSettings.getState().coachChat): boolean {
  return priority >= CHAT_FLOOR[chat];
}

// ------------------------------------------------------------------ AI lines

const MOMENT_BRIEF: Partial<Record<Moment, string>> = {
  walkStart: 'Introduce the opening line you are about to show.',
  walkYours: 'Explain the move the student (White) just saw played.',
  walkTheirs: 'Explain the move the opponent (Black) just played and what to watch for.',
  rightKey: 'The student found the right move. Praise briefly and say why it is good.',
  wrong: 'The student played the wrong move in their opening drill. Say so kindly and explain the right idea.',
  wrongAgain: 'The student missed the move again; an arrow now shows it. Explain the idea.',
  leftPlan: 'In a game, the student left the usual London setup. Explain what the London move would be.',
  blunderWarn: 'The student is about to make a serious mistake. Warn them and say what it allows. They can take it back.',
  theySlipped: 'The opponent just blundered. Tell the student to look for the punishment without giving the answer away.',
  missedPunish: 'The student missed a chance to punish a mistake. Say what they could have done.',
  greatMove: 'The student found the only good move. Praise it.',
  hint: 'Give a hint without giving the full answer.',
  trapStart: 'Introduce a trap position the student must solve.',
  trapRight: 'The student solved the trap. Say why it works.',
  trapWrong: 'The student played the wrong move in the trap. Explain why it does not work.',
  win: 'The student just won the game.',
  loss: 'The student just lost the game. Be encouraging.',
};

let recentAi: string[] = [];

function aiPrompt(persona: CoachPersona, input: SayInput, example: string): { system: string; user: string } {
  const p = PERSONAS[persona];
  const system = `You are ${p.aiVoice} You coach a beginner-to-intermediate player who is learning the London System as White, inside a chess app with a board that shows arrows.

Everything you write is spoken out loud, so write exactly what you would say: one or two short sentences, at most 35 words.

Rules:
- Plain English only. Never write chess notation (no "Nf3", "e4", "O-O", "Bxd5") and never name squares (no "f7", "the e5 square"). Say "this pawn", "your bishop", "their queen", "the middle", "the square in front of their king" - the arrows on the board show where.
- Only use the facts you are given. Never invent moves, variations or evaluations.
- Vary how you start; don't open with the same word as your recent lines.
- No emojis, no lists, no quotation marks.`;
  const lines = [
    `Moment: ${MOMENT_BRIEF[input.moment] ?? input.moment}`,
    input.line ? `Line: ${input.line}` : '',
    input.facts ? `What happened: ${input.facts}` : '',
    input.idea ? `The lesson's explanation: ${input.idea}` : '',
    input.detail ? `What to tell them: ${input.detail}` : '',
    input.n !== undefined ? `Number: ${input.n}` : '',
    `Something you might say (say it your own way, don't copy): ${example}`,
    recentAi.length ? `Your last few lines, don't repeat them: ${recentAi.join(' | ')}` : '',
    'Your line:',
  ];
  return { system, user: lines.filter(Boolean).join('\n') };
}

async function aiLine(persona: CoachPersona, input: SayInput, example: string): Promise<string | null> {
  const { aiCoachKey } = useSettings.getState();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const client = new Anthropic({ apiKey: aiCoachKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
    const { system, user } = aiPrompt(persona, input, example);
    const msg = await client.messages.create(
      { model: LINE_MODEL, max_tokens: 160, system, messages: [{ role: 'user', content: user }] },
      { signal: ctrl.signal },
    );
    const text = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join(' ')
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // A line with notation in it is no good to someone who doesn't read notation.
    if (!text || hasNotation(text) || text.length > 320) return null;
    recentAi = [...recentAi, text].slice(-5);
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------------------------- say

let nextId = 1;
let token = 0;

/** The coach's line for a moment, from the phrase book (used directly by tests and as the AI's fallback). */
export function bookLine(input: SayInput, persona: CoachPersona = useSettings.getState().coachPersona): string {
  return fill(pickPhrase(persona, input.moment), input, nameFor(persona));
}

/**
 * Says something. Returns the text said, or null if it wasn't worth saying
 * at this chattiness or would have cut off something more important.
 */
export async function say(input: SayInput): Promise<string | null> {
  const settings = useSettings.getState();
  const persona = settings.coachPersona;
  const priority = input.priority ?? 1;
  if (!worthSaying(priority, settings.coachChat)) return null;
  const { bubble, speaking } = useTalk.getState();
  if (speaking && bubble && bubble.priority > priority) return null;
  const mine = ++token;
  const fallback = bookLine(input, persona);
  let text = fallback;
  let source: Bubble['source'] = 'book';
  const useAi = !!settings.aiCoachKey && settings.coachAiLines && !input.bookOnly && priority >= 1;
  if (useAi) {
    useTalk.setState({ thinking: true });
    const ai = await aiLine(persona, input, fallback);
    if (mine !== token) return null; // something newer was said meanwhile
    useTalk.setState({ thinking: false });
    if (ai) {
      text = ai;
      source = 'ai';
    }
  }
  if (!text) return null;
  useTalk.setState({ bubble: { id: nextId++, text, moment: input.moment, source, priority }, thinking: false });
  speak(text, PERSONAS[persona].style);
  return text;
}

/**
 * Puts a line in the bubble without saying it. Browsers won't let a page
 * talk before you've tapped something, so screens open with a silent line
 * (the speaker button says it).
 */
export function show(input: SayInput) {
  ++token;
  const persona = useSettings.getState().coachPersona;
  const text = bookLine(input, persona);
  if (text)
    useTalk.setState({ bubble: { id: nextId++, text, moment: input.moment, source: 'book', priority: input.priority ?? 1 }, thinking: false });
}

/** Shows a line without a phrase-book wrapper (the lesson's own words), and says it. */
export function sayExact(text: string, moment: Moment, priority: 0 | 1 | 2 = 2) {
  if (!text) return;
  ++token;
  const persona = useSettings.getState().coachPersona;
  useTalk.setState({ bubble: { id: nextId++, text, moment, source: 'book', priority }, thinking: false });
  speak(text, PERSONAS[persona].style);
}

/** Says the current bubble again. */
export function replay() {
  const b = useTalk.getState().bubble;
  if (b) speak(b.text, PERSONAS[useSettings.getState().coachPersona].style);
}

/** Leaving a coach screen: stop talking and clear the bubble. */
export function hush() {
  ++token;
  stopSpeaking();
  useTalk.setState({ bubble: null, thinking: false });
}
