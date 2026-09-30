import { scheduleUploadErrorMessage, validateScheduleFiles } from '../services/scheduleUpload.js';
import { syncExpensesFromTripSchedule, tripScheduleDateRange } from '../tripSchedule.js';
import {
  newTripScheduleRowHtml,
  readTripScheduleSection,
  replaceTripScheduleDraft,
  scheduleEditBody,
  setTripScheduleEditing,
  setTripScheduleUploadStatus,
  startTripScheduleAnalysisTimer
} from '../views/project/tripScheduleSection.js';

export function createTripScheduleController({
  documentImport,
  getProject,
  saveProject,
  isFormAttached,
  markDirty,
  showMessage
}) {
  let importRequestId = 0;

  async function importDocument(input) {
    const section = input.closest('[data-trip-schedule-section]');
    const form = input.form;
    const requestId = ++importRequestId;
    const isCurrent = () => isFormAttached(form) && requestId === importRequestId;
    const validation = validateScheduleFiles(input.files);
    if (validation.error) {
      setTripScheduleUploadStatus(input, scheduleUploadErrorMessage(validation.error), { error: true });
      input.value = '';
      return;
    }

    const [file] = validation.accepted;
    const project = getProject();
    if (!project || !section || !form) {
      input.value = '';
      return;
    }

    input.disabled = true;
    const stopTimer = startTripScheduleAnalysisTimer(input);
    try {
      // 문서에 연도가 없으면 사업 시작일의 연도(없으면 올해)를 쓴다.
      const schoolYear = Number(String(project.startDate ?? '').slice(0, 4)) || new Date().getFullYear();
      const items = await documentImport.importFile(file, { schoolYear });
      stopTimer();
      if (!isCurrent()) return;
      if (!items.length) {
        setTripScheduleUploadStatus(input, '일정 항목을 찾지 못했습니다. 기존 일정은 그대로입니다.');
        return;
      }
      const source = { filename: file.name, importedAt: new Date().toISOString() };
      if (!replaceTripScheduleDraft(section, items, source)) {
        setTripScheduleUploadStatus(input, '일정 초안을 만들지 못했습니다. 기존 일정은 그대로입니다.', { error: true });
        return;
      }
      markDirty();
      const range = tripScheduleDateRange(items);
      if (range) {
        if (form.elements.startDate) form.elements.startDate.value = range.startDate;
        if (form.elements.endDate) form.elements.endDate.value = range.endDate;
      }
      const rangeText = range ? ` 기간(${range.startDate} ~ ${range.endDate})도 입력했습니다.` : '';
      setTripScheduleUploadStatus(input, `${items.length}개 일정을 초안으로 가져왔습니다.${rangeText} 확인한 뒤 저장해 주세요.`);
    } catch (error) {
      stopTimer();
      if (!isCurrent()) return;
      setTripScheduleUploadStatus(input, error.message || '문서에서 일정을 읽지 못했습니다.', { error: true });
    } finally {
      input.value = '';
      input.disabled = false;
    }
  }

  function addRow(button) {
    const section = button.closest('[data-trip-schedule-section]');
    const tbody = scheduleEditBody(section);
    if (!tbody) return;
    tbody.querySelector('[data-trip-schedule-empty]')?.remove();
    tbody.insertAdjacentHTML('beforeend', newTripScheduleRowHtml());
    setTripScheduleEditing(section, true);
    markDirty();
  }

  function removeRow(button) {
    const section = button.closest('[data-trip-schedule-section]');
    const row = button.closest('[data-trip-schedule-row]');
    const tbody = scheduleEditBody(section);
    if (!row || !tbody) return;
    row.remove();
    if (!tbody.querySelector('[data-trip-schedule-row]')) {
      tbody.innerHTML = '<tr data-trip-schedule-empty><td colspan="7" class="center">일정이 없습니다.</td></tr>';
    }
    setTripScheduleEditing(section, true);
    markDirty();
  }

  // 수정 중이 아니면 null. 저장은 app.js에서 페이지 전체와 같이 한다.
  function applyTo(form, project) {
    const section = form.querySelector('[data-trip-schedule-section]');
    if (!section || section.dataset.editing !== 'true') return null;
    const tripSchedule = readTripScheduleSection(section, project.tripSchedule);
    return { ...project, tripSchedule, expenses: syncExpensesFromTripSchedule(tripSchedule, project.expenses) };
  }

  return Object.freeze({
    importDocument,
    addRow,
    removeRow,
    applyTo,
    startEditing: button => setTripScheduleEditing(button.closest('[data-trip-schedule-section]'), true)
  });
}
