import { groupLines, nearestBy } from './pdfLayout.js';
import { normalizeSpaces, parseMonthDay } from './scheduleText.js';

// 세부 일정 표가 없는 문서에서 쓴다.
// 예: '5월 13일(수) | 학교 출발 ➡ 잠실 롯데월드 ➡ 서울올림픽파크텔(숙박)'
// 화살표가 있는 줄만 경로로 보고, 한 날의 경로가 두 줄로 나뉘면 높이가 가장 가까운 날짜 칸을 따른다.
const ARROW = /[➡→⇒▶➔➜]/;
const DATE_REACH = 30;

function segmentsOf(text) {
  return text.split(ARROW).map(normalizeSpaces).filter(Boolean);
}

function toRows(lines) {
  return lines.flatMap(line => segmentsOf(line.text).map(title => ({
    monthDay: line.monthDay, dayNumber: null, start: '', end: '', title, note: ''
  })));
}

export function parseRouteSummaryFromLayout(pages) {
  const lines = [];
  for (const page of pages) {
    const dateItems = page.items.filter(item => parseMonthDay(item.text));
    for (const line of groupLines(page.items)) {
      const routeItems = line.items.filter(item => !parseMonthDay(item.text));
      const text = routeItems.map(item => item.text).join(' ');
      if (!ARROW.test(text)) continue;
      const dateItem = line.items.find(item => parseMonthDay(item.text))
        ?? nearestBy(dateItems.filter(item => item.x < routeItems[0].x), line.y, item => item.y, DATE_REACH);
      lines.push({ text, monthDay: dateItem ? parseMonthDay(dateItem.text) : null });
    }
  }
  return toRows(lines);
}

// 날짜가 없는 줄은 앞 줄의 날짜를 이어 쓴다.
export function parseRouteSummaryFromLines(textLines) {
  const lines = [];
  let monthDay = null;
  for (const raw of textLines) {
    const text = normalizeSpaces(raw);
    monthDay = parseMonthDay(text) ?? monthDay;
    if (!ARROW.test(text)) continue;
    lines.push({ text: text.replace(/^.*?\d{1,2}\s*월\s*\d{1,2}\s*일\s*(\([^)]*\))?/, ''), monthDay });
  }
  return toRows(lines);
}
