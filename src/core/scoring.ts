// ============================================================
// File: src/core/scoring.ts
// Purpose: Clear matched cells and return points gained
// ------------------------------------------------------------
// Accepts EITHER a list of {r,c} cells OR a boolean mask.
// Sets cleared cells to -1 and returns points based on rules.
// Strict-mode safe.
//
// SCORING OVERVIEW (user-editable: see USER_SCORING below)
// - Base points per cleared cell (default 10).
// - Optional bonus for EXACTLY N cells in a match (e.g., 4 => +5).
// - Optional bonus for AT LEAST N cells in a match (e.g., 5+ => +15).
//
// HOW BONUSES ARE APPLIED
// - If you pass "groups" (CellRC[][]), each group is scored separately:
//     group_points = perCell * groupSize
//                   + exactBonus[groupSize] (if any)
//                   + best atLeastBonus where groupSize >= threshold (if any)
//   Total score is the sum over all groups.
// - If you do NOT pass "groups", scoring is based on the TOTAL cleared count:
//     total_points = perCell * totalCleared
//                    + exactBonus[totalCleared] (if any)
//                    + best atLeastBonus where totalCleared >= threshold (if any)
//
// NON-PROGRAMMER QUICK EDIT
// - Change numbers in USER_SCORING below. Examples:
//     perCell: 10
//     bonuses.exact: { "3": 0, "4": 5, "5": 15 }   // exactly 3/4/5
//     bonuses.atLeast: { "6": 25 }                 // 6 or more
//
// BACKWARD COMPATIBILITY
// - Calling clearAndScore(board, cellsOrMask) behaves as before
//   (10 points per cleared cell) unless you change USER_SCORING.
// - Optional third arg can pass { groups, scoring } if desired.
//
// ============================================================

import type { Board } from "./grid";
import type { CellRC } from "./match";

// -------------------------
// USER-TUNABLE SCORING TYPES
// -------------------------

export type ScoringBonuses = {
  // Bonus when the group size (or total cleared if no groups) is EXACTLY N
  // Example: { "4": 5, "5": 15 }
  exact?: Record<string, number>;
  // Bonus when the size is AT LEAST N.
  // If multiple thresholds apply, the highest threshold's bonus is used.
  // Example: { "6": 25 } means 6 or more gives +25.
  atLeast?: Record<string, number>;
};

export type ScoringConfig = {
  perCell: number;
  bonuses?: ScoringBonuses;
};

// Configurable scoring rules (edit this to change game scoring).
// - perCell: base points per cleared cell (default 10).
// - bonuses: optional exact/at-least bonuses as described above.
export const USER_SCORING: ScoringConfig = {
  perCell: 10,
  bonuses: {
    exact: { "3": 0, "4": 5, "5": 15 },
    atLeast: { "6": 25 }
  }
};

// Optional advanced arg to pass groups and/or override scoring.
export type ClearAndScoreOptions = {
  // If provided, each inner array represents one matched group (e.g., a 3-match).
  groups?: CellRC[][];
  // If provided, overrides USER_SCORING for this call only.
  scoring?: ScoringConfig;
};

// -------------------------
// FUNCTIONAL HELPERS
// -------------------------

// Type guard: distinguish CellRC[] vs boolean[][]
function isMask(arg: CellRC[] | boolean[][]): arg is boolean[][] {
  return Array.isArray(arg) && Array.isArray((arg as any)[0]);
}

function dedupeCells(cells: CellRC[]): CellRC[] {
  const seen = new Set<string>();
  const out: CellRC[] = [];
  for (const cell of cells) {
    if (!cell) continue;
    const r = (cell as any).r as number;
    const c = (cell as any).c as number;
    if (!Number.isInteger(r) || !Number.isInteger(c)) continue;
    const k = r + "," + c;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ r, c });
    }
  }
  return out;
}

