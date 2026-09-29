import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCostMethod, costInputAmount, costMethodOf, costMethodOptions } from '../js/costMethods.js';
import { calculateExpenses } from '../js/engine.js';
import {
  createCustomFixedCost,
  fixedCostBasisText,
  fixedCostBreakdown,
  fixedCostExpenses,
  fixedCostStaffShares,
  normalizeFixedCosts
} from '../js/fixedCosts.js';
import { createExpense, createProject } from '../js/presets.js';
import { propagateSharedLinks, syncSharedCounts } from '../js/sharedCosts.js';
import { cloneExpensesForStaff } from '../js/staffDraft.js';
import { sharedWithText } from '../js/views/project/fixedCostSection.js';
import { withHeadcount } from './helpers.mjs';

const counts = { participants: 70, dayAbsent: 1, chaperones: 8 };
const entryOf = (fixedCosts, id) => normalizeFixedCosts(fixedCosts).find(entry => entry.id === id);
const busOf = project => normalizeFixedCosts(project.fixedCosts).find(entry => entry.builtin === 'bus');

test('기타비는 기본 항목(버스·숙소·보험) 뒤에 사용자 항목을 붙인다', () => {
  const entries = normalizeFixedCosts([
    { builtin: 'lodging', mode: 'total', amount: '1400000', memo: '2박' },
    createCustomFixedCost({ label: '체험 안전요원', mode: 'total', amount: 800000 })
  ]);
  assert.deepEqual(entries.map(entry => entry.label), ['버스비', '숙소비', '보험비', '체험 안전요원']);
  assert.equal(entries[0].includeChaperones, true, '버스비는 처음부터 인솔자와 나눈다');
  assert.equal(entries[1].amount, 1_400_000);
  assert.equal(entries[1].memo, '2박');
  assert.equal(entries[3].commonCost, false);
});

test('기타비의 공통비 체크를 켜면 신청 후 불참자도 그 항목을 부담한다', () => {
  const guard = entryOf([{ id: 'guard', label: '안전요원', mode: 'total', amount: 710000, commonCost: true }], 'guard');
  assert.equal(fixedCostBreakdown(guard, counts, { dayAbsentSharesCommonCost: true }).students, 71);
  const lodging = entryOf([{ builtin: 'lodging', commonCost: false, mode: 'total', amount: 700000 }], 'lodging');
  assert.equal(fixedCostBreakdown(lodging, counts, { dayAbsentSharesCommonCost: true }).students, 70, '숙소비도 공통비 체크를 끌 수 있다');
  const lodging2 = entryOf([{ builtin: 'lodging', mode: 'total', amount: 5_039_580 }], 'lodging');
  assert.equal(fixedCostBreakdown(lodging2, counts, { dayAbsentSharesCommonCost: false }).perPerson, 71990, '인원 화면에서 공통비 부담을 끄면 참여자만 나눈다');
});

test('전체 계약액: 인솔자도 함께 부담이면 학생+인솔자로 나누고, 1원 단위 버림이면 10원 단위로 맞춘다', () => {
  const options = { dayAbsentSharesCommonCost: true };
  const bus = entryOf([{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true, roundTo10: true }], 'bus');
  const withStaff = fixedCostBreakdown(bus, counts, options);
  assert.equal(withStaff.divisor, 79);
  assert.equal(withStaff.perPerson, 113920);
  assert.equal(withStaff.studentTotal, 8_088_320);
  assert.equal(withStaff.chaperoneTotal, 911_360);
  assert.equal(withStaff.remainder, 320, '113,920원 × 79명 = 8,999,680원, 잔액 320원');

  const noRounding = fixedCostBreakdown({ ...bus, roundTo10: false }, counts, options);
  assert.equal(noRounding.perPerson, 113924);
  assert.equal(noRounding.remainder, 4);

  const studentsOnly = fixedCostBreakdown({ ...bus, includeChaperones: false }, counts, options);
  assert.equal(studentsOnly.divisor, 71);
  assert.equal(studentsOnly.perPerson, 126760);
});

test('버림 잔액과 인솔자 몫은 인솔자 비용으로 넘어간다', () => {
  const project = createProject();
  project.fixedCosts = [{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true }, { builtin: 'insurance', mode: 'perPerson', amount: 1600 }];
  assert.deepEqual(fixedCostStaffShares(project, counts).map(share => [share.label, share.total]), [
    ['버스비 인솔자 몫', 911_360],
    ['버스비 버림 잔액', 320]
  ]);
});

test('입력한 기타비는 체험처 비용 뒤에 붙어 학생 비용 합계에 들어가고, 삭제한 기본 항목은 빠진다', () => {
  const project = withHeadcount(createProject(), { participants: 70 });
  project.fixedCosts = [
    { builtin: 'bus', mode: 'total', amount: 700000, includeChaperones: false },
    { builtin: 'lodging', mode: 'total', amount: 1400000 },
    { builtin: 'insurance', mode: 'perPerson', amount: 1600, removed: true },
    { id: 'custom-guard', label: '안전요원', mode: 'perPerson', amount: 5000 }
  ];
  project.expenses = [createExpense({ id: 'ticket', unitAmount: 30000 })];

  assert.deepEqual(fixedCostExpenses(project, { participants: 70, dayAbsent: 0, chaperones: 0 }).map(entry => entry.name), ['버스비', '숙소비', '안전요원']);
  const result = calculateExpenses(project);
  assert.deepEqual(result.rows.map(row => row.id), ['ticket', 'fixed-bus', 'fixed-lodging', 'fixed-custom-guard']);
  assert.equal(result.studentTotal, 700000 + 1400000 + 5000 * 70 + 30000 * 70);
  assert.deepEqual(fixedCostExpenses(createProject(), counts), [], '금액을 넣지 않은 기타비는 비용이 아니다');
});

