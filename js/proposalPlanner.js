import { otherSupportPerPerson } from './budget.js';
import { studentCostLines, sumLines } from './costLines.js';
import { projectCounts } from './engine.js';
import { normalizeProposalPlan } from './proposalPlan.js';
import { number } from './utils.js';

// 예산마다 체크한 순서대로 채우고, 1인당 한도를 넘는 금액은 남겨 다른 예산에서 체크한다.
// 취약/비취약은 학생 수가 달라 따로 계산한다.
// 신청 후 불참자의 공통비는 따로 두고 불참 인원 × 1인당 지원액 안에서만 채운다.
// 취약계층에 배정하지 않고 남은 금액은 수익자 부담으로 넘긴다.
export const VULNERABLE_BUDGET_ID = 'education-vulnerable';
export const EDUCATION_BUDGET_ID = 'education';
export const STUDENT_BUDGET_ID = 'student';

// group: 'vulnerable' | 'regular'
export function absentLineId(group, lineId) {
  return `absent:${group}:${lineId}`;
}

// 취약/비취약 불참자를 따로 둔다.
function absentLines(lines, counts) {
  const groups = [['vulnerable', counts.vulnerableAbsent], ['regular', counts.regularAbsent]];
  return groups.flatMap(([group, count]) => (count > 0
    ? lines.filter(line => line.includesDayAbsent).map(line => ({
      id: absentLineId(group, line.id),
      lineId: line.id,
      group,
      name: line.name,
      date: line.date,
      count,
      perPerson: line.perPerson,
      total: line.perPerson * count
    }))
    : []));
}

// 교육청 지원금은 같은 계층만, 기타 지원금과 수익자 부담은 어느 계층이나 된다.
export function canTakeAbsentLine(budget, absentLine) {
  return !budget.absentGroup || budget.absentGroup === absentLine.group;
}

// setting.mode: perPerson | total | full(실비 전액, 금액 입력 없음)
export function proposalBudgets(project, counts) {
  const education = project.educationSupport ?? {};
  const memos = education.memos ?? {};
  const vulnerableFull = education.vulnerableMode !== 'perPerson';
  return [
    {
      id: VULNERABLE_BUDGET_ID,
      name: '교육청 지원금(취약계층)',
      group: 'vulnerable',
      count: counts.vulnerable,
      absentGroup: 'vulnerable',
      absentCount: counts.vulnerableAbsent,
      memo: String(memos.vulnerable ?? ''),
      setting: { mode: vulnerableFull ? 'full' : 'perPerson', amount: Math.max(0, number(education.vulnerablePerPerson)) },
      capPerPerson: vulnerableFull ? Number.POSITIVE_INFINITY : Math.max(0, number(education.vulnerablePerPerson))
    },
    {
      id: EDUCATION_BUDGET_ID,
      name: '교육청 지원금(비취약계층)',
      group: 'regular',
      count: counts.regular,
      absentGroup: 'regular',
      absentCount: counts.regularAbsent,
      memo: String(memos.regular ?? ''),
      setting: { mode: 'perPerson', amount: Math.max(0, number(education.regularPerPerson)) },
      capPerPerson: Math.max(0, number(education.regularPerPerson))
    },
    ...(project.otherSupports ?? []).map(support => ({
      id: support.id,
      name: `기타 지원금(${support.name || '이름 없음'})`,
      group: 'regular',
      count: counts.regular,
      absentGroup: null,
      absentCount: counts.regularAbsent + counts.vulnerableAbsent,
      // 총액 지원금은 이 금액 안에서만 쓴다(참여 학생에게 쓰고 남은 금액을 불참 학생 공통비에).
      poolTotal: support.mode === 'total' ? Math.max(0, number(support.amount)) : null,
      memo: String(support.memo ?? ''),
      source: support.source ?? 'school',
      setting: { mode: support.mode === 'total' ? 'total' : 'perPerson', amount: Math.max(0, number(support.amount)) },
      capPerPerson: otherSupportPerPerson(support, counts.regular)
    })),
    {
      id: STUDENT_BUDGET_ID,
      name: '수익자 부담',
      group: 'regular',
      count: counts.regular,
      absentGroup: null,
      absentCount: counts.regularAbsent + counts.vulnerableAbsent,
      memo: '',
      setting: null,
      capPerPerson: Number.POSITIVE_INFINITY
    }
  ];
}

