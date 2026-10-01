import React, {createContext, useContext} from 'react';
import {z} from 'zod';
import {zColor} from '@remotion/zod-types';

/* Everything editable, exposed in Remotion Studio's right-hand "Props" panel.
   All times are ORIGINAL speech time in DSC_1466 (seconds) — the edit maps them onto the cut timeline. */

const cap = z.object({
  s: z.number().describe('start (s, original speech time)'),
  e: z.number().describe('end (s, original speech time)'),
  lines: z.array(z.string()),
  gold: z.string().optional().describe('highlighted phrase (must match text exactly)'),
  tone: z.enum(['gold', 'red']).optional(),
  size: z.number().optional(),
  ar: z.string().optional().describe('Arabic line shown under the English'),
  arGold: z.string().optional().describe('highlighted Arabic phrase (must match the Arabic text exactly)'),
  stage2: z.object({at: z.number(), lines: z.array(z.string()), ar: z.string().optional(), arGold: z.string().optional()}).optional().describe('second step reveal — its Arabic line is ADDED under the first one'),
});
const place = z.object({
  show: z.boolean(),
  x: z.number().min(-600).max(600).step(1).describe('move left/right (px)'),
  y: z.number().min(-900).max(900).step(1).describe('move up/down (px)'),
  scale: z.number().min(0.4).max(2).step(0.01),
});
const shot = z.object({
  s: z.number().describe('cut time (s, original speech time)'),
  from: z.number().min(1).max(2.5).step(0.01).describe('zoom at start'),
  to: z.number().min(1).max(2.5).step(0.01).describe('zoom at end'),
  fy: z.number().min(200).max(1300).step(1).describe('face height on screen (px) — bigger = lower'),
  punch: z.boolean().optional(),
});

export const editSchema = z.object({
  // ---------- look ----------
  accent: zColor().describe('Highlight / CTA colour'),
  warn: zColor().describe('Warning colour'),
  grade: z.object({
    brightness: z.number().min(0.7).max(1.3).step(0.01),
    contrast: z.number().min(0.7).max(1.4).step(0.01),
    saturation: z.number().min(0).max(1.5).step(0.01),
    warmth: z.number().min(0).max(0.4).step(0.01).describe('sepia warmth'),
  }),
  look: z.object({
    enabled: z.boolean().describe('turn live colour on/off'),
    temperature: z.number().min(-1).max(2).step(0.01).describe('white balance: − cooler / + warmer (1 = house premium look)'),
    sodiumMix: z.number().min(0).max(1).step(0.01).describe('0 = natural, 1 = full sodium look (0.70 recommended)'),
    warmth: z.number().min(0).max(2).step(0.01).describe('strength of the amber-gold key light'),
    exposure: z.number().min(0.7).max(1.4).step(0.01).describe('overall brightness'),
    contrast: z.number().min(0).max(0.5).step(0.01).describe('S-curve contrast'),
    blackPoint: z.number().min(0).max(0.08).step(0.002).describe('richer blacks (higher = deeper)'),
    shadowCool: z.number().min(0).max(2).step(0.01).describe('cool-neutral tint in the shadows'),
    saturation: z.number().min(0).max(1.6).step(0.01),
    bloom: z.number().min(0).max(0.5).step(0.01).describe('soft golden glow on highlights'),
  }).describe('LIVE COLOUR — premium grade controls'),
  bwMoment: z.object({show: z.boolean(), a: z.number().step(0.01), b: z.number().step(0.01)}).describe('black & white beat, only red stays (original speech time)'),
  // ---------- sound ----------
  voiceVolume: z.number().min(0).max(2).step(0.05),
  musicTrack: z.enum(['music_hazy_long.wav', 'music36.wav']).describe('background music file in /public'),
  musicVolume: z.number().min(0).max(1).step(0.01),
  musicDuck: z.number().min(0).max(1).step(0.05).describe('how much music dips under the voice (1 = full dip)'),
  sfxVolume: z.number().min(0).max(2).step(0.05),
  // ---------- talking-head graphics ----------
  deal: z.object({eyebrow: z.string(), price: z.number(), rows: z.array(z.string()).length(3), footer: z.string()}).describe('villa deal card: price + 3 missing costs'),
  approved: z.object({eyebrow: z.string(), amount: z.number(), footer: z.string()}).describe('mortgage secured count-up card'),
  // ---------- end card ----------
  cta: z.object({headline: z.string(), button: z.string(), sub: z.string(), website: z.string(), disclaimer: z.string()}),
  // ---------- captions ----------
  captions: z.array(cap),
  arabicCaptions: z.object({
    show: z.boolean(),
    size: z.number().min(20).max(80).step(1).describe('Arabic font size'),
    opacity: z.number().min(0.3).max(1).step(0.01),
    divider: z.boolean().describe('thin gold line between English and Arabic'),
  }),
  layout: z.object({captions: place, deal: place, approved: place, badge: place, endLogo: place, endText: place, warningGlow: z.boolean()}),
  cornerLogo: z.object({show: z.boolean(), color: z.enum(['gold', 'white']), size: z.number().min(60).max(400).step(1), opacity: z.number().min(0).max(1).step(0.01), x: z.number().min(-100).max(900).step(1), y: z.number().min(-60).max(1700).step(1)}).describe('company logo, top-left'),
  hookTitle: z.object({show: z.boolean(), en: z.string(), ar: z.string()}).describe('title on top during the hook'),
  eyeLift: z.object({
    show: z.boolean(),
    amount: z.number().min(0).max(1).step(0.01).describe('how much the dark areas around the eyes are lifted'),
    x: z.number().min(-200).max(200).step(1).describe('move the lift area left/right (px, wide-shot scale)'),
    y: z.number().min(-200).max(200).step(1).describe('move the lift area up/down (px, wide-shot scale)'),
    w: z.number().min(10).max(300).step(1).describe('lift area width'),
    h: z.number().min(10).max(300).step(1).describe('lift area height'),
  }).describe('brighten the dark circles around the eyes'),
  cardsBehindHead: z.object({show: z.boolean()}).describe('draw the person over the cards (needs public/main_fg.webm — run make-foreground.mjs once)'),
  // ---------- camera: every cut, zoom and framing ----------
  camera: z.array(shot),
});

export type Edit = z.infer<typeof editSchema>;

export type Place = {show: boolean; x: number; y: number; scale: number};
export const Placed: React.FC<{p: Place; children: React.ReactNode}> = ({p, children}) =>
  p.show ? (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`, transformOrigin: '50% 35%'}}>{children}</div>
  ) : null;

const Ctx = createContext<Edit | null>(null);
export const EditProvider: React.FC<{value: Edit; children: React.ReactNode}> = ({value, children}) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useEdit = () => useContext(Ctx) as Edit;
