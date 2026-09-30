import { normalizeSpaces, parseDayNumber, parseMonthDay, parseTimeRange, scheduleTitle, startsNewDay } from './scheduleText.js';

// table = [{ cells: [{ col, text }] }] (col: 셀이 시작하는 열 번호)
// 일자·장소 칸은 여러 행을 병합하므로 그 칸이 있는 행부터 다음 칸 전까지 같은 날/장소로 본다.
// 일자 칸이 없으면 시간이 앞 행보다 이를 때 다음 날로 넘긴다.
const HEADERS = Object.freeze([
  { key: 'date', pattern: /^(일\s*자|날\s*짜|월\s*일|일\s*차)$/ },
  { key: 'place', pattern: /^(장\s*소|장소\s*\/\s*체험처)$/ },
  { key: 'time', pattern: /^(시\s*간)$/ },
  { key: 'detail', pattern: /^(상세\s*일정|세부\s*일정|일\s*정|내\s*용|활동\s*내용|주요\s*활동|세부\s*내용)$/ },
  { key: 'note', pattern: /^(비\s*고|참\s*고)$/ }
]);

function headerColumns(row) {
  const columns = new Map();
  for (const cell of row.cells) {
    const header = HEADERS.find(item => item.pattern.test(normalizeSpaces(cell.text)));
    if (header) columns.set(header.key, cell.col);
  }
  return columns.has('time') && columns.has('detail') ? columns : null;
}

function cellText(row, col) {
  return row.cells.find(cell => cell.col === col)?.text ?? '';
}

function parseTable(table) {
  const headerIndex = table.findIndex(row => headerColumns(row));
  if (headerIndex < 0) return [];
  const columns = headerColumns(table[headerIndex]);
  const rows = [];
  let marker = { monthDay: null, dayNumber: null };
  let dayNumber = 1;
  let previousTime = '';
  let place = '';

  for (const row of table.slice(headerIndex + 1)) {
    const dateText = columns.has('date') ? cellText(row, columns.get('date')) : '';
    const time = parseTimeRange(cellText(row, columns.get('time')));
    const title = normalizeSpaces(cellText(row, columns.get('detail')));
    const note = columns.has('note') ? normalizeSpaces(cellText(row, columns.get('note'))) : '';
    const placeText = columns.has('place') ? normalizeSpaces(cellText(row, columns.get('place'))) : '';
    if (placeText) place = placeText;
    if (!time && !title) continue;

    const rowTime = time ? (time.start || time.end) : '';
    if (normalizeSpaces(dateText)) {
      const monthDay = parseMonthDay(dateText);
      const explicitDay = parseDayNumber(dateText);
      if (monthDay || explicitDay) {
        dayNumber = explicitDay ?? (rows.length ? dayNumber + 1 : 1);
        marker = { monthDay, dayNumber };
      }
    } else if (startsNewDay(previousTime, rowTime)) {
      dayNumber += 1;
      marker = { monthDay: null, dayNumber };
    }
    previousTime = rowTime || previousTime;

    rows.push({
      monthDay: marker.monthDay,
      dayNumber,
      start: time?.start ?? '',
      end: time?.end ?? '',
      title: scheduleTitle(title, note),
      note,
      place
    });
  }
  return rows;
}

export function parseDetailedScheduleFromTables(tables) {
  return tables.flatMap(parseTable);
}