export function withBudgetAmount(project, budgetId, amount) {
  const value = Math.max(0, Math.round(number(amount)));
  if (budgetId === EDUCATION_BUDGET_ID) {
    return { ...project, educationSupport: { ...project.educationSupport, regularPerPerson: value } };
  }
  if (budgetId === VULNERABLE_BUDGET_ID) {
    return { ...project, educationSupport: { ...project.educationSupport, vulnerablePerPerson: value } };
  }
  return {
    ...project,
    otherSupports: (project.otherSupports ?? []).map(support => (support.id === budgetId ? { ...support, amount: value } : support))
  };
}

const absentKey = (budgetId, group) => `${budgetId}:${group}`;

// 참여 학생 항목을 먼저, 신청 후 불참 항목을 나중에 채운다.
function replay(budgets, lines, absent, allocations) {
  const budgetById = new Map(budgets.map(budget => [budget.id, budget]));
  const lineById = new Map(lines.map(line => [line.id, line]));
  const absentById = new Map(absent.map(line => [line.id, line]));
  const remaining = {
    vulnerable: new Map(lines.map(line => [line.id, line.perPerson])),
    regular: new Map(lines.map(line => [line.id, line.perPerson]))
  };
  const used = new Map(budgets.map(budget => [budget.id, 0]));

  const results = allocations
    .filter(item => budgetById.has(item.budgetId) && lineById.has(item.lineId))
    .map(item => {
      const budget = budgetById.get(item.budgetId);
      const line = lineById.get(item.lineId);
      const pool = remaining[budget.group];
      const requested = pool.get(line.id);
      const room = budget.capPerPerson - used.get(budget.id);
      const perPerson = Math.max(0, Math.min(requested, room));
      pool.set(line.id, requested - perPerson);
      used.set(budget.id, used.get(budget.id) + perPerson);
      return {
        budgetId: budget.id,
        lineId: line.id,
        name: line.name,
        date: line.date,
        requested,
        perPerson,
        left: requested - perPerson,
        overBudget: perPerson < requested,
        // 다른 예산에 먼저 일부를 넣고 남은 금액을 넣은 경우
        remainder: requested < line.perPerson
      };
    });

  // 신청 후 불참 항목: 불참 학생 1인당 지원액 안에서(총액 지원금은 남은 총액 안에서) 체크한 순서대로 채운다.
  const absentRemaining = new Map(absent.map(line => [line.id, line.perPerson]));
  const absentUsed = new Map();
  const poolLeft = new Map(budgets
    .filter(budget => budget.poolTotal !== null && budget.poolTotal !== undefined)
    .map(budget => [budget.id, budget.poolTotal - used.get(budget.id) * budget.count]));
  const absentResults = allocations
    .filter(item => budgetById.has(item.budgetId) && absentById.has(item.lineId))
    .filter(item => canTakeAbsentLine(budgetById.get(item.budgetId), absentById.get(item.lineId)))
    .map(item => {
      const budget = budgetById.get(item.budgetId);
      const line = absentById.get(item.lineId);
      const key = absentKey(budget.id, line.group);
      const requested = absentRemaining.get(line.id);
      let room = budget.capPerPerson - (absentUsed.get(key) ?? 0);
      if (poolLeft.has(budget.id)) room = Math.min(room, Math.floor(Math.max(0, poolLeft.get(budget.id)) / line.count));
      const perPerson = Math.max(0, Math.min(requested, room));
      absentRemaining.set(line.id, requested - perPerson);
      absentUsed.set(key, (absentUsed.get(key) ?? 0) + perPerson);
      if (poolLeft.has(budget.id)) poolLeft.set(budget.id, poolLeft.get(budget.id) - perPerson * line.count);
      return {
        ...line,
        budgetId: budget.id,
        lineId: line.id,
        absent: true,
        requested,
        perPerson,
        total: perPerson * line.count,
        left: requested - perPerson,
        overBudget: perPerson < requested,
        remainder: requested < line.perPerson
      };
    });
  return { results, absentResults, absentRemaining, absentUsed, poolLeft, remaining, used };
}

