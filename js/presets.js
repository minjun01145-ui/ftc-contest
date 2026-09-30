import { createAttendance, normalizeAttendance } from './attendance.js';
import { normalizeEducationMemos, normalizeOtherSupports } from './budget.js';
import { createFixedCosts, normalizeFixedCosts } from './fixedCosts.js';
import { createProposalPlan, normalizeProposalPlan } from './proposalPlan.js';
import { number, uid } from './utils.js';

// state = { school: { name, level, establishment }, projects: [project] }
export const SCHOOL_LEVELS = Object.freeze(['초', '중', '고']);
export const ESTABLISHMENTS = Object.freeze(['공립', '사립', '국립']);

export function gradesFor(level) {
  return level === '초' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3];
}

export function createExpense(overrides = {}) {
  return {
    id: uid('expense'),
    sourceScheduleItemId: null,
    date: '',
    name: '',
    calcMethod: 'perPerson',
    quantityBase: 'participants',
    category: 'other',
    unitAmount: 0,
    planAmount: 0,
    paidStaffCount: null,
    note: '',
    details: {
      arrivalTime: '',
      departureTime: '',
      contact: ''
    },
    ...overrides
  };
}

export function createTripScheduleItem(overrides = {}) {
  return {
    id: uid('schedule'),
    date: '',
    place: '',
    name: '',
    arrivalTime: '',
    departureTime: '',
    contact: '',
    ...overrides
  };
}

export function createProject(title = '새 사업') {
  return {
    id: uid('project'),
    title,
    grade: '',
    executionMode: '숙박형',
    startDate: '',
    endDate: '',
    tripSchedule: {
      items: [],
      importedFrom: null
    },
    fixedCosts: createFixedCosts(),
    dayAbsentSharesCommonCost: true,
    totalStudents: 0,
    attendance: createAttendance(),
    educationSupport: {
      regularPerPerson: 0,
      vulnerableMode: 'full',
      vulnerablePerPerson: 0,
      grantTotal: null,
      memos: normalizeEducationMemos()
    },
    otherSupports: [],
    proposalPlan: createProposalPlan(),
    expenses: [],
    staffExpenses: []
  };
}

export const defaultState = {
  school: { name: '', level: '중', establishment: '공립' },
  projects: []
};

function normalizeExpense(expense) {
  const base = createExpense();
  const source = expense && typeof expense === 'object' ? expense : {};
  return {
    ...base,
    id: String(source.id || base.id),
    sourceScheduleItemId: source.sourceScheduleItemId ? String(source.sourceScheduleItemId) : null,
    date: String(source.date ?? ''),
    name: String(source.name ?? ''),
    calcMethod: source.calcMethod === 'total' ? 'total' : 'perPerson',
    quantityBase: ['participants', 'participantsPlusAbsent'].includes(source.quantityBase) ? source.quantityBase : 'participants',
    category: ['vehicle', 'lodging', 'meal', 'ticket', 'insurance', 'culture', 'other'].includes(source.category) ? source.category : 'other',
    unitAmount: Math.max(0, number(source.unitAmount)),
    planAmount: Math.max(0, number(source.planAmount)),
    paidStaffCount: source.paidStaffCount === '' || source.paidStaffCount == null ? null : Math.max(0, number(source.paidStaffCount)),
    note: String(source.note ?? ''),
    details: {
      arrivalTime: String(source.details?.arrivalTime ?? ''),
      departureTime: String(source.details?.departureTime ?? ''),
      contact: String(source.details?.contact ?? '')
    }
  };
}

function normalizeTripScheduleItem(item) {
  const base = createTripScheduleItem();
  const source = item && typeof item === 'object' ? item : {};
  return {
    ...base,
    id: String(source.id || base.id),
    date: String(source.date ?? ''),
    place: String(source.place ?? ''),
    name: String(source.name ?? ''),
    arrivalTime: String(source.arrivalTime ?? ''),
    departureTime: String(source.departureTime ?? ''),
    contact: String(source.contact ?? '')
  };
}

function normalizeImportSource(value) {
  if (!value || typeof value !== 'object') return null;
  const importedAt = String(value.importedAt ?? '');
  if (!importedAt || Number.isNaN(Date.parse(importedAt))) return null;
  return { filename: String(value.filename ?? ''), importedAt };
}

function normalizeTripSchedule(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    items: Array.isArray(source.items) ? source.items.map(normalizeTripScheduleItem) : [],
    importedFrom: normalizeImportSource(source.importedFrom)
  };
}

function normalizeProject(project) {
  const source = project && typeof project === 'object' ? project : {};
  const base = createProject(String(source.title ?? '새 사업'));
  const education = source.educationSupport ?? {};
  return {
    ...base,
    id: String(source.id || base.id),
    title: String(source.title ?? base.title),
    grade: source.grade === '' || source.grade == null ? '' : Math.max(1, Math.min(6, Math.floor(number(source.grade)))),
    executionMode: String(source.executionMode ?? base.executionMode),
    startDate: String(source.startDate ?? ''),
    endDate: String(source.endDate ?? ''),
    tripSchedule: normalizeTripSchedule(source.tripSchedule),
    fixedCosts: normalizeFixedCosts(source.fixedCosts),
    // 기본은 신청 후 불참자도 공통비를 부담한다(저장된 값이 없을 때).
    dayAbsentSharesCommonCost: source.dayAbsentSharesCommonCost === undefined ? true : Boolean(source.dayAbsentSharesCommonCost),
    totalStudents: Math.max(0, Math.floor(number(source.totalStudents))),
    attendance: normalizeAttendance(source.attendance),
    educationSupport: {
      regularPerPerson: Math.max(0, number(education.regularPerPerson)),
      vulnerableMode: education.vulnerableMode === 'perPerson' ? 'perPerson' : 'full',
      vulnerablePerPerson: Math.max(0, number(education.vulnerablePerPerson)),
      grantTotal: education.grantTotal === '' || education.grantTotal == null ? null : Math.max(0, number(education.grantTotal)),
      memos: normalizeEducationMemos(education.memos)
    },
    otherSupports: normalizeOtherSupports(source.otherSupports),
    proposalPlan: normalizeProposalPlan(source.proposalPlan),
    expenses: Array.isArray(source.expenses) ? source.expenses.map(normalizeExpense) : [],
    staffExpenses: Array.isArray(source.staffExpenses) ? source.staffExpenses.map(normalizeExpense) : []
  };
}

export function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const school = source.school && typeof source.school === 'object' ? source.school : {};
  return {
    school: {
      name: String(school.name ?? ''),
      level: SCHOOL_LEVELS.includes(school.level) ? school.level : defaultState.school.level,
      establishment: ESTABLISHMENTS.includes(school.establishment) ? school.establishment : defaultState.school.establishment
    },
    projects: Array.isArray(source.projects) ? source.projects.map(normalizeProject) : []
  };
}