test('계산방법은 단가 하나로 1인당·학생 총액(학생용), 1인당·총액(인솔자용)을 구분한다', () => {
  const perPerson = applyCostMethod('student', createExpense(), 'perParticipant', '15000');
  assert.equal(perPerson.quantityBase, 'participants');
  const studentTotal = applyCostMethod('student', perPerson, 'studentTotal', '15000');
  assert.equal(studentTotal.quantityBase, 'participantsPlusAbsent');
  assert.equal(costMethodOf('student', studentTotal), 'studentTotal');

  const staffTotal = applyCostMethod('staff', createExpense(), 'staffTotal', '50000');
  assert.equal(staffTotal.calcMethod, 'total');
  assert.equal(costInputAmount('staff', staffTotal), 50000);
  assert.deepEqual(costMethodOptions('staff').map(option => option.label), ['1인당 금액', '총액']);
});

test('인솔자용 초안은 학생용 단가를 인솔자 1인당 금액으로 복사한다', () => {
  const student = [applyCostMethod('student', createExpense({ name: '놀이공원' }), 'studentTotal', 30000)];
  const staff = cloneExpensesForStaff(student);
  assert.equal(costMethodOf('staff', staff[0]), 'perStaff');
  assert.equal(costInputAmount('staff', staff[0]), 30000);
  assert.notEqual(staff[0].id, student[0].id);
});

test('다른 학년과 함께 계산하면 그 인원을 더해 나누고, 더한 인원 몫은 이 사업 비용이 아니다', () => {
  const bus = entryOf([{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true, sharedPeople: 72, sharedNote: '1학년 72명' }], 'bus');
  const breakdown = fixedCostBreakdown(bus, { participants: 70, dayAbsent: 0, chaperones: 8 });
  assert.equal(breakdown.divisor, 150);
  assert.equal(breakdown.perPerson, 60000);
  assert.equal(breakdown.studentTotal, 4_200_000);
  assert.equal(breakdown.otherTotal, 4_320_000);
  assert.match(fixedCostBasisText(breakdown), /계산 인원 150명\(이 사업 학생 70명 \+ 인솔자 8명, 다른 학년 72명 포함\)/);
  assert.equal(fixedCostBreakdown(bus, { participants: 60, dayAbsent: 0, chaperones: 8 }).divisor, 140);
});

test('함께 계산하는 사업의 인원을 고치면 버스비 계산 인원이 따라 바뀌고, 삭제하면 연결이 빠진다', () => {
  const first = withHeadcount(createProject('1학년'), { participants: 69, regularAbsent: 1, chaperones: 8 });
  first.fixedCosts = [{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true }];
  const third = withHeadcount(createProject('3학년'), { participants: 60, chaperones: 10 });
  third.fixedCosts = [{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true, sharedProjectIds: [first.id] }];

  let state = syncSharedCounts({ school: {}, projects: [first, third] });
  assert.equal(busOf(state.projects[1]).sharedPeople, 78, '학생 69 + 신청 후 불참 1 + 인솔자 8');
  assert.equal(busOf(state.projects[1]).sharedNote, '1학년 78명');

  state.projects[0] = withHeadcount({ ...state.projects[0] }, { participants: 65, regularAbsent: 1, chaperones: 6 });
  state = syncSharedCounts(state);
  assert.equal(busOf(state.projects[1]).sharedPeople, 72);

  state = syncSharedCounts({ ...state, projects: [state.projects[1]] });
  assert.deepEqual(busOf(state.projects[0]).sharedProjectIds, []);
  assert.equal(busOf(state.projects[0]).sharedPeople, 0);
});

test('한쪽에서 함께 계산하면 상대 사업도 연결되고 계약액이 들어가며, 해제하면 양쪽이 풀린다', () => {
  const first = withHeadcount(createProject('1학년 수학여행'), { participants: 70, chaperones: 8 });
  const third = withHeadcount(createProject('3학년 수학여행'), { participants: 60, chaperones: 10 });
  const linkedThird = { ...third, fixedCosts: [{ builtin: 'bus', mode: 'total', amount: 9_000_000, includeChaperones: true, sharedProjectIds: [first.id] }] };

  let state = syncSharedCounts({ school: {}, projects: propagateSharedLinks([first, third], third, linkedThird) });
  const firstBus = busOf(state.projects[0]);
  assert.equal(firstBus.amount, 9_000_000);
  assert.deepEqual(firstBus.sharedProjectIds, [third.id]);
  assert.equal(firstBus.sharedPeople, 70, '3학년 학생 60 + 인솔자 10');
  assert.deepEqual(busOf(state.projects[1]).sharedTitles, ['1학년 수학여행']);
  assert.equal(sharedWithText(['1학년 수학여행']), '1학년 수학여행과 같이 계산');
  assert.equal(sharedWithText(['2학년 수련회']), '2학년 수련회와 같이 계산');

  const unlinked = { ...state.projects[1], fixedCosts: [{ ...busOf(state.projects[1]), sharedProjectIds: [] }] };
  state = syncSharedCounts({ school: {}, projects: propagateSharedLinks(state.projects, state.projects[1], unlinked) });
  assert.deepEqual(busOf(state.projects[0]).sharedProjectIds, []);
  assert.equal(busOf(state.projects[0]).sharedPeople, 0);
});
