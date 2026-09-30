// 같은 날짜는 같은 색(day-tone-0~4), 날짜 순서대로 1일차, 2일차…
import { koreanDateLabel } from '../dates.js';

const TONE_COUNT = 5;

export function dayToneMap(dates) {
  const unique = [...new Set(dates.map(date => String(date ?? '')).filter(Boolean))].sort();
  return new Map(unique.map((date, index) => [date, { dayNumber: index + 1, tone: `day-tone-${index % TONE_COUNT}` }]));
}

export function dayToneClass(map, date) {
  return map.get(String(date ?? ''))?.tone ?? '';
}

export function dayHeading(map, date) {
  const info = map.get(String(date ?? ''));
  return info ? `${info.dayNumber}일차 · ${koreanDateLabel(date)}` : '날짜 미정';
}
