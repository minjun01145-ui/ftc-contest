import { ESTABLISHMENTS, SCHOOL_LEVELS } from '../../presets.js';
import { escapeHtml } from '../../utils.js';

export const EXECUTION_MODES = Object.freeze(['숙박형', '일일형', '혼합형']);

const LEVEL_LABELS = Object.freeze({ 초: '초등학교', 중: '중학교', 고: '고등학교' });
const options = (values, selected, label = value => value) => values
  .map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label(value)}</option>`)
  .join('');

export function renderBusinessInfoSection(project, school = {}) {
  const modes = EXECUTION_MODES
    .map(mode => `<option value="${mode}" ${mode === project.executionMode ? 'selected' : ''}>${mode}</option>`)
    .join('');
  return `
    <fieldset class="section-fieldset" data-project-section="business">
      <legend>사업정보</legend>
      <div class="form-grid">
        <label for="projectTitle">사업명</label>
        <input id="projectTitle" name="title" type="text" value="${escapeHtml(project.title)}">
        <label for="schoolName">학교명</label>
        <input id="schoolName" name="schoolName" type="text" value="${escapeHtml(school.name ?? '')}">

        <label for="schoolLevel">학교급</label>
        <select id="schoolLevel" name="schoolLevel">${options(SCHOOL_LEVELS, school.level ?? '중', value => LEVEL_LABELS[value])}</select>
        <label for="schoolEstablishment">설립</label>
        <select id="schoolEstablishment" name="schoolEstablishment">${options(ESTABLISHMENTS, school.establishment ?? '공립')}</select>

        <label for="startDate">시작일</label>
        <input id="startDate" name="startDate" type="date" value="${escapeHtml(project.startDate)}">
        <label for="endDate">종료일</label>
        <input id="endDate" name="endDate" type="date" value="${escapeHtml(project.endDate)}">

        <label for="executionMode">추진방식</label>
        <select id="executionMode" name="executionMode">${modes}</select>
      </div>
    </fieldset>`;
}
