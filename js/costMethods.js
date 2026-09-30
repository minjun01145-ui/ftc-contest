import { number } from './utils.js';

// perParticipant: 참여 학생 수 × 단가, studentTotal: (참여 + 신청 후 불참) × 단가
// perStaff: 인솔자 수 × 단가, staffTotal: 입력한 총액
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

export function costInputAmount(kind, expense) {
  return methodOf(kind, expense).amountOf(expense);
}

export function applyCostMethod(kind, expense, methodValue, amount) {
  const method = methodsFor(kind).find(item => item.value === methodValue) ?? methodsFor(kind)[0];
  return method.apply(expense, Math.max(0, number(amount)));
}
