import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceIssues, summarizeAttendance } from '../js/attendance.js';
import { calculateExpenses, projectCounts } from '../js/engine.js';
import { createExpense, createProject } from '../js/presets.js';
import { withHeadcount } from './helpers.mjs';

test('인원 입력에서 실제 참여·신청 후 불참·미신청을 계산한다', () => {
  const project = withHeadcount(createProject(), { total: 72, participants: 70, vulnerable: 17, regularAbsent: 1, chaperones: 8 });
  const counts = projectCounts(project);

  assert.equal(counts.participants, 70);
  assert.equal(counts.regularParticipants, 53);
  assert.equal(counts.vulnerableParticipants, 17);
  assert.equal(counts.contractedAbsent, 1);
  assert.equal(counts.participantsPlusAbsent, 71);
  assert.equal(counts.chaperones, 8);
  assert.equal(summarizeAttendance(project.attendance, project.totalStudents).notApplied, 1);
});

test('1인당 금액은 참여 학생, 학생 총액은 참여 + 신청 후 불참 학생 수로 곱한다', () => {
  const project = withHeadcount(createProject(), { participants: 68, regularAbsent: 2 });
  project.expenses = [
    createExpense({ id: 'per', unitAmount: 1000, quantityBase: 'participants' }),
    createExpense({ id: 'total', unitAmount: 1000, quantityBase: 'participantsPlusAbsent' })
  ];
  const rows = calculateExpenses(project).rows;
  assert.equal(rows.find(row => row.id === 'per').studentTotal, 68_000);
  assert.equal(rows.find(row => row.id === 'total').studentTotal, 70_000);
});

test('인원이 서로 맞지 않으면 알려 준다', () => {
  const base = { applicants: 60, vulnerableApplicants: 9, regularDayAbsent: 0, vulnerableDayAbsent: 0, chaperones: 0 };
  assert.deepEqual(attendanceIssues(72, base), []);
  assert.match(attendanceIssues(50, base)[0], /초과/);
  assert.match(attendanceIssues(72, { ...base, vulnerableApplicants: 61 })[0], /취약계층/);
  assert.match(attendanceIssues(72, { ...base, vulnerableDayAbsent: 10 })[0], /취약계층/);
  assert.match(attendanceIssues(72, { ...base, regularDayAbsent: 52 })[0], /비취약계층/);
  assert.match(attendanceIssues(0, base)[0], /학생수/);
  assert.match(attendanceIssues(72, { ...base, applicants: 1.5 })[0], /정수/);
});
