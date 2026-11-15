import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../../state/settings';
import { LINE_MODEL, say, useTalk } from './talk';

function reply(text: string) {
  return new Response(
    JSON.stringify({
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: LINE_MODEL,
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('fresh lines with Claude', () => {
  beforeEach(() => useSettings.getState().set({ aiCoachKey: 'sk-ant-test', coachAiLines: true, coachChat: 'normal', coachPersona: 'mate' }));
  afterEach(() => {
    vi.unstubAllGlobals();
    useSettings.getState().set({ aiCoachKey: '' });
  });

  it('asks the small model for a plain-English line and says it', async () => {
    const fetch = vi.fn(async () => reply('Lovely, mate. Bishop out before that pawn shuts the door on it.'));
    vi.stubGlobal('fetch', fetch);
    const text = await say({ moment: 'rightKey', idea: 'Bishop out before the pawn locks it in.', priority: 1 });
    expect(text).toBe('Lovely, mate. Bishop out before that pawn shuts the door on it.');
    expect(useTalk.getState().bubble?.source).toBe('ai');
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe(LINE_MODEL);
    expect(body.system).toContain('Never write chess notation');
    expect(body.messages[0].content).toContain('Bishop out before the pawn locks it in.');
  });

  it('falls back to the phrase book when the line has notation in it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply('Great, now play Nf3 next.')),
    );
    const text = await say({ moment: 'rightKey', idea: 'Knight out.', priority: 1 });
    expect(text).toContain('Knight out.');
    expect(useTalk.getState().bubble?.source).toBe('book');
  });

  it('falls back when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    const text = await say({ moment: 'wrong', detail: 'Pawn triangle first.', priority: 2 });
    expect(text).toContain('Pawn triangle first.');
    expect(useTalk.getState().bubble?.source).toBe('book');
  });

  it('skips small talk at normal chattiness and never calls the API for it', async () => {
    const fetch = vi.fn(async () => reply('Yep.'));
    vi.stubGlobal('fetch', fetch);
    expect(await say({ moment: 'right', priority: 0 })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
