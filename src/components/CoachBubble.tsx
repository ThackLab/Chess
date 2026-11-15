import { useEffect, useState } from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useSettings } from '../state/settings';
import { PERSONAS } from '../lib/coach/phrases';
import { replay, useTalk } from '../lib/coach/talk';
import { stopSpeaking, voiceSupported } from '../lib/coach/voice';

const avatarUrl = (id: string) => (typeof document === 'undefined' ? `avatars/${id}.webp` : new URL(`avatars/${id}.webp`, document.baseURI).href);

/** The coach's face, ringed while it talks. */
export function CoachFace({ size = 44 }: { size?: number }) {
  const persona = useSettings((s) => s.coachPersona);
  const speaking = useTalk((s) => s.speaking);
  const p = PERSONAS[persona];
  return (
    <span className={`coach-face ${speaking ? 'talking' : ''}`} style={{ width: size, height: size }}>
      <img src={avatarUrl(p.avatar)} alt="" width={size} height={size} />
    </span>
  );
}

/**
 * The talking coach's speech bubble: what it last said (or `idle` before it
 * has said anything), with buttons to hear it again and to mute it.
 */
export function CoachBubble({ idle, compact }: { idle?: string; compact?: boolean }) {
  const persona = useSettings((s) => s.coachPersona);
  const voice = useSettings((s) => s.coachVoice);
  const set = useSettings((s) => s.set);
  const bubble = useTalk((s) => s.bubble);
  const thinking = useTalk((s) => s.thinking);
  const p = PERSONAS[persona];
  const text = bubble?.text ?? idle ?? '';
  // Re-run the pop-in animation for each new line.
  const [key, setKey] = useState(0);
  useEffect(() => setKey((k) => k + 1), [bubble?.id]);
  const canSpeak = voiceSupported();

  return (
    <div className={`coach-bubble ${compact ? 'compact' : ''}`} aria-live="polite">
      <CoachFace size={compact ? 36 : 44} />
      <div className="cb-body">
        <div className="cb-head">
          <b>{p.name}</b>
          {bubble?.source === 'ai' && <span className="cb-tag">fresh</span>}
          <span className="spacer" />
          {canSpeak && bubble && (
            <button className="icon-btn cb-btn" onClick={() => replay()} aria-label="Say it again" disabled={!voice}>
              <RotateCcw size={16} />
            </button>
          )}
          {canSpeak && (
            <button
              className="icon-btn cb-btn"
              onClick={() => {
                if (voice) stopSpeaking();
                set({ coachVoice: !voice });
              }}
              aria-label={voice ? 'Mute the coach' : 'Let the coach talk'}
              aria-pressed={!voice}
            >
              {voice ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          )}
        </div>
        {thinking ? (
          <p className="cb-text cb-thinking" aria-label="Thinking">
            <span />
            <span />
            <span />
          </p>
        ) : (
          <p key={key} className="cb-text">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}