// 불참 학생이 있는 계층 중 1인당 가장 많이 쓴 계층을 기준으로 보여 준다.
function absentUsage(budget, counts, absentUsed, poolLeft) {
  const groups = [['vulnerable', counts.vulnerableAbsent], ['regular', counts.regularAbsent]]
    .filter(([group, count]) => count > 0 && (!budget.absentGroup || budget.absentGroup === group));
  const count = groups.reduce((total, [, people]) => total + people, 0);
  if (!count) return { count: 0, usedPerPerson: 0, unusedPerPerson: null, full: false };
  const usedPerPerson = Math.max(...groups.map(([group]) => absentUsed.get(absentKey(budget.id, group)) ?? 0));
  let unusedPerPerson = Number.isFinite(budget.capPerPerson)
    ? Math.min(...groups.map(([group]) => budget.capPerPerson - (absentUsed.get(absentKey(budget.id, group)) ?? 0)))
    : null;
  if (poolLeft.has(budget.id)) {
    const pooled = Math.floor(Math.max(0, poolLeft.get(budget.id)) / count);
    unusedPerPerson = unusedPerPerson === null ? pooled : Math.min(unusedPerPerson, pooled);
  }
  return { count, usedPerPerson, unusedPerPerson, full: unusedPerPerson !== null && unusedPerPerson <= 0 };
}

function unassignedLines(lines, pool) {
  return lines
    .filter(line => pool.get(line.id) > 0)
    .map(line => ({ lineId: line.id, name: line.name, date: line.date, perPerson: pool.get(line.id), full: pool.get(line.id) === line.perPerson }));
}

function findSplits(results, absentResults, budgets) {
  const nameOf = new Map(budgets.map(budget => [budget.id, budget.name]));
  const regular = new Set(budgets.filter(budget => budget.group === 'regular').map(budget => budget.id));
  const byLine = new Map();
  const add = (key, name, result) => {
    if (!byLine.has(key)) byLine.set(key, { name, pieces: [] });
    byLine.get(key).pieces.push({ budgetName: nameOf.get(result.budgetId), perPerson: result.perPerson });
  };
  for (const result of results) {
    if (regular.has(result.budgetId) && result.perPerson > 0) add(result.lineId, result.name, result);
  }
  // 신청 후 불참 공통비도 교육청 지원금과 수익자 부담으로 나뉠 수 있다.
  for (const result of absentResults) {
    if (result.perPerson > 0) add(result.lineId, `${result.name}(신청 후 불참 ${result.count}명)`, result);
  }
  return [...byLine.values()].filter(item => item.pieces.length > 1);
}

