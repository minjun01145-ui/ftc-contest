import { number, uid } from './utils.js';

// mode가 total이면 계약액을 인원으로 나누고, 남은 금액(인솔자 몫, 버림 잔액)은 인솔자 비용으로 넘긴다.
// sharedPeople은 다른 학년과 함께 계산할 때 더하는 인원(sharedCosts.js).
export const FIXED_COST_MODES = Object.freeze({
  perPerson: '1인당 금액',
  total: '전체 계약액'
});

export const BUILTIN_FIXED_COSTS = Object.freeze([
  Object.freeze({ key: 'bus', label: '버스비', category: 'vehicle', commonCost: true, mode: 'total', includeChaperones: true }),
  Object.freeze({ key: 'lodging', label: '숙소비', category: 'lodging', commonCost: true, mode: 'total', includeChaperones: false }),
  Object.freeze({ key: 'insurance', label: '보험비', category: 'insurance', commonCost: false, mode: 'perPerson', includeChaperones: false })
]);

export const FIXED_COST_EXPENSE_ID_PREFIX = 'fixed-';

function builtinEntry(builtin, source = {}) {
  return normalizeEntry({ ...source, id: builtin.key, builtin: builtin.key, label: builtin.label }, builtin);
}

export function createCustomFixedCost(overrides = {}) {
  return normalizeEntry({ id: uid('custom'), builtin: null, label: '', mode: 'perPerson', ...overrides });
}

export function createFixedCosts() {
  return BUILTIN_FIXED_COSTS.map(builtin => builtinEntry(builtin));
}

function normalizeEntry(source, builtin = null) {
  return {
    id: String(source.id || uid('custom')),
    builtin: builtin ? builtin.key : null,
    label: builtin ? builtin.label : String(source.label ?? ''),
    mode: Object.hasOwn(FIXED_COST_MODES, source.mode) ? source.mode : (builtin?.mode ?? 'perPerson'),
    amount: Math.max(0, Math.round(number(source.amount))),
    includeChaperones: typeof source.includeChaperones === 'boolean' ? source.includeChaperones : Boolean(builtin?.includeChaperones),
    roundTo10: typeof source.roundTo10 === 'boolean' ? source.roundTo10 : true,
    sharedPeople: Math.max(0, Math.floor(number(source.sharedPeople))),
    sharedNote: String(source.sharedNote ?? ''),
    sharedProjectIds: Array.isArray(source.sharedProjectIds) ? source.sharedProjectIds.map(String).filter(Boolean) : [],
    sharedTitles: Array.isArray(source.sharedTitles) ? source.sharedTitles.map(String) : [],
    // 공통비: 신청 후 불참자도 부담하는 항목(버스비·숙소비는 처음부터 체크). 사용자가 바꿀 수 있다.
    commonCost: typeof source.commonCost === 'boolean' ? source.commonCost : Boolean(builtin?.commonCost),
    removed: builtin ? Boolean(source.removed) : false,
    memo: String(source.memo ?? '')
  };
}

// 기본 항목은 항상 앞에, 사용자가 추가한 항목은 뒤에
export function normalizeFixedCosts(value) {
  const entries = Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
  const builtins = BUILTIN_FIXED_COSTS.map(builtin => builtinEntry(builtin, entries.find(entry => entry.builtin === builtin.key)));
  const custom = entries.filter(entry => !entry.builtin).map(entry => normalizeEntry(entry));
  return [...builtins, ...custom];
}

export function activeFixedCosts(value) {
  return normalizeFixedCosts(value).filter(entry => !entry.removed);
}

export function fixedCostLineId(entry) {
  return `${FIXED_COST_EXPENSE_ID_PREFIX}${entry.id}`;
}

const floorTo = (value, unit) => Math.floor(value / unit) * unit;
const won = value => `${Math.round(number(value)).toLocaleString('ko-KR')}원`;

