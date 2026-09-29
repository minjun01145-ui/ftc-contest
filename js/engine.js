import { summarizeAttendance } from './attendance.js';
import { fixedCostExpenses } from './fixedCosts.js';
import { number } from './utils.js';

/**
 * 계산에 쓰는 인원. 인원 화면의 입력값(project.attendance)에서 계산한다.
 * contractedAbsent: 신청 후 불참(취약 + 비취약). 계약한 뒤 빠진 학생이라 공통비를 부담할 수 있다.
 */
export function projectCounts(project) {
  const s = summarizeAttendance(project.attendance, project.totalStudents);
  const contractedAbsent = s.vulnerableAbsent + s.regularAbsent;
  return {
    total: s.enrolled,
    participants: s.participants,
    vulnerableParticipants: s.vulnerableParticipants,
    regularParticipants: s.regularParticipants,
    contractedAbsent,
    vulnerableContractedAbsent: s.vulnerableAbsent,
    regularContractedAbsent: s.regularAbsent,
    participantsPlusAbsent: s.participants + contractedAbsent,
    chaperones: s.chaperones
  };
}

/** 학생 비용 항목의 인원: 참여 학생, 또는 참여 + 신청 후 불참(학생 총액) */
function quantityFor(expense, counts) {
  return expense.quantityBase === 'participantsPlusAbsent' ? counts.participantsPlusAbsent : counts.participants;
}

/** 학생 비용 항목 하나: 1인당 금액 × 인원 */
export function calculateExpense(expense, project) {
  const studentQty = quantityFor(expense, projectCounts(project));
  const unit = Math.max(0, number(expense.unitAmount));
  return { ...expense, studentQty, unit, studentTotal: Math.max(0, Math.round(unit * studentQty)) };
}

// 기타비는 체험처 표와 따로 저장하지만, 비용 합계에는 체험처 비용과 함께 들어간다.
export function studentExpenseItems(project) {
  const counts = projectCounts(project);
  const fixed = fixedCostExpenses(project, {
    participants: counts.participants,
    dayAbsent: counts.contractedAbsent,
    chaperones: counts.chaperones
  });
  return [...(project.expenses ?? []), ...fixed];
}

export function calculateExpenses(project) {
  const rows = studentExpenseItems(project).map(expense => calculateExpense(expense, project));
  return { rows, studentTotal: rows.reduce((sum, row) => sum + row.studentTotal, 0) };
}
