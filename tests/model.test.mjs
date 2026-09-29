import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeState } from '../js/presets.js';

test('불러온 데이터의 ID를 유지하고 빠진 값을 기본값으로 채운다', () => {
  const state = normalizeState({
    school: { name: '테스트중학교' },
    projects: [{
      id: 'project-existing',
      title: '2학년 수학여행',
      expenses: [{ id: 'expense-existing', name: '입장료', unitAmount: '30000' }]
    }]
  });

  assert.deepEqual(state.school, { name: '테스트중학교', level: '중', establishment: '공립' });
  const project = state.projects[0];
  assert.equal(project.id, 'project-existing');
  assert.equal(project.expenses[0].id, 'expense-existing');
  assert.equal(project.expenses[0].unitAmount, 30000);
  assert.equal(project.educationSupport.vulnerableMode, 'full');
  assert.deepEqual(project.attendance, { applicants: 0, vulnerableApplicants: 0, regularDayAbsent: 0, vulnerableDayAbsent: 0, chaperones: 0 });
  assert.deepEqual(project.staffExpenses, []);
  assert.equal(project.dayAbsentSharesCommonCost, true);
});

test('학교급·설립 구분과 인원 입력값을 정리한다', () => {
  const state = normalizeState({
    school: { name: '예시초', level: '초', establishment: '사립' },
    projects: [{ title: '6학년 수련회', grade: 6, attendance: { applicants: '80', vulnerableApplicants: -1, chaperones: 4.7 } }]
  });
  assert.equal(state.school.level, '초');
  assert.equal(state.school.establishment, '사립');
  assert.equal(state.projects[0].grade, 6);
  assert.deepEqual(state.projects[0].attendance, { applicants: 80, vulnerableApplicants: 0, regularDayAbsent: 0, vulnerableDayAbsent: 0, chaperones: 4 });
  assert.equal(normalizeState({ school: { level: '대' } }).school.level, '중');
});

test('체험처 세부정보와 인솔자용 비용을 정리한다', () => {
  const state = normalizeState({
    school: {},
    projects: [{
      title: '세부정보 사업',
      expenses: [{ id: 'student-detail', name: '공연장', details: { arrivalTime: '13:00', departureTime: '15:00', contact: '02-0000-0000' } }],
      staffExpenses: [{ id: 'staff-detail', name: '공연장', calcMethod: 'total', planAmount: 50000 }]
    }]
  });

  const project = state.projects[0];
  assert.equal(project.expenses[0].details.contact, '02-0000-0000');
  assert.equal(project.staffExpenses[0].calcMethod, 'total');
  assert.deepEqual(project.staffExpenses[0].details, { arrivalTime: '', departureTime: '', contact: '' });
});