// counts: { participants, dayAbsent, chaperones }
export function fixedCostBreakdown(entry, counts, { dayAbsentSharesCommonCost = false } = {}) {
  const amount = Math.max(0, number(entry?.amount));
  const includesDayAbsent = Boolean(entry?.commonCost && dayAbsentSharesCommonCost);
  const dayAbsent = includesDayAbsent ? Math.max(0, number(counts.dayAbsent)) : 0;
  const students = Math.max(0, number(counts.participants)) + dayAbsent;
  const base = { amount, students, includesDayAbsent, dayAbsent };

  if (entry?.mode === 'perPerson') {
    return { ...base, mode: 'perPerson', perPerson: amount, chaperones: 0, divisor: students, studentTotal: amount * students, chaperoneTotal: 0, remainder: 0, roundTo10: false };
  }
  const chaperones = entry?.includeChaperones ? Math.max(0, number(counts.chaperones)) : 0;
  const ownPeople = students + chaperones;
  // 다른 학년과 함께 계산하면 그 인원을 더해 나눈다.
  const divisor = ownPeople + Math.max(0, Math.floor(number(entry?.sharedPeople)));
  const otherPeople = divisor - ownPeople;
  const perPerson = divisor > 0 && students > 0 ? floorTo(amount / divisor, entry?.roundTo10 ? 10 : 1) : 0;
  const studentTotal = perPerson * students;
  const chaperoneTotal = perPerson * chaperones;
  const otherTotal = perPerson * otherPeople;
  return {
    ...base,
    mode: 'total',
    perPerson,
    chaperones,
    divisor,
    customHeadcount: divisor !== ownPeople,
    otherPeople,
    otherTotal,
    studentTotal,
    chaperoneTotal,
    remainder: students > 0 ? amount - studentTotal - chaperoneTotal - otherTotal : 0,
    roundTo10: Boolean(entry?.roundTo10)
  };
}

// 산출내역 비고란에 들어가는 문구
export function fixedCostBasisText(breakdown) {
  const absent = breakdown.includesDayAbsent && breakdown.dayAbsent > 0 ? `(신청 후 불참 ${breakdown.dayAbsent}명 포함)` : '';
  if (breakdown.mode === 'perPerson') return `1인당 금액 ${won(breakdown.perPerson)} 입력, 학생 ${breakdown.students}명${absent}`;
  const people = breakdown.chaperones > 0
    ? `(학생 ${breakdown.students}명${absent} + 인솔자 ${breakdown.chaperones}명)`
    : `학생 ${breakdown.students}명${absent}`;
  const rounding = breakdown.remainder > 0 ? `, ${breakdown.roundTo10 ? '1원 단위' : '원 미만'} 버림` : '';
  if (breakdown.customHeadcount) {
    const others = breakdown.otherPeople > 0 ? `, 다른 학년 ${breakdown.otherPeople}명 포함` : '';
    const own = `학생 ${breakdown.students}명${absent}${breakdown.chaperones > 0 ? ` + 인솔자 ${breakdown.chaperones}명` : ''}`;
    return `총액 ${won(breakdown.amount)} ÷ 계산 인원 ${breakdown.divisor}명(이 사업 ${own}${others})${rounding}`;
  }
  return `총액 ${won(breakdown.amount)} ÷ ${people}${rounding}`;
}

function countsOptions(project) {
  return { dayAbsentSharesCommonCost: Boolean(project?.dayAbsentSharesCommonCost) };
}

// 1인당 금액을 미리 계산해 두면 엔진은 다른 체험처처럼 1인당 금액 × 인원으로 계산하면 된다.
export function fixedCostExpenses(project, counts) {
  return activeFixedCosts(project?.fixedCosts)
    .filter(entry => entry.amount > 0)
    .map(entry => {
      const breakdown = fixedCostBreakdown(entry, counts, countsOptions(project));
      return {
        id: fixedCostLineId(entry),
        fixedCostKey: entry.id,
        date: '',
        name: entry.label || '기타비',
        description: entry.memo,
        basis: fixedCostBasisText(breakdown),
        category: BUILTIN_FIXED_COSTS.find(builtin => builtin.key === entry.builtin)?.category ?? 'other',
        costOwner: 'student',
        calcMethod: 'perPerson',
        quantityBase: breakdown.includesDayAbsent ? 'participantsPlusAbsent' : 'participants',
        unitAmount: breakdown.perPerson,
        planAmount: 0,
        actualAmount: null,
        rounding: 'floor10',
        customQuantity: 0,
        customCohorts: null,
        note: ''
      };
    });
}

export function fixedCostStaffShares(project, counts) {
  return activeFixedCosts(project?.fixedCosts)
    .filter(entry => entry.amount > 0 && entry.mode === 'total')
    .flatMap(entry => {
      const breakdown = fixedCostBreakdown(entry, counts, countsOptions(project));
      const label = entry.label || '기타비';
      const shares = [];
      if (breakdown.chaperoneTotal > 0) {
        shares.push({ id: `${entry.id}-chaperones`, label: `${label} 인솔자 몫`, kind: 'chaperones', count: breakdown.chaperones, perPerson: breakdown.perPerson, total: breakdown.chaperoneTotal });
      }
      if (breakdown.remainder > 0) {
        shares.push({ id: `${entry.id}-remainder`, label: `${label} 버림 잔액`, kind: 'remainder', count: null, perPerson: null, total: breakdown.remainder });
      }
      return shares;
    });
}
