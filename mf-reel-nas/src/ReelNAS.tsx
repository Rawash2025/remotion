import React from 'react';
import {
  AbsoluteFill, OffthreadVideo, Audio, Sequence, Freeze, Img, staticFile, useCurrentFrame,
  interpolate, Easing, delayRender, continueRender,
} from 'remotion';
import cuts from './cuts.json';
import env from './voice_env.json';
import {Edit, EditProvider, useEdit, Placed} from './edit';

/* ================= Tokens ================= */
const GOLD = '#D6B56D';
const INK = '#171914';
const CREAM = '#F2EFE7';
const RED = '#B9424A';
const FONT = "'Montserrat', sans-serif";
const AR_FONT = "'Alexandria', sans-serif";
const FPS = 30;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/* ================= Time mapping (original speech time -> cut timeline) =================
   cuts.json: {speed, segs: [[origStart, origEnd, newStart], ...], dur}  (newStart before speed change) */
const SEGS = cuts.segs as number[][];
const SPEED = cuts.speed as number;
export const M = (t: number) => {
  let out = 0;
  for (const [a, b, n] of SEGS) {
    if (t < a) return out;
    out = t <= b ? n + (t - a) : n + (b - a);
  }
  return out;
};
const Ms = (t: number) => M(t) / SPEED; // seconds on main.mp4's timeline
/* cold-open hook: a copy of the Q&A beat placed before the story (cuts.hook).
   cuts.hookKeep = how many hook segments to keep; the rest of the hook is skipped in main.mp4 / voice. */
const HOOK_ALL = ((cuts as any).hook ?? []) as number[][];
const HOOK = HOOK_ALL.slice(0, ((cuts as any).hookKeep ?? HOOK_ALL.length) as number);
const lastHook = HOOK[HOOK.length - 1];
const HOOK_KEEP_PRE = lastHook ? lastHook[2] + (lastHook[1] - lastHook[0]) : 0;
export const HOOK_F = Math.round((HOOK_KEEP_PRE / SPEED) * FPS);
// frames of main.mp4 dropped between the kept hook and the story
const DROP_F = Math.max(0, Math.round((SEGS[0][2] / SPEED) * FPS) - HOOK_F);
const F = (orig: number) => Math.round(Ms(orig) * FPS) - DROP_F;
const SRC_FRAMES = Math.round((cuts.dur as number) * FPS);
const VIDEO_FRAMES = SRC_FRAMES - DROP_F;
// output frame -> frame in main.mp4 / voice_studio.wav
const srcOf = (frame: number) => (frame < HOOK_F ? frame : frame + DROP_F);
const Mh = (t: number) => {
  let out = 0;
  for (const [a, b, n] of HOOK) {
    if (t < a) return out;
    out = t <= b ? n + (t - a) : n + (b - a);
  }
  return out;
};
const Fh = (orig: number) => Math.round((Mh(orig) / SPEED) * FPS);
const mapFor = (frame: number) => (frame < HOOK_F ? Fh : F);
const END_AT = 46.25; // original time where the end card starts
export const NAS_DURATION = F(END_AT) + Math.round(5.5 * FPS); // end card held longer

