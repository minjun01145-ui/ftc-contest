import { number } from './utils.js';

/**
 * 인원. 인원 화면에서 입력한 값만 저장하고, 참여 인원 등은 여기서 계산한다.
 *
 * project.totalStudents : 해당 학년 학생수
 * project.attendance = {
 *   applicants            신청자 수
 *   vulnerableApplicants  신청자 중 취약계층
 *   regularDayAbsent      신청 후 불참(비취약계층)
 *   vulnerableDayAbsent   신청 후 불참(취약계층)
 *   chaperones            인솔자 수
 * }
 * 실제 참여 = 신청자 − 신청 후 불참, 불참(미신청) = 학년 학생수 − 신청자
 */
export const ATTENDANCE_FIELDS = Object.freeze(['applicants', 'vulnerableApplicants', 'regularDayAbsent', 'vulnerableDayAbsent', 'chaperones']);

const count = value => Math.max(0, Math.floor(number(value)));

export function createAttendance() {
  return Object.fromEntries(ATTENDANCE_FIELDS.map(key => [key, 0]));
}

export function normalizeAttendance(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(ATTENDANCE_FIELDS.map(key => [key, count(source[key])]));
}

/** 입력한 인원이 서로 맞는지. 문제가 있으면 안내 문구 목록을 돌려준다. */
export function attendanceIssues(totalStudents, attendance) {
  const isCount = value => Number.isInteger(value) && value >= 0;
  const { applicants, vulnerableApplicants, regularDayAbsent, vulnerableDayAbsent, chaperones } = attendance;
  if (!isCount(totalStudents)) return ['해당 학년 학생수는 0 이상의 정수여야 합니다.'];
  if (!isCount(applicants)) return ['신청자 수는 0 이상의 정수여야 합니다.'];
  if (!isCount(vulnerableApplicants)) return ['신청자 중 취약계층 인원은 0 이상의 정수여야 합니다.'];
  if (!isCount(regularDayAbsent)) return ['신청 후 불참(비취약계층) 인원은 0 이상의 정수여야 합니다.'];
  if (!isCount(vulnerableDayAbsent)) return ['신청 후 불참(취약계층) 인원은 0 이상의 정수여야 합니다.'];
  if (!isCount(chaperones)) return ['인솔자 수는 0 이상의 정수여야 합니다.'];
  if (applicants > 0 && totalStudents <= 0) return ['해당 학년 학생수를 입력해 주세요.'];
  if (applicants > totalStudents) return [`신청자 ${applicants}명이 해당 학년 학생수 ${totalStudents}명을 초과합니다.`];
  if (vulnerableApplicants > applicants) {
    return [`신청자 중 취약계층 ${vulnerableApplicants}명이 신청자 수 ${applicants}명을 초과합니다.`];
  }
  if (vulnerableDayAbsent > vulnerableApplicants) {
    return [`신청 후 불참(취약계층) ${vulnerableDayAbsent}명이 취약계층 신청자 ${vulnerableApplicants}명을 초과합니다.`];
  }
  if (regularDayAbsent > applicants - vulnerableApplicants) {
    return [`신청 후 불참(비취약계층) ${regularDayAbsent}명이 비취약계층 신청자 ${applicants - vulnerableApplicants}명을 초과합니다.`];
  }
  return [];
}

export function summarizeAttendance(attendance, totalStudents) {
  const a = normalizeAttendance(attendance);
  const enrolled = count(totalStudents);
  const vulnerableParticipants = Math.max(0, a.vulnerableApplicants - a.vulnerableDayAbsent);
  const regularParticipants = Math.max(0, a.applicants - a.vulnerableApplicants - a.regularDayAbsent);
  return {
    enrolled,
    applicants: a.applicants,
    notApplied: Math.max(0, enrolled - a.applicants),
    participants: vulnerableParticipants + regularParticipants,
    vulnerableApplicants: a.vulnerableApplicants,
    vulnerableParticipants,
    regularParticipants,
    vulnerableAbsent: a.vulnerableDayAbsent,
    regularAbsent: a.regularDayAbsent,
    chaperones: a.chaperones,
    issues: attendanceIssues(enrolled, a)
  };
}
