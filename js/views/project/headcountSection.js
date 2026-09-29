import { normalizeAttendance, summarizeAttendance } from '../../attendance.js';
import { gradesFor } from '../../presets.js';
import { escapeHtml, number } from '../../utils.js';

function countInput(value) {
  const text = String(value ?? '').trim();
  return text === '' ? 0 : Number(text);
}

/**
 * 폼의 인원 입력칸을 읽는다. 폼에 인원 입력칸이 없으면 null.
 * 값은 검사하기 전의 숫자 그대로 돌려준다(저장 전에 attendanceIssues로 검사한다).
 */
export function readHeadcountInputs(data) {
  if (!data.has('applicants')) return null;
  return {
    totalStudents: countInput(data.get('totalStudents')),
    attendance: {
      applicants: countInput(data.get('applicants')),
      vulnerableApplicants: countInput(data.get('vulnerableApplicants')),
      regularDayAbsent: countInput(data.get('dayAbsentStudents')),
      vulnerableDayAbsent: countInput(data.get('vulnerableDayAbsentStudents')),
      chaperones: countInput(data.get('chaperones'))
    },
    dayAbsentSharesCommonCost: data.has('dayAbsentSharesCommonCost')
  };
}

export function participantsText({ regularParticipants, vulnerableParticipants, participants }) {
  return `${participants}명 (비취약계층 ${regularParticipants}명, 취약계층 ${vulnerableParticipants}명)`;
}

/** 입력하는 동안 불참(미신청)과 실제 참여 인원을 바로 다시 계산해 보여 준다. */
export function refreshHeadcountSummary(form) {
  const summary = form?.querySelector('[data-participants-summary]');
  if (!summary) return;
  const value = name => countInput(form.elements[name]?.value);
  const total = form.elements.totalStudents?.value;
  const result = summarizeAttendance({
    applicants: value('applicants'),
    vulnerableApplicants: value('vulnerableApplicants'),
    regularDayAbsent: value('dayAbsentStudents'),
    vulnerableDayAbsent: value('vulnerableDayAbsentStudents')
  }, total);
  summary.textContent = participantsText(result);
  const notApplied = form.querySelector('#notAppliedStudents');
  if (notApplied) notApplied.value = total === '' || total == null ? '' : String(result.notApplied);
}

export function renderHeadcountSection(project, school = {}) {
  const grades = gradesFor(school.level);
  const grade = grades.includes(Number(project.grade)) ? Number(project.grade) : '';
  const gradeOptions = grades.map(value => `<option value="${value}" ${value === grade ? 'selected' : ''}>${value}학년</option>`).join('');
  const gradeTotal = number(project.totalStudents) > 0 ? number(project.totalStudents) : '';
  const values = normalizeAttendance(project.attendance);
  const summary = summarizeAttendance(values, project.totalStudents);
  const notApplied = gradeTotal === '' ? '' : summary.notApplied;

  return `
    <fieldset class="section-fieldset" data-project-section="headcount">
      <legend>인원</legend>
      <div class="form-grid">
        <label for="projectGrade">대상 학년</label>
        <select id="projectGrade" name="grade">
          <option value="">학년 선택</option>
          ${gradeOptions}
        </select>
        <label for="totalStudents">해당 학년 학생수</label>
        <input id="totalStudents" name="totalStudents" type="number" min="0" step="1" value="${escapeHtml(gradeTotal)}" data-headcount-input>

        <label for="applicants">신청자 수</label>
        <input id="applicants" name="applicants" type="number" min="0" step="1" value="${number(values.applicants)}" data-headcount-input>
        <label for="vulnerableApplicants">신청자 중 취약계층</label>
        <input id="vulnerableApplicants" name="vulnerableApplicants" type="number" min="0" step="1" value="${number(values.vulnerableApplicants)}" data-headcount-input>

        <label for="dayAbsentStudents">신청 후 불참(비취약계층)</label>
        <input id="dayAbsentStudents" name="dayAbsentStudents" type="number" min="0" step="1" value="${number(values.regularDayAbsent)}" data-headcount-input>
        <label for="vulnerableDayAbsentStudents">신청 후 불참(취약계층)</label>
        <input id="vulnerableDayAbsentStudents" name="vulnerableDayAbsentStudents" type="number" min="0" step="1" value="${number(values.vulnerableDayAbsent)}" data-headcount-input>

        <span></span>
        <label class="checkbox-label inline-check" for="dayAbsentSharesCommonCost">
          <input id="dayAbsentSharesCommonCost" name="dayAbsentSharesCommonCost" type="checkbox" ${project.dayAbsentSharesCommonCost ? 'checked' : ''}>
          신청 후 불참자 공통비 부담
        </label>
        <label for="notAppliedStudents">불참(미신청)</label>
        <input id="notAppliedStudents" type="number" readonly tabindex="-1" value="${escapeHtml(notApplied)}">

        <label for="chaperones">인솔자 수</label>
        <input id="chaperones" name="chaperones" type="number" min="0" step="1" value="${number(values.chaperones)}">
        <span></span><span></span>

        <label for="participantsSummary">실제 참여</label>
        <output id="participantsSummary" class="headcount-summary" data-participants-summary>${participantsText(summary)}</output>
      </div>
    </fieldset>`;
}
