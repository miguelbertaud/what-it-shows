// What a merged ticket holds, problem by problem. causes.ts places a report by its tenant and form;
// a report the desk read as a one-day move (desk-notes.json) is not a swapped date, so no cause
// explains it: it is a problem of its own.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'move';

export const PROBLEMS: Record<Problem, string> = {
  parser: 'The shared parser reads every date month first',
  hint: 'booking-v3 prints MM/DD/YYYY under the date field',
  move: 'The date moves by one day',
};

export function problemOf(r: Report, t: Tenant | undefined, moved: readonly string[]): Problem | null {
  return moved.includes(r.id) ? 'move' : causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(reports: Report[], tenantOf: (r: Report) => Tenant | undefined, moved: readonly string[]): ProblemGroup[] {
  const byProblem = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of reports) {
    const problem = problemOf(r, tenantOf(r), moved) ?? 'unplaced';
    byProblem.set(problem, [...(byProblem.get(problem) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
