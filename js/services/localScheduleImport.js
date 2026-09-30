import { DocumentReadError } from '../documents/documentReadError.js';
import { readHwpxDocument } from '../documents/hwpxReader.js';
import { readPdfLayout } from '../documents/pdfLayoutReader.js';
import { parseScheduleFromLayout, parseScheduleFromTables } from '../scheduleImport/scheduleDocumentParser.js';
import { scheduleUploadErrorMessage, validateScheduleFile } from './scheduleUpload.js';

export class ScheduleDocumentImportError extends Error {
  constructor(message, { code = 'SCHEDULE_DOCUMENT_IMPORT_FAILED', cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ScheduleDocumentImportError';
    this.code = code;
  }
}

function extensionOf(file) {
  return String(file?.name ?? '').toLowerCase().match(/\.([^.]+)$/)?.[1] ?? '';
}

// PDF는 글자 위치로 세부 일정 표를 복원하고(없으면 '주요 경로(➡)' 줄), HWPX는 표를 셀 단위로 읽는다.
// readPdf, readHwpx는 테스트에서 가짜로 바꿔 넣는다.
export function createLocalScheduleImportService({ readPdf = readPdfLayout, readHwpx = readHwpxDocument } = {}) {
  return Object.freeze({
    async importFile(file, context = {}) {
      const validation = validateScheduleFile(file);
      if (!validation.ok) {
        throw new ScheduleDocumentImportError(scheduleUploadErrorMessage(validation.code), { code: validation.code });
      }
      const options = { fallbackYear: context.schoolYear };
      try {
        const result = extensionOf(file) === 'pdf'
          ? parseScheduleFromLayout(await readPdf(file), options)
          : parseScheduleFromTables(await readHwpx(file), options);
        if (!result.items.length) {
          throw new ScheduleDocumentImportError(
            '문서에서 세부 일정 표(시간·일정 칸)나 주요 경로(➡)를 찾지 못했습니다. 스캔한 이미지 PDF는 읽을 수 없습니다. 일정 항목 추가로 직접 입력해 주세요.',
            { code: 'SCHEDULE_NOT_FOUND' }
          );
        }
        return result.items;
      } catch (error) {
        if (error instanceof DocumentReadError) {
          throw new ScheduleDocumentImportError(error.message, { code: error.code, cause: error });
        }
        throw error;
      }
    }
  });
}