/* ================= Fonts (local woff2 only) ================= */
if (typeof document !== 'undefined' && !document.getElementById('mf-fonts')) {
  const h = delayRender('fonts');
  fetch(staticFile('mont.css')).then((r) => r.text()).then(async (css) => {
    const el = document.createElement('style');
    el.id = 'mf-fonts';
    el.textContent = css.replace(/url\((mont\d+\.woff2)\)/g, (_m, fn) => `url(${staticFile(fn)})`);
    document.head.appendChild(el);
    const ar = await fetch(staticFile('alex.css')).then((r) => r.text());
    const el2 = document.createElement('style');
    el2.textContent = ar.replace(/url\((alex\d+\.woff2)\)/g, (_m, fn) => `url(${staticFile(fn)})`);
    document.head.appendChild(el2);
    await Promise.all(['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px Montserrat`, 'ABC abc 123')));
    await Promise.all(['500', '600'].map((w) => document.fonts.load(`${w} 40px Alexandria`, 'أختي اشترت فيلا')));
    continueRender(h);
  });
}


/* ================= Live colour: luxury sodium look (Studio sliders) =================
   Per-channel tone curves (same maths as the offline grade / MF_Sodium LUT) + saturation + golden bloom. */
const sm = (a: number, b: number, x: number) => {const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t);};
const AMBER = [1.08, 0.965, 0.79];
const COOL = [0.96, 1.0, 1.05];
const curve = (c: number, L: Edit['look']) => {
  const pts: string[] = [];
  const wb = [1 + 0.03 * L.temperature, 1, 1 - 0.05 * L.temperature][c];
  for (let i = 0; i <= 32; i++) {
    const v = Math.min(1, (i / 32) * wb);
    let n = Math.max(0, (v - L.blackPoint) / (1 - L.blackPoint));
    n = n + L.contrast * (n - 0.5) * (1 - Math.abs(2 * n - 1));
    const hi = sm(0.18, 0.75, n), sh = 1 - sm(0.02, 0.22, n);
    const so = n * (1 + (AMBER[c] - 1) * hi * L.warmth) * (1 + (COOL[c] - 1) * sh * L.shadowCool);
    let o = (n * (1 - L.sodiumMix) + so * L.sodiumMix) * L.exposure;
    const k = 0.8;
    if (o > k) o = k + (1 - k) * (1 - Math.exp(-(o - k) / (1 - k)));   // soft highlight roll-off
    pts.push(Math.min(1, Math.max(0, o)).toFixed(4));
  }
  return pts.join(' ');
};

const LookFilter: React.FC = () => {
  const L = useEdit().look;
  const E = useEdit().eyeLift;
  return (
    <svg width="0" height="0" style={{position: 'absolute'}}>
      <filter id="mfLook" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feComponentTransfer in="SourceGraphic" result="tone">
          <feFuncR type="table" tableValues={curve(0, L)} />
          <feFuncG type="table" tableValues={curve(1, L)} />
          <feFuncB type="table" tableValues={curve(2, L)} />
        </feComponentTransfer>
        <feColorMatrix in="tone" type="saturate" values={String(L.saturation)} result="sat" />
        <feComponentTransfer in="sat" result="hot">
          <feFuncR type="linear" slope="2.4" intercept="-1.35" />
          <feFuncG type="linear" slope="2.1" intercept="-1.25" />
          <feFuncB type="linear" slope="1.5" intercept="-0.95" />
        </feComponentTransfer>
        <feGaussianBlur in="hot" stdDeviation="36" result="glow" />
        <feComponentTransfer in="glow" result="glow2">
          <feFuncR type="linear" slope={L.bloom * 1.0} /><feFuncG type="linear" slope={L.bloom * 0.86} /><feFuncB type="linear" slope={L.bloom * 0.62} />
        </feComponentTransfer>
        <feBlend in="sat" in2="glow2" mode="screen" />
      </filter>
      {/* eye lift: opens up the shadows only (under-eye darkness), mids/highlights barely move */}
      <filter id="mfLift" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feComponentTransfer>
          <feFuncR type="table" tableValues={liftCurve(E.amount)} />
          <feFuncG type="table" tableValues={liftCurve(E.amount)} />
          <feFuncB type="table" tableValues={liftCurve(E.amount * 0.9)} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
};

const liftCurve = (a: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 32; i++) {
    const v = i / 32;
    pts.push(Math.min(1, v + a * 2.6 * v * (1 - v) * (1 - v)).toFixed(4));
  }
  return pts.join(' ');
};

/* ================= Camera ================= */
// Face centre in the 1080x1920 frame at scale 1 (full-body wide shot).
const FACE = {x: 490, y: 380};
type Shot = Edit['camera'][number];
const shotAt = (frame: number, shots: Shot[]) => {
  const FF = mapFor(frame);
  let i = 0;
  for (let k = 0; k < shots.length; k++) if (frame >= FF(shots[k].s)) i = k;
  const start = FF(shots[i].s);
  const end = i + 1 < shots.length ? Math.min(FF(shots[i + 1].s), frame < HOOK_F ? HOOK_F : VIDEO_FRAMES) : VIDEO_FRAMES;
  return {sh: shots[i], start, end};
};

/* main.mp4 (or its cut-out foreground) on the output timeline: the dropped part of the hook is skipped */
const Footage: React.FC<{src: string; style: React.CSSProperties}> = ({src, style}) => {
  const v = (trimBefore: number) => <OffthreadVideo src={staticFile(src)} muted transparent={src.endsWith('.webm')} trimBefore={trimBefore} style={style} />;
  if (DROP_F === 0) return v(0);
  return (
    <>
      <Sequence durationInFrames={HOOK_F}>{v(0)}</Sequence>
      <Sequence from={HOOK_F} premountFor={30}>{v(HOOK_F + DROP_F)}</Sequence>
    </>
  );
};

/* foreground = the person cut out of main.mp4 (public/main_fg.webm), drawn over the cards */
const Camera: React.FC<{foreground?: boolean}> = ({foreground = false}) => {
  const frame = useCurrentFrame();
  const ed = useEdit();
  const vf = Math.min(frame, VIDEO_FRAMES - 2);
  const {sh, start, end} = shotAt(vf, ed.camera);
  const p = interpolate(vf, [start, end], [0, 1], clamp);
  let s: number;
  if (sh.punch) {
    const q = interpolate(vf + 1, [start, start + 11], [0, 1], {...clamp, easing: ease});
    s = sh.from + 0.1 * q + (sh.to - sh.from - 0.1) * p;
  } else {
    s = sh.from + (sh.to - sh.from) * p;
    s *= 1 + 0.025 * interpolate(vf - start, [0, 6], [1, 0], {...clamp, easing: ease});
  }
  // impact on the "still no" beat
  const w = frame - F(ed.bwMoment.a);
  if (w >= 0 && w < 10) s *= 1 + 0.03 * Math.sin((w / 10) * Math.PI);

  // horizontal: centre the face. vertical: face at fy; if that needs more than the frame allows, slide the picture down
  const ox = Math.max(0, Math.min(1080, (540 - s * FACE.x) / (1 - s || 1e-6)));
  const faceTop0 = s * FACE.y; // face y when origin at top edge
  // Q&A shots sit low to leave room for the top hook captions; in the story (no card now) use a normal framing
  const fyUse = sh.fy; // card is back in the story Q&A; hook uses the same low framing under the top captions
  const ty = Math.max(0, fyUse - faceTop0); // extra slide-down in px
  const oy = ty > 0 ? 0 : Math.max(0, Math.min(1920, (fyUse - s * FACE.y) / (1 - s || 1e-6)));

  const endP = interpolate(frame, [F(END_AT) - 6, F(END_AT) + 12], [0, 1], {...clamp, easing: ease});
  const BW = ed.bwMoment;
  const bwP = BW.show ? Math.min(interpolate(frame, [F(BW.a) - 1, F(BW.a)], [0, 1], clamp), interpolate(frame, [F(BW.b) - 6, F(BW.b)], [1, 0], clamp)) : 0;
  const Lk = ed.look;
  const lookOn = Lk.enabled;
  const filt = `${lookOn ? 'url(#mfLook) ' : ''}contrast(${1 + 0.1 * bwP}) saturate(1) grayscale(${bwP}) brightness(${1 - 0.45 * endP}) blur(${6 * endP}px)`;
  const video = <Footage src={foreground ? 'main_fg.webm' : 'main.mp4'} style={{width: '100%', height: '100%', objectFit: 'cover', filter: filt}} />;
  const frozen = frame >= VIDEO_FRAMES - 2;
  // keep the same tree when freezing so the video element is not remounted (that flashed a green frame)
  const V = <Freeze frame={VIDEO_FRAMES - 2} active={frozen}>{video}</Freeze>;
  const E = ed.eyeLift;
  const lift = E.show ? (
    <AbsoluteFill style={{filter: 'url(#mfLift)',
      WebkitMaskImage: `radial-gradient(ellipse ${E.w}px ${E.h}px at ${FACE.x + E.x}px ${FACE.y + E.y}px, #000 30%, transparent 100%)`}}>
      {V}
    </AbsoluteFill>
  ) : null;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: foreground ? 'transparent' : INK}}>
      {ty > 0 && !foreground && (
        // soft backdrop that fills the space above the picture when it slides down
        <AbsoluteFill style={{transform: `scale(${s * 1.25})`, transformOrigin: '50% 0%', filter: 'blur(40px) brightness(0.55)', opacity: 0.9}}>{V}</AbsoluteFill>
      )}
      <AbsoluteFill style={{transform: `translateY(${ty}px) scale(${s * (1 + 0.04 * endP)})`, transformOrigin: `${ox}px ${oy}px`,
        ...(ty > 0 ? {WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, #000 ${Math.min(320, 80 + ty * 0.6)}px)`} : {})}}>
        {V}
        {lift}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* person layer over the cards — kept on for the whole video so it never pops in/out */
const HeadOverCards: React.FC = () => <Camera foreground />;

/* hook title: "inspired by a true story" on top, EN + AR */
const HookTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const T = useEdit().hookTitle;
  if (!T.show || frame >= HOOK_F) return null;
  const i = interpolate(frame, [0, 6], [0, 1], {...clamp, easing: ease});
  const o = interpolate(frame, [HOOK_F - 4, HOOK_F], [1, 0], clamp);
  return (
    <AbsoluteFill style={{top: 230, alignItems: 'center', opacity: i * o, transform: `translateY(${(1 - i) * -12}px)`}}>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: GOLD,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)'}}>{T.en}</div>
      <div style={{width: 64, height: 1.5, margin: '14px 0 12px', background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`}} />
      <div dir="rtl" style={{fontFamily: AR_FONT, fontWeight: 600, fontSize: 40, color: CREAM,
        textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)'}}>{T.ar}</div>
    </AbsoluteFill>
  );
};

/* ================= Grade: vignette + fine grain ================= */
const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 50%, rgba(8,7,6,0.45) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(10,9,8,0.4) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 72%, rgba(10,9,8,0.3) 100%)'}} />
      <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
        <svg width="1080" height="1920">
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="1080" height="1920" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};

const WarningEdge: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const d = frame - F(at);
  if (d < 0 || d > 34) return null;
  const o = interpolate(d, [0, 2, 8, 34], [0, 0.62, 0.42, 0], clamp);
  return <AbsoluteFill style={{opacity: o, background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, ${RED}AA 100%)`}} />;
};

/* ================= Captions ================= */
type Cap = Edit['captions'][number];
const Line: React.FC<{text: string; gold?: string; tone?: 'gold' | 'red'; emph: number}> = ({text, gold, tone, emph}) => {
  const ed = useEdit();
  if (!gold || !text.includes(gold)) return <div>{text}</div>;
  const [a, b] = text.split(gold);
  return (
    <div>
      {a}
      <span style={{color: tone === 'red' ? ed.warn : ed.accent, display: 'inline-block', transform: `scale(${emph})`, transformOrigin: 'center 60%'}}>{gold}</span>
      {b}
    </div>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const edit = useEdit();
  const caps = edit.captions as Cap[];
  const F = mapFor(frame);
  const idx = caps.findIndex((c) => frame >= F(c.s) && frame < F(c.e));
  if (idx < 0 || frame >= F(END_AT)) return null;
  const cap = caps[idx];
  const staged = !!cap.stage2 && frame >= F(cap.stage2.at);
  const lines = staged ? cap.stage2!.lines : cap.lines;
  const firstCount = cap.lines.length;
  const d = frame - F(cap.s);
  const hook = idx === 0;
  const inP = hook ? interpolate(d, [0, 5], [0.55, 1], {...clamp, easing: ease}) : interpolate(d, [0, 6], [0, 1], {...clamp, easing: ease});
  const outP = interpolate(frame, [F(cap.e) - 3, F(cap.e)], [1, 0], clamp);
  const eStart = staged ? F(cap.stage2!.at) : F(cap.s);
  const ed = frame - eStart - (hook ? 2 : 3);
  const amp = hook ? 0.07 : 0.04;
  const emph = ed >= 0 && ed <= 10 ? 1 + amp * Math.sin((ed / 10) * Math.PI) : 1;
  const d2 = staged ? frame - F(cap.stage2!.at) : 99;
  const in2 = interpolate(d2, [0, 6], [0, 1], {...clamp, easing: ease});
  const size = cap.size ?? (lines.length > 2 ? 54 : 58);
  const AR = edit.arabicCaptions;
  // Arabic mirrors the English: stage 2 ADDS its line under the first one instead of replacing it
  const arLines: {text: string; gold?: string; isNew: boolean}[] = [];
  if (cap.ar) arLines.push({text: cap.ar, gold: cap.arGold, isNew: false});
  if (staged && cap.stage2!.ar) arLines.push({text: cap.stage2!.ar, gold: cap.stage2!.arGold, isNew: true});
  const arIn = interpolate(frame - F(cap.s) - 2, [0, 8], [0, 1], {...clamp, easing: ease});
  const hasAr = AR.show && arLines.length > 0;
  const arExtra = arLines.length > 1 ? 50 : 0;
  return (
    <AbsoluteFill style={{top: (lines.length > 2 ? 1240 : 1270) - (hasAr ? 30 + arExtra : 0), height: 300 + (hasAr ? 90 + arExtra : 0), justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: 0.5, color: CREAM,
        opacity: inP * outP, transform: `translateY(${(1 - inP) * 18}px) scale(${0.97 + 0.03 * inP})`,
        textShadow: '0 2px 14px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.6)'}}>
        {lines.map((l, i) => {
          const isNew = staged && i >= firstCount;
          return (
            <div key={i} style={isNew ? {opacity: in2, transform: `translateY(${(1 - in2) * 14}px)`} : {}}>
              <Line text={l} gold={cap.gold} tone={cap.tone} emph={staged ? (isNew ? emph : 1) : emph} />
            </div>
          );
        })}
        {hasAr ? (
          <div style={{marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            {AR.divider && <div style={{width: 56 * arIn, height: 1.5, background: `linear-gradient(90deg, transparent, ${cap.tone === 'red' ? edit.warn : edit.accent}, transparent)`, opacity: 0.85, marginBottom: 12}} />}
            <div dir="rtl" style={{fontFamily: AR_FONT, fontWeight: 500, fontSize: AR.size, lineHeight: 1.35, letterSpacing: 0,
              color: `rgba(242,239,231,${AR.opacity})`, opacity: arIn, transform: `translateY(${(1 - arIn) * 8}px)`,
              textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)'}}>
              {arLines.map((l, i) => (
                <div key={i} style={l.isNew ? {opacity: in2, transform: `translateY(${(1 - in2) * 10}px)`} : {}}>
                  <Line text={l.text} gold={l.gold} tone={cap.tone} emph={staged ? (l.isNew ? emph : 1) : emph} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ================= Card primitives ================= */
const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(34,37,29,0.86), rgba(23,25,20,0.9))',
  border: '1px solid rgba(214,181,109,0.35)',
  borderRadius: 18,
  boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(12px)',
  fontFamily: FONT,
  color: CREAM,
};
const eyebrow: React.CSSProperties = {fontSize: 20, fontWeight: 600, letterSpacing: 4, color: GOLD};
const useEnter = (startF: number, endF: number, dist = 30) => {
  const frame = useCurrentFrame();
  // fast in/out; the exit FINISHES at endF so a card is gone before the cut to the next (higher) framing
  const i = interpolate(frame - startF, [0, 5], [0, 1], {...clamp, easing: ease});
  const o = interpolate(frame - (endF - 5), [0, 5], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return {visible: frame >= startF && frame < endF, style: {opacity: i * (1 - o), transform: `translateY(${(1 - i) * dist - o * 20}px) scale(${0.97 + 0.03 * i})`}};
};
const Check: React.FC<{p: number; color?: string}> = ({p, color = GOLD}) => (
  <svg width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="17" fill="none" stroke={color} strokeWidth="2.5" pathLength={1} strokeDasharray="1"
      strokeDashoffset={1 - interpolate(p, [0, 0.6], [0, 1], clamp)} transform="rotate(-90 20 20)" />
    <path d="M12.5 20.5l5 5 10-11" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray="1" strokeDashoffset={1 - interpolate(p, [0.45, 1], [0, 1], clamp)} />
  </svg>
);
const Cross: React.FC<{p: number}> = ({p}) => (
  <svg width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="17" fill={`rgba(185,66,74,${0.18 * p})`} stroke={RED} strokeWidth="2.5" />
    <path d="M14 14l12 12M26 14L14 26" stroke={RED} strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
  </svg>
);
const Pending: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(242,239,231,0.35)" strokeWidth="2.5" />
      <circle cx="20" cy="20" r={4 + Math.sin(frame / 4) * 1.2} fill={GOLD} />
    </svg>
  );
};

/* ================= G1: the villa deal — price, then 3 costs answered "no" ================= */
export const DEAL_T = {in: 9.14, price: 10.56, rows: [12.24, 15.03, 18.28], nos: [13.76, 16.79, 20.05], out: 23.3};
const Deal: React.FC = () => {
  const frame = useCurrentFrame();
  const ed = useEdit();
  const T = DEAL_T;
  const e = useEnter(F(T.in), F(T.out));
  if (!e.visible) return null;
  const c0 = F(T.price), c1 = c0 + 14;
  const count = interpolate(frame, [c0, c1], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const value = Math.round((ed.deal.price * count) / 10000) * 10000;
  const land = frame - c1;
  const pulse = land >= 0 && land <= 10 ? 1 + 0.035 * Math.sin((land / 10) * Math.PI) : 1;
  const allNo = frame >= F(T.nos[2]);
  const foot = interpolate(frame - F(T.nos[2]), [2, 10], [0, 1], {...clamp, easing: ease});
  const flash = T.nos.some((n) => frame >= F(n) && frame < F(n) + 12);
  return (
    <AbsoluteFill style={{top: 190, alignItems: 'center'}}>
      <div style={{...card, width: 700, padding: '24px 32px 16px', ...e.style,
        borderColor: allNo || flash ? 'rgba(185,66,74,0.7)' : (card.border as string).split(' ').slice(2).join(' '),
        boxShadow: allNo ? `0 24px 60px rgba(0,0,0,0.45), 0 0 ${interpolate(frame - F(T.nos[2]), [0, 3, 24], [0, 38, 14], clamp)}px rgba(185,66,74,0.35)` : card.boxShadow}}>
        <div style={eyebrow}>{ed.deal.eyebrow}</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4, height: 96}}>
          <div style={{fontSize: 30, fontWeight: 600, color: 'rgba(242,239,231,0.7)'}}>AED</div>
          <div style={{fontSize: 78, fontWeight: 800, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', transform: `scale(${pulse})`, transformOrigin: 'left 70%',
            color: frame < c0 ? 'rgba(242,239,231,0.35)' : CREAM}}>{frame < c0 ? '— — —' : value.toLocaleString('en-US')}</div>
        </div>
        {ed.deal.rows.map((label, i) => {
          const rf = F(T.rows[i]);
          if (frame < rf) return null;
          const ip = interpolate(frame - rf, [0, 7], [0, 1], {...clamp, easing: ease});
          const no = frame >= F(T.nos[i]);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, padding: '11px 0', opacity: ip, transform: `translateX(${(1 - ip) * 26}px)`,
              borderTop: '1px solid rgba(214,181,109,0.14)'}}>
              {no ? <Cross p={interpolate(frame - F(T.nos[i]), [0, 6], [0, 1], clamp)} /> : <Pending />}
              <div style={{fontSize: 32, fontWeight: 600, whiteSpace: 'nowrap', color: no ? 'rgba(242,239,231,0.55)' : CREAM}}>{label}</div>
              {no && <div style={{marginLeft: 'auto', fontSize: 20, fontWeight: 700, letterSpacing: 2, color: RED}}>NO</div>}
            </div>
          );
        })}
        <div style={{height: allNo ? 44 : 0, overflow: 'hidden', opacity: foot, fontSize: 22, fontWeight: 700, letterSpacing: 3, color: RED, paddingTop: 10,
          borderTop: allNo ? '1px solid rgba(185,66,74,0.3)' : 'none'}}>{ed.deal.footer}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ================= G2: mortgage secured count-up ================= */
export const APPROVED_T = {in: 30.9, count: [32.45, 34.3], out: 35.35};
const Approved: React.FC = () => {
  const frame = useCurrentFrame();
  const ed = useEdit();
  const T = APPROVED_T;
  const e = useEnter(F(T.in), F(T.out), 40);
  if (!e.visible) return null;
  const c0 = F(T.count[0]), c1 = F(T.count[1]);
  const count = interpolate(frame, [c0, c1], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const value = Math.round((ed.approved.amount * count) / 10000) * 10000;
  const land = frame - c1;
  const pulse = land >= 0 && land <= 10 ? 1 + 0.035 * Math.sin((land / 10) * Math.PI) : 1;
  const glow = interpolate(land, [0, 3, 18], [0, 1, 0.25], clamp);
  const chk = interpolate(land, [0, 9], [0, 1], clamp);
  const bar = interpolate(frame, [c0, c1], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill style={{top: 190, alignItems: 'center'}}>
      <div style={{...card, width: 780, padding: '26px 34px 24px', ...e.style}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={eyebrow}>{ed.approved.eyebrow}</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: GOLD, opacity: chk > 0 ? 1 : 0}}>
            <Check p={chk} /> SECURED
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6}}>
          <div style={{fontSize: 34, fontWeight: 600, color: 'rgba(242,239,231,0.7)'}}>AED</div>
          <div style={{fontSize: 92, fontWeight: 800, letterSpacing: -1, color: CREAM, fontVariantNumeric: 'tabular-nums', transform: `scale(${pulse})`, transformOrigin: 'left 70%',
            textShadow: `0 0 ${28 * glow}px rgba(214,181,109,${0.55 * glow})`}}>{value.toLocaleString('en-US')}</div>
        </div>
        <div style={{height: 10, borderRadius: 5, background: 'rgba(242,239,231,0.12)', marginTop: 12, overflow: 'hidden'}}>
          <div style={{width: `${bar * 100}%`, height: '100%', borderRadius: 5, background: GOLD}} />
        </div>
        <div style={{marginTop: 14, fontSize: 18, fontWeight: 500, letterSpacing: 1, color: 'rgba(242,239,231,0.5)'}}>{ed.approved.footer}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ================= Brand badge on "speak with a mortgage expert" ================= */
export const BADGE_T = {in: 43.25, out: 45.9};
const Badge: React.FC = () => {
  const e = useEnter(F(BADGE_T.in), F(BADGE_T.out), 16);
  if (!e.visible) return null;
  return (
    <AbsoluteFill style={{top: 250, alignItems: 'center'}}>
      <div style={{...card, borderRadius: 40, padding: '14px 26px 14px 18px', display: 'flex', alignItems: 'center', gap: 14, ...e.style}}>
        <Img src={staticFile('mark_gold.png')} style={{height: 34}} />
        <div style={{fontSize: 22, fontWeight: 700, letterSpacing: 3, color: CREAM}}>MORTGAGE FEEDERS</div>
      </div>
    </AbsoluteFill>
  );
};

const CornerLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const C = useEdit().cornerLogo;
  const o = interpolate(frame, [0, 8], [0, 1], clamp) * interpolate(frame, [F(END_AT) - 10, F(END_AT)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img src={staticFile('logo_gold.png')} style={{position: 'absolute', top: 52 + C.y, left: 56 + C.x, width: C.size,
        filter: C.color === 'white' ? 'brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,0.35))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))', opacity: C.opacity * o}} />
    </AbsoluteFill>
  );
};

/* ================= End card ================= */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const ed = useEdit();
  const cta = F(END_AT) + 6, logo = F(END_AT) + 14;
  if (frame < cta - 2) return null;
  const c = interpolate(frame - cta, [0, 9], [0, 1], {...clamp, easing: ease});
  const b = interpolate(frame - (cta + 3), [0, 9], [0, 1], {...clamp, easing: ease});
  const pulseD = frame - (cta + 3 + 15);
  const pulse = pulseD >= 0 && pulseD <= 12 ? 1 + 0.03 * Math.sin((pulseD / 12) * Math.PI) : 1;
  const l = interpolate(frame - logo, [0, 12], [0, 1], {...clamp, easing: ease});
  const sheen = interpolate(frame - logo, [4, 22], [-40, 140], clamp);
  const endFade = interpolate(frame, [NAS_DURATION - 5, NAS_DURATION - 1], [1, 0.15], clamp);
  return (
    <AbsoluteFill style={{alignItems: 'center', fontFamily: FONT, opacity: endFade}}>
      <Placed p={ed.layout.endLogo}><AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 470, opacity: l, transform: `translateY(${(1 - l) * 16}px) scale(${0.96 + 0.04 * l})`,
          WebkitMaskImage: `linear-gradient(100deg, #000 ${sheen - 30}%, rgba(0,0,0,0.75) ${sheen}%, #000 ${sheen + 30}%)`}}>
          <Img src={staticFile('logo_gold.png')} style={{width: 330}} />
        </div>
      </AbsoluteFill></Placed>
      <Placed p={ed.layout.endText}><AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 820, textAlign: 'center', opacity: c, transform: `translateY(${(1 - c) * 16}px)`}}>
          <div style={{fontSize: 56, fontWeight: 800, color: CREAM, letterSpacing: 0.5}}>{ed.cta.headline}</div>
        </div>
        <div style={{position: 'absolute', top: 940, opacity: b, transform: `translateY(${(1 - b) * 10}px) scale(${(0.96 + 0.04 * b) * pulse})`}}>
          <div style={{background: ed.accent, color: INK, borderRadius: 14, padding: '26px 46px', fontSize: 36, fontWeight: 800, letterSpacing: 0.5,
            boxShadow: '0 18px 50px rgba(214,181,109,0.25)', whiteSpace: 'nowrap'}}>{ed.cta.button}</div>
        </div>
        <div style={{position: 'absolute', top: 1090, textAlign: 'center', opacity: b}}>
          <div style={{fontSize: 31, fontWeight: 600, color: CREAM, letterSpacing: 0.5}}>{ed.cta.sub}</div>
          <div style={{fontSize: 32, fontWeight: 600, color: 'rgba(242,239,231,0.9)', marginTop: 16, letterSpacing: 1}}>{ed.cta.website}</div>
        </div>
        <div style={{position: 'absolute', top: 1400, width: 900, textAlign: 'center', fontSize: 24, fontWeight: 500, lineHeight: 1.4, color: 'rgba(242,239,231,0.72)', opacity: c}}>
          {ed.cta.disclaimer}
        </div>
      </AbsoluteFill></Placed>
    </AbsoluteFill>
  );
};

/* ================= Sound design (understated) ================= */
const sfxList = (bwA: number) => [
  {f: 0, src: 'whoosh.wav', vol: 0.14},
  ...DEAL_T.nos.filter((r) => Fh(r) < HOOK_F).map((r) => ({f: Fh(r), src: 'click.wav', vol: 0.26})),
  ...DEAL_T.nos.map((r) => ({f: F(r), src: 'click.wav', vol: 0.26})),
  {f: HOOK_F - 3, src: 'whoosh.wav', vol: 0.14},
  {f: F(bwA) - 1, src: 'alert.wav', vol: 0.5},
  {f: F(APPROVED_T.in) - 30, src: 'riser.wav', vol: 0.14},
  {f: F(APPROVED_T.in), src: 'whoosh.wav', vol: 0.12},
  {f: F(APPROVED_T.count[1]), src: 'tick.wav', vol: 0.38},
  {f: F(APPROVED_T.count[1]) + 2, src: 'glass.wav', vol: 0.16},
  {f: F(BADGE_T.in), src: 'click.wav', vol: 0.12},
  {f: F(END_AT) - 6, src: 'whoosh.wav', vol: 0.1},
  {f: F(END_AT) + 6, src: 'glass.wav', vol: 0.22},
  {f: F(END_AT) + 14, src: 'sting.wav', vol: 0.22},
];

const envArr = env as number[];
export const ReelNAS: React.FC<Edit> = (props) => {
  const g = props.grade;
  const L = props.layout;
  return (
    <EditProvider value={props}>
      <AbsoluteFill style={{background: INK}}>
        <LookFilter />
        <AbsoluteFill style={{filter: `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturation}) sepia(${g.warmth})`}}>
          <Camera />
        </AbsoluteFill>
        <Grade />
        {L.warningGlow && props.bwMoment.show && <WarningEdge at={props.bwMoment.a} />}
        <Placed p={L.deal}><Deal /></Placed>
        <Placed p={L.approved}><Approved /></Placed>
        <Placed p={L.badge}><Badge /></Placed>
        {props.cardsBehindHead.show && (
          <AbsoluteFill style={{filter: `brightness(${g.brightness}) contrast(${g.contrast}) saturate(${g.saturation}) sepia(${g.warmth})`}}>
            <HeadOverCards />
          </AbsoluteFill>
        )}
        <HookTitle />
        {props.cornerLogo.show && <CornerLogo />}
        <Placed p={L.captions}><Captions /></Placed>
        <EndCard />
      </AbsoluteFill>
      {DROP_F === 0 ? (
        <Audio src={staticFile('voice_studio.wav')} volume={props.voiceVolume} />
      ) : (
        <>
          <Sequence durationInFrames={HOOK_F}><Audio src={staticFile('voice_studio.wav')} volume={props.voiceVolume} /></Sequence>
          <Sequence from={HOOK_F} premountFor={30}><Audio src={staticFile('voice_studio.wav')} trimBefore={HOOK_F + DROP_F} volume={props.voiceVolume} /></Sequence>
        </>
      )}
      <Audio src={staticFile(props.musicTrack)} volume={(fr) => props.musicVolume * (1 - props.musicDuck * (envArr[Math.min(srcOf(fr), envArr.length - 1)] ?? 0))} />
      {sfxList(props.bwMoment.a).map((x, i) => (
        <Sequence key={i} from={Math.max(0, x.f)} durationInFrames={60}>
          <Audio src={staticFile(x.src)} volume={x.vol * props.sfxVolume} />
        </Sequence>
      ))}
    </EditProvider>
  );
};
