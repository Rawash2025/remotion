import React from 'react';
import {Composition} from 'remotion';
import {ReelNAS, NAS_DURATION} from './ReelNAS';
import {editSchema} from './edit';

/* MF Premium reel — "Nad Al Sheba villa" (DSC_1466). defaultProps must stay an inline object literal so Studio can save it. */
export const Root: React.FC = () => (
  <Composition
    id="MF-Premium-Final"
    component={ReelNAS}
    schema={editSchema}
    durationInFrames={NAS_DURATION}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      accent: '#D6B56D',
      warn: '#B9424A',
      grade: {brightness: 1, contrast: 1, saturation: 1, warmth: 0},
      look: {enabled: true, temperature: -0.15, sodiumMix: 0.33, warmth: 0, exposure: 1, contrast: 0.14, blackPoint: 0.03, shadowCool: 0.61, saturation: 1.06, bloom: 0},
      bwMoment: {show: true, a: 20.05, b: 22.85},
      voiceVolume: 1,
      musicTrack: 'music_hazy_long.wav' as const,
      musicVolume: 0.32,
      musicDuck: 0.75,
      sfxVolume: 1,
      deal: {eyebrow: 'VILLA · NAD AL SHEBA', price: 5000000, rows: ['Down payment', 'Registration fees', 'Broker fees'], footer: '0 OF 3 READY'},
      approved: {eyebrow: 'MORTGAGE SECURED', amount: 5500000, footer: 'Real client case · subject to bank approval'},
      cta: {
        headline: 'THINK IT’S IMPOSSIBLE?',
        button: 'CHECK YOUR ELIGIBILITY — FREE →',
        sub: 'Speak with a UAE Mortgage Expert',
        website: 'mortgagefeeders.ae',
        disclaimer: 'Individual client case. All mortgage applications are subject to bank approval.',
      },
      captions: [
        {s: 4.7, e: 6.8, lines: ['MY SISTER BOUGHT A VILLA', 'IN NAD AL SHEBA…'], gold: 'VILLA', size: 62, ar: 'أختي اشترت فيلا في ند الشبا…', arGold: 'فيلا'},
        {s: 6.8, e: 9.0, lines: ['…SO I HAVE TO BUY', 'ONE JUST LIKE IT.'], gold: 'JUST LIKE IT.', ar: '…فلازم أشتري فيلا زيها بالظبط.', arGold: 'زيها بالظبط.'},
        {s: 9.0, e: 10.45, lines: ['HOW MUCH IS', 'THE VILLA?'], ar: 'سعر الفيلا كام؟'},
        {s: 10.45, e: 12.1, lines: ['5 MILLION.'], gold: '5 MILLION.', size: 66, ar: 'خمسة مليون.', arGold: 'خمسة مليون.'},
        {s: 12.1, e: 13.7, lines: ['DO YOU HAVE THE', 'DOWN PAYMENT?'], gold: 'DOWN PAYMENT?', ar: 'معاك الدفعة الأولى؟', arGold: 'الدفعة الأولى؟'},
        {s: 13.7, e: 14.9, lines: ['NO.'], gold: 'NO.', tone: 'red' as const, size: 66, ar: 'لأ.', arGold: 'لأ.'},
        {s: 14.9, e: 16.72, lines: ['REGISTRATION FEES?'], gold: 'REGISTRATION FEES?', ar: 'معاك رسوم التسجيل؟', arGold: 'رسوم التسجيل؟'},
        {s: 16.72, e: 18.13, lines: ['NO.'], gold: 'NO.', tone: 'red' as const, size: 66, ar: 'لأ.', arGold: 'لأ.'},
        {s: 18.13, e: 19.95, lines: ['BROKER FEES?'], gold: 'BROKER FEES?', ar: 'معاك رسوم البروكر؟', arGold: 'رسوم البروكر؟'},
        {s: 19.95, e: 21.3, lines: ['STILL NO.'], gold: 'STILL NO.', tone: 'red' as const, size: 66, ar: 'برضو لأ.', arGold: 'برضو لأ.'},
        {s: 21.3, e: 23.0, lines: ['BUT I WANT TO', 'BUY THE VILLA!'], gold: 'BUY THE VILLA!', tone: 'red' as const, ar: 'بس أنا عايز أشتري الفيلا!', arGold: 'أشتري الفيلا!'},
        {s: 23.66, e: 26.7, lines: ['THIS STORY', 'REALLY HAPPENED TO ME.'], gold: 'REALLY HAPPENED', ar: 'القصة دي حصلت معايا بجد.', arGold: 'حصلت معايا بجد.'},
        {s: 26.7, e: 27.55, lines: ['AND THE CRAZY PART?'], ar: 'والأغرب بقى؟'},
        {s: 27.55, e: 30.63, lines: ['THE CLIENT ACTUALLY', 'BOUGHT THE VILLA.'], gold: 'BOUGHT THE VILLA.', ar: 'إن العميلة فعلًا اشترت الفيلا.', arGold: 'اشترت الفيلا.'},
        {s: 30.63, e: 35.43, lines: ['WE SECURED HER', 'AN AED 5.5M MORTGAGE.'], gold: 'AED 5.5M MORTGAGE.', ar: 'وقدرنا نوفّر لها مورجدج بـ ٥٫٥ مليون درهم.', arGold: 'مورجدج بـ ٥٫٥ مليون درهم.'},
        {s: 35.43, e: 39.2, lines: ['WHAT LOOKED', 'IMPOSSIBLE…'], ar: 'واللي كان باين إنه مستحيل…', stage2: {at: 37.6, lines: ['WHAT LOOKED IMPOSSIBLE…', 'HAD A SOLUTION.'], ar: 'طلع له حل.', arGold: 'طلع له حل.'}, gold: 'HAD A SOLUTION.'},
        {s: 39.2, e: 43.03, lines: ['IN MORTGAGES, DON’T RUSH', 'TO JUDGE YOUR SITUATION.'], gold: 'DON’T RUSH', size: 54, ar: 'في المورجدج، أوعى تتسرّع في الحكم على وضعك.', arGold: 'أوعى تتسرّع'},
        {s: 43.03, e: 45.1, lines: ['SPEAK WITH A', 'MORTGAGE EXPERT.'], gold: 'MORTGAGE EXPERT.', ar: 'اتكلم مع خبير مورجدج.', arGold: 'خبير مورجدج.'},
        {s: 45.1, e: 46.25, lines: ['AND LET THEM', 'HANDLE THE REST.'], gold: 'HANDLE THE REST.', ar: 'وسيب الباقي عليه.', arGold: 'الباقي عليه.'},
      ],
      arabicCaptions: {show: true, size: 46, opacity: 0.92, divider: true},
      hookTitle: {show: true, en: 'INSPIRED BY A TRUE STORY', ar: 'مستوحاة من قصة حقيقية'},
      eyeLift: {show: true, amount: 0.45, x: 0, y: -8, w: 95, h: 55},
      cardsBehindHead: {show: false},
      layout: {
        captions: {show: true, x: 0, y: 0, scale: 1},
        deal: {show: true, x: 0, y: 0, scale: 1},
        approved: {show: true, x: 0, y: 0, scale: 1},
        badge: {show: true, x: 0, y: 0, scale: 1},
        endLogo: {show: true, x: 0, y: 0, scale: 1},
        endText: {show: true, x: 0, y: 0, scale: 1},
        warningGlow: true,
      },
      cornerLogo: {show: true, color: 'gold' as const, size: 130, opacity: 0.85, x: 0, y: 0},
      camera: [
        {s: 4.7, from: 1.0, to: 1.12, fy: 380, punch: true},
        {s: 6.8, from: 1.38, to: 1.42, fy: 560},
        {s: 9.0, from: 1.22, to: 1.26, fy: 850},
        {s: 10.45, from: 1.45, to: 1.5, fy: 910},
        {s: 12.1, from: 1.28, to: 1.32, fy: 860},
        {s: 13.7, from: 1.5, to: 1.54, fy: 940},
        {s: 14.9, from: 1.24, to: 1.28, fy: 850},
        {s: 16.72, from: 1.48, to: 1.52, fy: 930},
        {s: 18.13, from: 1.3, to: 1.34, fy: 870},
        {s: 19.95, from: 1.52, to: 1.56, fy: 950},
        {s: 21.3, from: 1.2, to: 1.3, fy: 850},
        {s: 23.66, from: 1.45, to: 1.5, fy: 600},
        {s: 26.7, from: 1.12, to: 1.18, fy: 460},
        {s: 29.1, from: 1.5, to: 1.54, fy: 640},
        {s: 30.63, from: 1.24, to: 1.3, fy: 870},
        {s: 32.9, from: 1.46, to: 1.5, fy: 930},
        {s: 35.43, from: 1.1, to: 1.16, fy: 440},
        {s: 37.6, from: 1.5, to: 1.55, fy: 620},
        {s: 39.2, from: 1.28, to: 1.32, fy: 540},
        {s: 40.45, from: 1.5, to: 1.55, fy: 640},
        {s: 43.03, from: 1.22, to: 1.3, fy: 800},
        {s: 45.1, from: 1.42, to: 1.48, fy: 600},
      ],
    }}
  />
);
