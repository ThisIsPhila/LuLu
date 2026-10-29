import type { AppTheme } from './appPreferences';

const loginLandscapeScenes = [
  { label: 'Riverside meadow', src: '/media/appearance/login-landscapes/riverside-meadow.jpg' },
  { label: 'Coastal headland', src: '/media/appearance/login-landscapes/coastal-headland.jpg' },
  { label: 'Olive terraces', src: '/media/appearance/login-landscapes/olive-terraces.jpg' },
  { label: 'Twilight lake', src: '/media/appearance/login-landscapes/twilight-lake.jpg' },
] as const;

const loginPortraitScenes = [
  { label: 'Journal still life', src: '/media/brand/journal-still-life.jpg' },
  { label: 'Sand and stone', src: '/media/appearance/login-portraits/sand-stone.jpg' },
  { label: 'Sage hills', src: '/media/appearance/login-portraits/sage-hills.jpg' },
  { label: 'Light paper', src: '/media/appearance/login-portraits/light-paper.jpg' },
  { label: 'Dark paper', src: '/media/appearance/login-portraits/dark-paper.jpg' },
] as const;

export const loginModeScenes = {
  light: {
    landscape: loginLandscapeScenes[1],
    portrait: loginPortraitScenes[3],
    blurLevel: 4,
    toneLevel: 1,
    toneOpacity: 55,
  },
  dark: {
    landscape: loginLandscapeScenes[3],
    portrait: loginPortraitScenes[4],
    blurLevel: 2,
    toneLevel: 0,
    toneOpacity: 70,
  },
} satisfies Record<AppTheme, {
  landscape: { label: string; src: string };
  portrait: { label: string; src: string };
  blurLevel: number;
  toneLevel: number;
  toneOpacity: number;
}>;
