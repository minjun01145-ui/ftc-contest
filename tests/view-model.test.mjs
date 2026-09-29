import assert from 'node:assert/strict';
import test from 'node:test';
import { createSampleProject as sampleProject } from '../js/sampleData.js';
import { PROJECT_SECTION } from '../js/projectSections.js';
import { cloneExpensesForStaff } from '../js/staffDraft.js';
import { renderProjectPage } from '../js/views/projectView.js';

test('기타비 입력은 사업정보가 아니라 체험처/비용 화면에 있다', () => {
  const business = renderProjectPage(sampleProject(), { name: '테스트중학교' }, PROJECT_SECTION.BUSINESS);
  const expenses = renderProjectPage(sampleProject(), { name: '테스트중학교' }, PROJECT_SECTION.EXPENSES);
  assert.doesNotMatch(business, /data-fixed-row/);
  assert.match(business, /name="executionMode"/);
  assert.doesNotMatch(business, /name="place"/, "사업정보에는 장소 칸이 없다");
  assert.equal((expenses.match(/data-fixed-row /g) ?? []).length, 3);
  assert.match(expenses, /data-action="add-fixed-cost"/);
  assert.match(expenses, /1원 단위 버림/);
});

test('사업 화면의 기본 진입은 사업정보다', () => {
  const html = renderProjectPage(sampleProject(), { name: '테스트중학교' });
  assert.match(html, /data-project-view="business"/);
  assert.match(html, /<legend>사업정보<\/legend>/);
});

test('학생용 비용을 인솔자용으로 복사하면 새 ID를 사용하고 세부정보를 복제한다', () => {
  const project = sampleProject();
  project.expenses[0].details = {
    arrivalTime: '08:30',
    departureTime: '09:00',
    contact: '02-000-0000'
  };

  const copied = cloneExpensesForStaff(project.expenses);

  assert.equal(copied.length, project.expenses.length);
  assert.notEqual(copied[0].id, project.expenses[0].id);
  assert.deepEqual(copied[0].details, project.expenses[0].details);
  copied[0].details.contact = '수정한 연락처';
  assert.equal(project.expenses[0].details.contact, '02-000-0000');
});
