import { createOtherSupport } from './budget.js';
import { createExpense, createProject, createTripScheduleItem, normalizeState } from './presets.js';
import { absentLineId, EDUCATION_BUDGET_ID, STUDENT_BUDGET_ID, VULNERABLE_BUDGET_ID } from './proposalPlanner.js';
import { syncExpensesFromTripSchedule } from './tripSchedule.js';

// 가상의 학교. 첫 화면 '예시 사업 불러오기'와 테스트에서 쓴다.
const SCHEDULE = [
  ['2026-05-13', '부산', '07:00', '07:20', '학교 정문 출발', '인원 점검'],
  ['2026-05-13', '부산', '07:20', '11:30', '이동(휴게소 1회)', ''],
  ['2026-05-13', '서울', '12:00', '19:30', '놀이공원 체험 (중식·석식 포함)', '중식, 석식: 놀이공원 식당 쿠폰'],
  ['2026-05-13', '서울', '20:30', '', '숙소 도착 및 방 배정', ''],
  ['2026-05-14', '서울', '07:00', '08:30', '조식 후 숙소 출발', '조식: 숙소식'],
  ['2026-05-14', '서울', '09:30', '11:00', '뮤지컬 관람', ''],
  ['2026-05-14', '서울', '11:30', '13:00', '전통시장 투어 (중식 포함)', '중식: 현지식'],
  ['2026-05-14', '서울', '14:00', '16:00', '국립박물관 관람', ''],
  ['2026-05-14', '서울', '18:00', '19:30', '숙소 석식', '석식: 숙소식'],
  ['2026-05-15', '서울', '07:00', '08:30', '조식 후 숙소 출발', '조식: 숙소식'],
  ['2026-05-15', '서울', '09:00', '11:00', '고궁 관람', ''],
  ['2026-05-15', '경기', '12:00', '13:00', '중식(휴게소)', '중식: 현지식'],
  ['2026-05-15', '부산', '', '17:30', '학교 도착 및 해산', '']
];

// 일정에서 만들어지는 체험처 가운데 돈이 드는 항목의 1인당 금액
const PRICES = {
  '놀이공원 체험 (중식·석식 포함)': 31000,
  '뮤지컬 관람': 18000,
  '전통시장 투어 (중식 포함)': 10000,
  '숙소 석식': 15000,
  '국립박물관 관람': 0,
  '중식(휴게소)': 10000
};

export function createSampleProject() {
  const project = createProject('2학년 수학여행(예시)');
  project.grade = 2;
  project.startDate = '2026-05-13';
  project.endDate = '2026-05-15';
  project.totalStudents = 150;
  project.attendance = { applicants: 142, vulnerableApplicants: 18, regularDayAbsent: 1, vulnerableDayAbsent: 0, chaperones: 8 };

  project.tripSchedule.items = SCHEDULE.map(([date, place, arrivalTime, departureTime, name, contact]) =>
    createTripScheduleItem({ date, place, arrivalTime, departureTime, name, contact }));
  project.expenses = syncExpensesFromTripSchedule(project.tripSchedule, [])
    .map(expense => ({ ...expense, unitAmount: PRICES[expense.name] ?? 0 }))
    .filter(expense => expense.unitAmount > 0);
  // 조식(숙소식)은 일정 이름이 같아 날짜별로 따로 넣는다.
  project.expenses.push(
    createExpense({ date: '2026-05-14', name: '조식: 숙소식', unitAmount: 12000 }),
    createExpense({ date: '2026-05-15', name: '조식: 숙소식', unitAmount: 12000 })
  );
  project.expenses.sort((left, right) => left.date.localeCompare(right.date));

  project.fixedCosts = [
    { builtin: 'bus', mode: 'total', amount: 12_000_000, includeChaperones: true, roundTo10: true, commonCost: true, memo: '4대' },
    { builtin: 'lodging', mode: 'total', amount: 11_000_000, includeChaperones: false, roundTo10: true, commonCost: true, memo: '2박' },
    { builtin: 'insurance', mode: 'perPerson', amount: 2000, commonCost: false }
  ];
  project.educationSupport = { ...project.educationSupport, regularPerPerson: 220000, vulnerableMode: 'full', grantTotal: 32_040_000 };
  project.otherSupports = [createOtherSupport({ id: 'sample-school', name: '학교 자체지원금', source: 'school', mode: 'perPerson', amount: 20000 })];

  // 품의 도우미 배정: 담당자가 체크하듯 예산이 차는 만큼만 넣는다.
  const idOf = (date, name) => project.expenses.find(expense => expense.date === date && expense.name === name).id;
  const park = idOf('2026-05-13', '놀이공원 체험 (중식·석식 포함)');
  const musical = idOf('2026-05-14', '뮤지컬 관람');
  const market = idOf('2026-05-14', '전통시장 투어 (중식 포함)');
  const dinner = idOf('2026-05-14', '숙소 석식');
  const breakfast2 = idOf('2026-05-14', '조식: 숙소식');
  const lunch3 = idOf('2026-05-15', '중식(휴게소)');
  const breakfast3 = idOf('2026-05-15', '조식: 숙소식');
  const fixed = ['fixed-bus', 'fixed-lodging', 'fixed-insurance'];
  const add = (budgetId, lineIds) => lineIds.map(lineId => ({ budgetId, lineId }));
  project.proposalPlan = {
    allocations: [
      ...add(VULNERABLE_BUDGET_ID, [park, musical, market, dinner, breakfast2, lunch3, breakfast3, ...fixed]),
      ...add(EDUCATION_BUDGET_ID, [...fixed, park, musical, market, dinner]),
      ...add(EDUCATION_BUDGET_ID, [absentLineId('regular', 'fixed-bus'), absentLineId('regular', 'fixed-lodging')]),
      ...add('sample-school', [dinner, breakfast2]),
      ...add(STUDENT_BUDGET_ID, [breakfast2, lunch3, breakfast3])
    ]
  };
  return project;
}

export function createSampleState() {
  return normalizeState({
    school: { name: '예시중학교', level: '중', establishment: '공립' },
    projects: [createSampleProject()]
  });
}