export function buildProposal(project) {
  const plan = normalizeProposalPlan(project.proposalPlan);
  const c = projectCounts(project);
  const sharesCommon = Boolean(project.dayAbsentSharesCommonCost);
  const counts = {
    regular: c.regularParticipants,
    vulnerable: c.vulnerableParticipants,
    regularAbsent: sharesCommon ? c.regularContractedAbsent : 0,
    vulnerableAbsent: sharesCommon ? c.vulnerableContractedAbsent : 0,
    dayAbsent: sharesCommon ? c.contractedAbsent : 0
  };
  const lines = studentCostLines(project);
  const absent = absentLines(lines, counts);
  const budgets = proposalBudgets(project, counts);
  const { results, absentResults, absentRemaining, absentUsed, poolLeft, remaining, used } = replay(budgets, lines, absent, plan.allocations);

  const blocks = budgets.map(budget => {
    const usedPerPerson = used.get(budget.id);
    const parts = results
      .filter(result => result.budgetId === budget.id)
      .map(result => ({ ...result, total: result.perPerson * budget.count }));
    const absentParts = absentResults.filter(result => result.budgetId === budget.id && result.perPerson > 0);
    const finite = Number.isFinite(budget.capPerPerson);
    const unusedPerPerson = finite ? budget.capPerPerson - usedPerPerson : null;
    const usage = absentUsage(budget, counts, absentUsed, poolLeft);
    const absentCount = usage.count;
    const absentUsedPerPerson = usage.usedPerPerson;
    const absentUnusedPerPerson = usage.unusedPerPerson;
    const participantTotal = usedPerPerson * budget.count;
    const absentTotal = sumLines(absentParts, 'total');
    return {
      budget,
      parts,
      absentParts,
      usedPerPerson,
      unusedPerPerson,
      full: unusedPerPerson !== null && unusedPerPerson <= 0,
      absentCount,
      absentUsedPerPerson,
      absentUnusedPerPerson,
      absentFull: usage.full,
      // 예산 총액: (참여 + 신청 후 불참) × 1인당 지원액, 총액 지원금은 그 총액. 한도가 없는 예산은 null
      budgetTotal: budget.poolTotal !== null && budget.poolTotal !== undefined
        ? budget.poolTotal
        : (finite ? budget.capPerPerson * (budget.count + absentCount) : null),
      participantTotal,
      absentTotal,
      total: participantTotal + absentTotal
    };
  });

  const unassignedAbsent = absent
    .filter(line => absentRemaining.get(line.id) > 0)
    .map(line => {
      const left = absentRemaining.get(line.id);
      return { ...line, perPerson: left, total: left * line.count, full: left === line.perPerson };
    });
  const unassigned = {
    vulnerable: unassignedLines(lines, remaining.vulnerable),
    regular: unassignedLines(lines, remaining.regular),
    absent: unassignedAbsent
  };
  const vulnerableBurdenPerPerson = sumLines(unassigned.vulnerable, 'perPerson');
  const vulnerableBurden = {
    count: counts.vulnerable,
    perPerson: vulnerableBurdenPerPerson,
    total: vulnerableBurdenPerPerson * counts.vulnerable
  };
  const regularUnassignedPerPerson = sumLines(unassigned.regular, 'perPerson');

  const blockTotal = id => blocks.find(block => block.budget.id === id).total;
  const educationTotal = blockTotal(VULNERABLE_BUDGET_ID) + blockTotal(EDUCATION_BUDGET_ID);
  const education = project.educationSupport ?? {};
  const grantTotal = education.grantTotal === null || education.grantTotal === undefined || education.grantTotal === ''
    ? null : number(education.grantTotal);

  const assignedTotal = blocks.reduce((sum, block) => sum + block.total, 0) + vulnerableBurden.total;
  const unassignedTotal = regularUnassignedPerPerson * counts.regular + sumLines(unassignedAbsent, 'total');

  return {
    lines,
    absent,
    budgets,
    counts,
    results,
    absentResults,
    blocks,
    // 정산 참고용: 신청 후 불참자 공통비 전체(배정 여부와 상관없이)
    dayAbsentTotal: sumLines(absent, 'total'),
    unassigned,
    vulnerableBurden,
    regularUnassignedPerPerson,
    splits: findSplits(results, absentResults, budgets),
    perPersonTotal: sumLines(lines, 'perPerson'),
    education: { total: educationTotal, grantTotal, balance: grantTotal === null ? null : grantTotal - educationTotal },
    assignedTotal,
    unassignedTotal,
    costTotal: sumLines(lines, 'total')
  };
}

export function budgetChecklist(proposal, budgetId) {
  const budget = proposal.budgets.find(item => item.id === budgetId);
  const pool = budget.group === 'vulnerable' ? proposal.unassigned.vulnerable : proposal.unassigned.regular;
  const available = new Map(pool.map(item => [item.lineId, item.perPerson]));
  const budgetFull = proposal.blocks.find(block => block.budget.id === budgetId)?.full ?? false;
  return proposal.lines.map(line => {
    const result = proposal.results.find(item => item.budgetId === budgetId && item.lineId === line.id) ?? null;
    const amount = available.get(line.id) ?? 0;
    return {
      line,
      checked: Boolean(result),
      result,
      available: amount,
      // 예산이 가득 찼거나 다른 예산에 모두 넣은 항목은 더 체크할 수 없다.
      locked: !result && (amount <= 0 || budgetFull),
      lockReason: !result && amount <= 0 ? 'assigned' : (!result && budgetFull ? 'full' : null)
    };
  });
}

export function absentChecklist(proposal, budgetId) {
  const budget = proposal.budgets.find(item => item.id === budgetId);
  const block = proposal.blocks.find(item => item.budget.id === budgetId);
  const available = new Map(proposal.unassigned.absent.map(item => [item.id, item.perPerson]));
  return proposal.absent
    .filter(line => canTakeAbsentLine(budget, line))
    .map(line => {
      const result = proposal.absentResults.find(item => item.budgetId === budgetId && item.lineId === line.id) ?? null;
      const amount = available.get(line.id) ?? 0;
      return {
        line,
        checked: Boolean(result),
        result,
        available: amount,
        locked: !result && (amount <= 0 || Boolean(block?.absentFull)),
        lockReason: !result && amount <= 0 ? 'assigned' : (!result && block?.absentFull ? 'full' : null)
      };
    });
}

export function findAllocationResult(proposal, budgetId, lineId) {
  return proposal.results.find(item => item.budgetId === budgetId && item.lineId === lineId)
    ?? proposal.absentResults.find(item => item.budgetId === budgetId && item.lineId === lineId)
    ?? null;
}
