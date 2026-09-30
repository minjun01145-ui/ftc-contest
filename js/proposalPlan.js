// 체크한 항목과 순서만 저장하고 금액은 매번 다시 계산한다.
export function createProposalPlan() {
  return { allocations: [] };
}

function allocationKey({ budgetId, lineId }) {
  return `${budgetId}\u0000${lineId}`;
}

function uniqueAllocations(allocations) {
  const seen = new Set();
  return allocations.filter(allocation => {
    const key = allocationKey(allocation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeProposalPlan(value) {
  const source = value && typeof value === 'object' ? value : {};
  const allocations = Array.isArray(source.allocations)
    ? source.allocations
      .filter(item => item && typeof item === 'object')
      .map(item => ({ budgetId: String(item.budgetId ?? ''), lineId: String(item.lineId ?? '') }))
      .filter(item => item.budgetId && item.lineId)
    : [];
  return { allocations: uniqueAllocations(allocations) };
}

export function addAllocations(plan, budgetId, lineIds) {
  return normalizeProposalPlan({ allocations: [...plan.allocations, ...lineIds.map(lineId => ({ budgetId, lineId }))] });
}

export function removeAllocation(plan, budgetId, lineId) {
  return { allocations: plan.allocations.filter(item => !(item.budgetId === budgetId && item.lineId === lineId)) };
}
