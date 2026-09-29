export const PROJECT_SECTION = Object.freeze({
  BUSINESS: 'business',
  HEADCOUNT: 'headcount',
  EXPENSES: 'expenses',
  BUDGET: 'budget',
  PRE_TRIP: 'preTrip',
  PROPOSAL: 'proposal',
  VERIFY: 'verify',
  FORMS: 'forms',
  SETTLEMENT: 'settlement'
});

export const PROJECT_SECTION_ITEMS = Object.freeze([
  { key: PROJECT_SECTION.BUSINESS, label: '사업정보' },
  { key: PROJECT_SECTION.HEADCOUNT, label: '인원' },
  { key: PROJECT_SECTION.EXPENSES, label: '체험처/비용' },
  { key: PROJECT_SECTION.BUDGET, label: '예산 관리' },
  { key: PROJECT_SECTION.PRE_TRIP, label: '학생 1인별 금액 산출내역 보기' },
  { key: PROJECT_SECTION.PROPOSAL, label: '품의 도우미(예산 배정)' },
  { key: PROJECT_SECTION.VERIFY, label: '검증 도우미' },
  { key: PROJECT_SECTION.FORMS, label: '양식 생성기' },
  { key: PROJECT_SECTION.SETTLEMENT, label: '정산' }
]);

const validSections = new Set(PROJECT_SECTION_ITEMS.map(item => item.key));

// 없는 메뉴 이름이면 사업정보를 연다.
export function normalizeProjectSection(value) {
  return validSections.has(value) ? value : PROJECT_SECTION.BUSINESS;
}
