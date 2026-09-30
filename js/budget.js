import { number, uid } from './utils.js';

/**
 * 예산 입력. 교육청 지원금은 project.educationSupport, 그 밖의 지원금은 project.otherSupports.
 * otherSupports의 source('school' | 'external')로 정산 서식의 학교부담/외부지원 칸을 나눈다.
 */
export const OTHER_SUPPORT_MODES = Object.freeze({
  perPerson: '1인당',
  total: '총액'
});

export const OTHER_SUPPORT_SOURCES = Object.freeze({
  school: '학교',
  external: '외부'
});

export const EDUCATION_MEMO_KEYS = Object.freeze(['regular', 'vulnerable', 'grant']);

export function createOtherSupport(overrides = {}) {
  return {
    id: uid('support'),
    name: '',
    source: 'school',
    mode: 'perPerson',
    amount: 0,
    memo: '',
    ...overrides
  };
}

export function normalizeEducationMemos(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(EDUCATION_MEMO_KEYS.map(key => [key, String(source[key] ?? '')]));
}

function normalizeOtherSupport(value) {
  const base = createOtherSupport();
  const source = value && typeof value === 'object' ? value : {};
  return {
    id: String(source.id || base.id),
    name: String(source.name ?? ''),
    source: Object.hasOwn(OTHER_SUPPORT_SOURCES, source.source) ? source.source : 'school',
    mode: Object.hasOwn(OTHER_SUPPORT_MODES, source.mode) ? source.mode : 'perPerson',
    amount: Math.max(0, Math.round(number(source.amount))),
    memo: String(source.memo ?? '')
  };
}

/** 저장된 기타 지원금 목록을 정리한다. */
export function normalizeOtherSupports(value) {
  return Array.isArray(value) ? value.map(normalizeOtherSupport) : [];
}

/** 비취약계층 참여 학생 1인당 쓸 수 있는 금액. 총액은 인원으로 나누고 원 단위 미만은 버린다. */
export function otherSupportPerPerson(support, regularParticipants) {
  const amount = Math.max(0, number(support?.amount));
  if (support?.mode === 'total') {
    const people = Math.max(0, Math.floor(number(regularParticipants)));
    return people > 0 ? Math.floor(amount / people) : 0;
  }
  return amount;
}
