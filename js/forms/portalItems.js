import { STUDENT_BUDGET_ID } from '../proposalPlanner.js';
import { buildXls } from './xlsWriter.js';

// 업무포털은 품목내역을 예산 하나씩 올리므로 예산마다 파일을 따로 만든다.
// 수량 × 예상단가의 합이 그 예산의 품의액과 같아야 한다.
export const PORTAL_ITEM_HEADER = Object.freeze(['내용', '규격', '단위', '수량', '예상단가']);
export const PORTAL_SHEET_NAME = '품목내역';

function shortDate(isoDate) {
  const match = String(isoDate ?? '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : '';
}

const itemName = item => [shortDate(item.date), item.name].filter(Boolean).join(' ');
const groupName = group => (group === 'vulnerable' ? '취약계층' : '비취약계층');

export function portalItemRows(proposal, budgetId) {
  const block = proposal.blocks.find(item => item.budget.id === budgetId);
  if (!block) return [];
  const rows = [];
  for (const part of block.parts) {
    rows.push([itemName(part), groupName(block.budget.group), '명', block.budget.count, part.perPerson]);
  }
  for (const part of block.absentParts) {
    rows.push([`${itemName(part)}(신청 후 불참)`, `신청 후 불참(${groupName(part.group)})`, '명', part.count, part.perPerson]);
  }
  if (budgetId === STUDENT_BUDGET_ID) {
    for (const line of proposal.unassigned.vulnerable) {
      rows.push([itemName(line), '취약계층', '명', proposal.counts.vulnerable, line.perPerson]);
    }
  }
  return rows.filter(([, , , count, price]) => count > 0 && price > 0);
}

export function portalBudgets(proposal) {
  return proposal.blocks
    .filter(block => portalItemRows(proposal, block.budget.id).length > 0)
    .map(block => ({ id: block.budget.id, name: block.budget.name, total: portalTotal(proposal, block.budget.id) }));
}

export function portalTotal(proposal, budgetId) {
  return portalItemRows(proposal, budgetId).reduce((sum, [, , , count, price]) => sum + count * price, 0);
}

export function portalItemsFile(proposal, budgetId) {
  return buildXls(PORTAL_SHEET_NAME, [[...PORTAL_ITEM_HEADER], ...portalItemRows(proposal, budgetId)]);
}
