import { applyCostMethod, costInputAmount } from './costMethods.js';
import { projectCounts } from './engine.js';
import { activeFixedCosts, fixedCostBreakdown } from './fixedCosts.js';
import { createExpense } from './presets.js';

// 기타비는 인솔자 몫(버림 잔액 포함)을 가져온다.
export function cloneExpensesForStaff(expenses) {
  return expenses.map(expense => {
    const { id: _id, ...copy } = expense;
    const cloned = createExpense({ ...copy, details: { ...(expense.details ?? {}) } });
    return expense.calcMethod === 'perPerson'
      ? applyCostMethod('staff', cloned, 'perStaff', costInputAmount('student', expense))
      : cloned;
  });
}

function fixedCostStaffRows(project) {
  const c = projectCounts(project);
  const counts = { participants: c.participants, dayAbsent: c.contractedAbsent, chaperones: c.chaperones };
  const options = { dayAbsentSharesCommonCost: Boolean(project.dayAbsentSharesCommonCost) };
  return activeFixedCosts(project.fixedCosts)
    .filter(entry => entry.amount > 0)
    .flatMap(entry => {
      const name = entry.label || '기타비';
      const breakdown = fixedCostBreakdown(entry, counts, options);
      const rows = [];
      const perStaff = entry.mode === 'perPerson' ? entry.amount : (entry.includeChaperones ? breakdown.perPerson : 0);
      if (perStaff > 0) rows.push(applyCostMethod('staff', createExpense({ name }), 'perStaff', perStaff));
      if (breakdown.remainder > 0) {
        rows.push(applyCostMethod('staff', createExpense({ name: `${name} 버림 잔액` }), 'staffTotal', breakdown.remainder));
      }
      return rows;
    });
}

export function buildStaffDraft(project) {
  const venues = cloneExpensesForStaff((project.expenses ?? []).filter(expense => String(expense.name ?? '').trim()));
  return [...venues, ...fixedCostStaffRows(project)];
}
