import { number } from './utils.js';

/**
 * 체험처/비용 표의 "계산방법" 선택지. 표에는 단가(또는 총액) 하나만 입력하고,
 * 계산방법이 비용 항목의 calcMethod/quantityBase를 정한다. 둘 사이 변환은 이 모듈에서만 한다.
 *
 * 학생용
 * - perParticipant : 1인당 금액. 실제 참여 학생 수 × 단가 (신청 후 불참자 제외)
 * - studentTotal   : 학생 총액. (실제 참여 + 신청 후 불참) × 단가 — 신청 후 불참자도 부담한다.
 * 인솔자용
 * - perStaff       : 1인당 금액. 인솔자 수 × 단가
 * - staffTotal     : 총액. 입력한 금액 그대로
 */
const perPerson = quantityBase => ({
  matches: expense => expense.calcMethod === 'perPerson' && (quantityBase === null || expense.quantityBase === quantityBase),
  amountOf: expense => number(expense.unitAmount),
  apply: (expense, amount) => ({ ...expense, calcMethod: 'perPerson', quantityBase: quantityBase ?? 'participants', unitAmount: amount, planAmount: 0 })
});

const total = () => ({
  matches: expense => expense.calcMethod === 'total',
  amountOf: expense => number(expense.planAmount),
  apply: (expense, amount) => ({ ...expense, calcMethod: 'total', unitAmount: 0, planAmount: amount })
});

export const COST_METHODS = Object.freeze({
  student: Object.freeze([
    { value: 'perParticipant', label: '1인당 금액', ...perPerson('participants') },
    { value: 'studentTotal', label: '학생 총액(신청 후 불참 포함)', ...perPerson('participantsPlusAbsent') }
  ]),
  staff: Object.freeze([
    { value: 'perStaff', label: '1인당 금액', ...perPerson(null) },
    { value: 'staffTotal', label: '총액', ...total() }
  ])
});

function methodsFor(kind) {
  return COST_METHODS[kind] ?? COST_METHODS.student;
}

function methodOf(kind, expense) {
  const methods = methodsFor(kind);
  return methods.find(method => method.matches(expense)) ?? methods[0];
}

export function costMethodOf(kind, expense) {
  return methodOf(kind, expense).value;
}

export function costMethodOptions(kind) {
  return methodsFor(kind).map(({ value, label }) => ({ value, label }));
}

/** 표의 금액 입력칸에 보여 줄 값 */
export function costInputAmount(kind, expense) {
  return methodOf(kind, expense).amountOf(expense);
}

/** 표에서 고른 계산방법과 금액을 비용 항목 필드로 바꾼다. */
export function applyCostMethod(kind, expense, methodValue, amount) {
  const method = methodsFor(kind).find(item => item.value === methodValue) ?? methodsFor(kind)[0];
  return method.apply(expense, Math.max(0, number(amount)));
}
