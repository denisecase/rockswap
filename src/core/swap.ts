// ============================================================
// File: src/core/swap.ts
// Purpose: Attempt a swap. Commit only if it creates a match.
// Returns: true if swap committed (created at least one match).
// Strict-mode safe.
// ============================================================

import type { Board } from "./grid";
import { findMatches } from "./match";

function dims(board: Board) {
  const rows = board.length;
  const cols = rows > 0 ? (board[0] ? board[0]!.length : 0) : 0;
  return { rows, cols };
}

function inBounds(board: Board, r: number, c: number): boolean {
  if (r < 0 || c < 0) return false;
  const { rows, cols } = dims(board);
  return r < rows && c < cols;
}

function isAdjacent(a: { r: number; c: number }, b: { r: number; c: number }): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function trySwap(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  // Bounds + adjacency
  if (!inBounds(board, r1, c1) || !inBounds(board, r2, c2)) return false;
  if (!isAdjacent({ r: r1, c: c1 }, { r: r2, c: c2 })) return false;

  const row1 = board[r1];
  const row2 = board[r2];
  if (!row1 || !row2) return false; // extra safety

  const a = row1[c1];
  const b = row2[c2];

  // Must be valid numbers and not empties
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (a < 0 || b < 0) return false;

  // Tentative swap
  row1[c1] = b as number;
  row2[c2] = a as number;

  // Any match created anywhere?
  const createdMatch = findMatches(board).length > 0;

  if (!createdMatch) {
    // Revert
    row1[c1] = a;
    row2[c2] = b;
    return false;
  }

  return true;
}
