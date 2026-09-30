import { calculateExpense, studentExpenseItems } from './engine.js';

// 시행 전 데이터 보기와 품의 도우미가 같이 쓴다. 금액이 없는 일정(이동, 자유시간 등)은 뺀다.
export function studentCostLines(project) {
  return studentExpenseItems(project)
    .map(item => {
      const calc = calculateExpense(item, project, false);
      const perPerson = item.calcMethod === 'perPerson'
        ? Math.round(Number(item.unitAmount) || 0)
        : (calc.studentQty > 0 ? Math.round(calc.studentTotal / calc.studentQty) : 0);
      return {
        id: String(item.id),
        date: String(item.date ?? ''),
        name: String(item.name ?? ''),
        description: String(item.description ?? ''),
        basis: String(item.basis ?? ''),
        note: String(item.note ?? ''),
        isFixedCost: Boolean(item.fixedCostKey),
        includesDayAbsent: item.quantityBase === 'participantsPlusAbsent',
        perPerson,
        quantity: calc.studentQty,
        total: calc.studentTotal
      };
    })
    .filter(line => line.perPerson > 0 || line.total > 0);
}

export function sumLines(lines, key) {
  return lines.reduce((sum, line) => sum + (Number(line[key]) || 0), 0);
}