function cellsFromMask(board: Board, mask: boolean[][]): CellRC[] {
  const out: CellRC[] = [];
  const rows = board.length;
  for (let r = 0; r < rows; r++) {
    const mr = mask[r];
    const br = board[r];
    if (!mr || !br) continue;
    const cols = Math.min(mr.length, br.length);
    for (let c = 0; c < cols; c++) {
      if (mr[c] === true) out.push({ r, c });
    }
  }
  return out;
}

function toNumberKeys(obj?: Record<string, number>): number[] {
  if (!obj) return [];
  const out: number[] = [];
  for (const k of Object.keys(obj)) {
    const n = Number(k);
    if (Number.isFinite(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

// -------------------------
// SCORING IMPLEMENTATION
// -------------------------

// Compute bonus points for a given size using the provided bonuses config.

function computeBonus(size: number, bonuses?: ScoringBonuses): number {
  if (!bonuses) return 0;

  let total = 0;

  // Exact match bonus (e.g., exactly 4 gives +5)
  if (bonuses.exact) {
    const exactVal = bonuses.exact[String(size)];
    if (typeof exactVal === "number") total += exactVal;
  }

  // At-least bonus (use the highest threshold that applies)
  if (bonuses.atLeast) {
    const thresholds = toNumberKeys(bonuses.atLeast);
    let best = 0;
    for (const t of thresholds) {
      if (size >= t) {
        const val = bonuses.atLeast[String(t)];
        if (typeof val === "number") best = val;
      } else {
        break;
      }
    }
    total += best;
  }

  return total;
}

// -------------------------
// BOARD MODIFICATION
// -------------------------

// Clear the specified cells (set to -1) and return how many were cleared.
// Ignores out-of-bounds and already-empty cells.
// Note: does NOT dedupe; call dedupeCells() first if needed.

function countAndClear(board: Board, targets: CellRC[]): number {
  let cleared = 0;
  for (const t of targets) {
    if (!t) continue;
    const r = t.r;
    const c = t.c;
    if (!Number.isInteger(r) || !Number.isInteger(c)) continue;
    if (r < 0 || c < 0) continue;
    if (r >= board.length) continue;
    const row = board[r];
    if (!row) continue;
    if (c >= row.length) continue;

    const val = row[c];
    // treat non-numbers as empty; only clear if not already empty (-1)
    if (typeof val !== "number") continue;
    if (val !== -1) {
      row[c] = -1;
      cleared++;
    }
  }
  return cleared;
}

// -------------------------
// Public API (exports)
// -------------------------

// Overloads
export function clearAndScore(board: Board, cells: CellRC[]): number;
export function clearAndScore(board: Board, mask: boolean[][]): number;
// Backward-compatible overload plus options for groups/scoring
export function clearAndScore(
  board: Board,
  arg: CellRC[] | boolean[][],
  opts?: ClearAndScoreOptions
): number;

// Impl
export function clearAndScore(
  board: Board,
  arg: CellRC[] | boolean[][],
  opts?: ClearAndScoreOptions
): number {
  const targets = isMask(arg) ? cellsFromMask(board, arg) : dedupeCells(arg);

  // Clear and count how many cells became -1 this call.
  // Note: we clear once; scoring is computed from sizes (groups or total) below.
  const cleared = countAndClear(board, targets);

  // Select scoring rules (user global by default; per-call override optional).
  const rules = opts?.scoring ?? USER_SCORING;
  const perCell = Number.isFinite(rules.perCell) ? rules.perCell : 10;

  // If groups were supplied, compute per-group bonuses. Otherwise, score by total.
  if (opts?.groups && Array.isArray(opts.groups) && opts.groups.length > 0) {
    // Dedupe within each group to avoid counting the same cell twice.
    let sum = 0;
    for (const g of opts.groups) {
      const unique = dedupeCells(Array.isArray(g) ? g : []);
      const size = unique.length;
      if (size <= 0) continue;
      sum += size * perCell;
      sum += computeBonus(size, rules.bonuses);
    }
    return sum;
  } else {
    // Total-cleared scoring (legacy-compatible)
    let score = cleared * perCell;
    score += computeBonus(cleared, rules.bonuses);
    return score;
  }
}
