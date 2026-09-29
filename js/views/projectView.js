import { PROJECT_SECTION, normalizeProjectSection } from '../projectSections.js';
import { escapeHtml, number } from '../utils.js';
import { readExpenseRows } from './expenseTable.js';
import { readBudgetInputs, renderBudgetSection } from './project/budgetSection.js';
import { renderBusinessInfoSection } from './project/businessInfoSection.js';
import { renderExpenseSections } from './project/expenseSections.js';
import { readFixedCostInputs } from './project/fixedCostSection.js';
import { readHeadcountInputs, renderHeadcountSection } from './project/headcountSection.js';
import { renderPreTripSection } from './project/preTripSection.js';
import { renderProposalSection } from './project/proposalSection.js';
import { renderSettlementSection } from './project/settlementSection.js';
import { renderTripScheduleSection } from './project/tripScheduleSection.js';
import { renderVerifySection } from './project/verifySection.js';
import { renderFormsSection } from './project/formsSection.js';

const SECTION_RENDERERS = Object.freeze({
  [PROJECT_SECTION.BUSINESS]: (project, school) => `${renderBusinessInfoSection(project, school)}${renderTripScheduleSection(project)}`,
  [PROJECT_SECTION.HEADCOUNT]: renderHeadcountSection,
  [PROJECT_SECTION.EXPENSES]: renderExpenseSections,
  [PROJECT_SECTION.BUDGET]: renderBudgetSection,
  [PROJECT_SECTION.PRE_TRIP]: renderPreTripSection,
  [PROJECT_SECTION.PROPOSAL]: renderProposalSection,
  [PROJECT_SECTION.VERIFY]: renderVerifySection,
  [PROJECT_SECTION.FORMS]: renderFormsSection,
  [PROJECT_SECTION.SETTLEMENT]: renderSettlementSection
});

/** 페이지 맨 위의 전체 저장 버튼. 이 페이지의 모든 입력을 한 번에 저장한다. */
export function saveAllBar(type = 'button') {
  return `
    <div class="save-all-bar no-print">
      <span class="unsaved-note" role="status">저장하지 않은 변경사항이 있습니다.</span>
      <button type="${type}" class="save-button save-all" ${type === 'button' ? 'data-action="save-all"' : ''}>전체 저장</button>
    </div>`;
}

export function renderProjectPage(project, school, requestedSection = PROJECT_SECTION.BUSINESS) {
  const section = normalizeProjectSection(requestedSection);
  return `
    <h1>${escapeHtml(project.title)}</h1>
    <form id="projectForm" data-project-id="${escapeHtml(project.id)}" data-project-view="${section}">
      ${saveAllBar()}
      ${SECTION_RENDERERS[section](project, school)}
    </form>`;
}

function applyHeadcount(next, data) {
  const headcount = readHeadcountInputs(data);
  if (!headcount) return;
  next.totalStudents = headcount.totalStudents;
  next.attendance = headcount.attendance;
  next.dayAbsentSharesCommonCost = headcount.dayAbsentSharesCommonCost;
}

/** 현재 화면에 있는 입력칸만 읽어 사업 데이터에 반영한다. 화면에 없는 값은 그대로 둔다. */
export function readProjectForm(form, previous) {
  const data = new FormData(form);
  const next = { ...previous };

  if (data.has('title')) next.title = String(data.get('title') ?? '').trim();
  if (data.has('startDate')) next.startDate = String(data.get('startDate') ?? '');
  if (data.has('endDate')) next.endDate = String(data.get('endDate') ?? '');
  if (data.has('grade')) next.grade = data.get('grade') ? number(data.get('grade')) : '';
  if (data.has('executionMode')) next.executionMode = String(data.get('executionMode') ?? '숙박형');
  applyHeadcount(next, data);

  next.fixedCosts = readFixedCostInputs(form, previous.fixedCosts);

  const budget = readBudgetInputs(form, data, previous);
  if (budget) Object.assign(next, budget);

  const studentTbody = form.querySelector('#studentExpenseTableBody');
  if (studentTbody) next.expenses = readExpenseRows(studentTbody, previous.expenses);

  const staffTbody = form.querySelector('#staffExpenseTableBody');
  if (staffTbody) next.staffExpenses = readExpenseRows(staffTbody, previous.staffExpenses ?? []);


  return next;
}
