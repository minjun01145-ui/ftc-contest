/**
 * 품의 도우미에서 사용자가 정한 값만 저장한다. 금액은 저장하지 않고 매번 다시 계산한다.
 *
 * project.proposalPlan = {
 *   allocations: [{ budgetId, lineId }, ...]   // 예산 카드에서 항목을 체크한 순서
 * }
 * 체크한 순서대로 다시 채워 보기 때문에, 단가나 예산이 바뀌어도 금액이 저절로 맞춰진다.
 */
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
