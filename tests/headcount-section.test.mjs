import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAttendance } from '../js/attendance.js';
import { projectCounts } from '../js/engine.js';
import { createProject } from '../js/presets.js';
import { tripScheduleDateRange } from '../js/tripSchedule.js';
import { renderHeadcountSection } from '../js/views/project/headcountSection.js';
import { readProjectForm } from '../js/views/projectView.js';

function fakeForm(values) {
  const entries = Object.entries(values);
  globalThis.FormData = class {
    has(name) { return entries.some(([key]) => key === name); }
    get(name) { return entries.find(([key]) => key === name)?.[1] ?? null; }
  };
  return { querySelector: () => null };
}

test('일정 날짜 중 가장 이른 날과 늦은 날을 사업 기간으로 쓴다', () => {
  assert.deepEqual(tripScheduleDateRange([
    { date: '2026-05-14' }, { date: '' }, { date: '2026-05-13' }, { date: '2026-05-15' }, { date: '5/16' }
  ]), { startDate: '2026-05-13', endDate: '2026-05-15' });
  assert.equal(tripScheduleDateRange([{ date: '' }]), null);
});

test('해당 학년 학생수는 인원 화면에서 직접 입력하고, 학년 목록은 학교급을 따른다', () => {
  const project = createProject();
  project.grade = 2;
  project.totalStudents = 71;
  const html = renderHeadcountSection(project, { level: '중' });
  assert.match(html, /id="totalStudents" name="totalStudents" type="number" min="0" step="1" value="71"/);
  assert.match(html, /<label for="applicants">신청자 수<\/label>/);
  assert.match(html, /name="vulnerableApplicants"/);
  assert.equal((html.match(/학년<\/option>/g) ?? []).length, 3);
  assert.equal((renderHeadcountSection(project, { level: '초' }).match(/학년<\/option>/g) ?? []).length, 6, '초등학교는 1~6학년');
});

test('신청 60명(비취약 51, 취약 9) 중 비취약 2명이 신청 후 불참하면 비취약 참여는 49명이다', () => {
  const next = readProjectForm(fakeForm({
    grade: '2', totalStudents: '72', applicants: '60', vulnerableApplicants: '9',
    dayAbsentStudents: '2', vulnerableDayAbsentStudents: '0', chaperones: '6', dayAbsentSharesCommonCost: 'on'
  }), createProject());
  const summary = summarizeAttendance(next.attendance, next.totalStudents);

  assert.equal(next.grade, 2);
  assert.equal(next.dayAbsentSharesCommonCost, true);
  assert.equal(summary.participants, 58);
  assert.equal(summary.regularParticipants, 49);
  assert.equal(summary.vulnerableParticipants, 9);
  assert.equal(summary.notApplied, 12);
  assert.deepEqual(summary.issues, []);
  assert.equal(projectCounts(next).contractedAbsent, 2);
  assert.equal(projectCounts(next).chaperones, 6);

  const html = renderHeadcountSection(next, { level: '중' });
  assert.match(html, /id="applicants"[^>]*value="60"/);
  assert.match(html, /id="notAppliedStudents"[^>]*value="12"/);
  assert.match(html, /58명 \(비취약계층 49명, 취약계층 9명\)/);
});

test('취약계층 신청 후 불참은 취약계층 참여에서 빠진다', () => {
  const next = readProjectForm(fakeForm({
    totalStudents: '72', applicants: '60', vulnerableApplicants: '9', dayAbsentStudents: '0', vulnerableDayAbsentStudents: '1'
  }), createProject());
  const summary = summarizeAttendance(next.attendance, next.totalStudents);
  assert.equal(summary.vulnerableParticipants, 8);
  assert.equal(summary.vulnerableAbsent, 1);
  assert.equal(summary.regularParticipants, 51);
});
