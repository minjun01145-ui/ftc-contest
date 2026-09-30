import { parseDetailedScheduleTable } from './pdfScheduleTable.js';
import { parseRouteSummaryFromLayout, parseRouteSummaryFromLines } from './routeSummary.js';
import { detectYear, isoDate } from './scheduleText.js';
import { parseDetailedScheduleFromTables } from './tableSchedule.js';

// 세부 일정 표를 먼저 찾고, 없으면 '주요 경로(➡)' 줄을 쓴다.
// items는 일정 표 행과 같은 모양: { date, place, name, arrivalTime, departureTime, contact }
const MIN_TABLE_ROWS = 2;

function addDays(isoText, days) {
  const [year, month, day] = isoText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// 날짜가 없는 행도 같은 문서 안의 'n일차 = 날짜' 관계로 채운다.
export function scheduleItemsFromRows(rows, year) {
  const anchor = rows.find(row => row.monthDay && row.dayNumber);
  const firstDay = anchor ? addDays(isoDate(year, anchor.monthDay), 1 - anchor.dayNumber) : '';
  return rows.map(row => ({
    date: row.monthDay ? isoDate(year, row.monthDay) : (firstDay && row.dayNumber ? addDays(firstDay, row.dayNumber - 1) : ''),
    place: row.place ?? '',
    name: row.title,
    arrivalTime: row.start,
    departureTime: row.end,
    contact: row.note
  }));
}

function choose(detailedRows, routeRows) {
  if (detailedRows.length >= MIN_TABLE_ROWS) return { rows: detailedRows, source: 'detailedTable' };
  if (routeRows.length) return { rows: routeRows, source: 'routeSummary' };
  return { rows: [], source: 'none' };
}

export function parseScheduleFromLayout(pages, { fallbackYear } = {}) {
  const year = detectYear(pages.flatMap(page => page.items.map(item => item.text)), fallbackYear);
  const { rows, source } = choose(parseDetailedScheduleTable(pages), parseRouteSummaryFromLayout(pages));
  return { items: scheduleItemsFromRows(rows, year), source };
}

export function parseScheduleFromTables({ tables, paragraphs }, { fallbackYear } = {}) {
  const year = detectYear(paragraphs, fallbackYear);
  const { rows, source } = choose(parseDetailedScheduleFromTables(tables), parseRouteSummaryFromLines(paragraphs));
  return { items: scheduleItemsFromRows(rows, year), source };
}
