// participants는 실제 참여, vulnerable은 참여 중 취약계층
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
