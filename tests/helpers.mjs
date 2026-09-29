/**
 * 테스트용 인원 입력. 인원 화면에 넣는 값과 같다.
 * participants(실제 참여), vulnerable(참여 중 취약계층), regularAbsent·vulnerableAbsent(신청 후 불참)
 */
export function withHeadcount(project, { total, participants, vulnerable = 0, regularAbsent = 0, vulnerableAbsent = 0, chaperones = 0 }) {
  const applicants = participants + regularAbsent + vulnerableAbsent;
  project.totalStudents = total ?? applicants;
  project.attendance = {
    applicants,
    vulnerableApplicants: vulnerable + vulnerableAbsent,
    regularDayAbsent: regularAbsent,
    vulnerableDayAbsent: vulnerableAbsent,
    chaperones
  };
  return project;
}
