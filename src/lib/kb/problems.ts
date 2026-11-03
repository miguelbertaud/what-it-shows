// What a merged ticket holds, problem by problem. The desk counts each report under its cause
// (causes.ts), where it is filed. A report the desk read as a one-day move (desk-notes.json) stays
// counted there, but a one-day move is not a swapped date: it is a problem of its own.
import { groupByCause, type CauseGroup, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = CauseGroup['cause'] | 'move';

export const PROBLEMS: Record<Problem, string> = {
  parser: 'The shared parser reads every date month first',
  hint: 'booking-v3 prints MM/DD/YYYY under the date field',
  move: 'The date moves by one day',
  unplaced: 'No tenant on file',
};

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // Where these reports are also counted: the cause the desk files them under.
  filedUnder: Problem[];
};

function summarize(problem: Problem, rs: Report[], filedUnder: Problem[] = []): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder,
  };
}

export function groupByProblem(reports: Report[], tenantOf: (r: Report) => Tenant | undefined, moved: readonly string[]): ProblemGroup[] {
  const causes = groupByCause(reports, tenantOf);
  const rs = reports.filter((r) => moved.includes(r.id));
  const filedUnder = causes.filter((g) => g.reports.some((r) => moved.includes(r.id))).map((g) => g.cause);
  return [...causes.map((g) => summarize(g.cause, g.reports)), ...(rs.length ? [summarize('move', rs, filedUnder)] : [])];
}
