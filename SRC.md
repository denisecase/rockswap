# What's in the `src` folder

This project splits reusable engine logic into **`src/core/`**, rendering/helpers into **`src/systems/`**, and keeps the game entry & HUD wiring in the root. Both **RockSwap** (match-3) and future games can reuse most modules under `src/core/`.

---

## Core (reusable game logic)

- [`src/core/grid.ts`](./src/core/grid.ts) - **board factory & bounds**
  - `createBoard`, `makeEmpty`, `inBounds`, `ROWS/COLS/KINDS`
  - Builds an initial board and _attempts to avoid_ starting 3-in-a-row.

- [`src/core/match.ts`](./src/core/match.ts) - **match detection**
  - `findMatches(board): {r,c}[]`, `findMatchesMask(board): boolean[][]`, `hasAny`
  - Finds horizontal/vertical runs (≥3) of the same non-negative value.

- [`src/core/scoring.ts`](./src/core/scoring.ts) - **clearing & points**
  - `clearAndScore(board, matchesOrMask): number`
  - Sets matched cells to `-1` and returns points (10 per cleared cell). Accepts either `{r,c}[]` or a mask.

- [`src/core/collapse.ts`](./src/core/collapse.ts) - **gravity**
  - `collapse(board)`
  - Compacts non-negative cells downward in each column; fills above with `-1`.

- [`src/core/refill.ts`](./src/core/refill.ts) - **spawn new gems**
  - `refill(board, kinds?)`
  - Fills `-1` cells with new random values, re-rolling locally to avoid instant 3-runs at that cell.

- [`src/core/swap.ts`](./src/core/swap.ts) - **valid swap**
  - `trySwap(board, r1, c1, r2, c2): boolean`
  - Tentatively swaps adjacent cells and _commits only if_ it creates at least one match.

---

## Systems (rendering & I/O)

- [`src/systems/renderer.ts`](./src/systems/renderer.ts) - **canvas rendering**
  - `renderBoard(ctx, board, { highlight?, alpha?, selected? })`
  - Renders the grid with a fixed palette, plus optional selection outline and flashing match borders.
  - `pickCellAt(board, canvas, ev)` maps pointer events to board coordinates.

---

## Game entry

- [`src/main.ts`](./src/main.ts) - **entry point & loop**
  - Creates initial state, installs pointer input, updates HUD.
  - Orchestrates `trySwap → resolveBoard` where resolve loops through:
    `findMatches → flash → clearAndScore → collapse → refill` until stable.
  - Includes a simple chain multiplier to reward cascades.

> Typical flow:
>
> 1. `main.ts` initializes state and listens for picks.
> 2. On a valid swap, it resolves cascades with visual feedback.
> 3. `renderer.ts` draws the board, highlights matches, and shows selection.

---

## Notes for contributors

- Code is **strict-mode safe**: array/indexed accesses are guarded to keep TypeScript happy.
- Empty cells use `-1`. Non-negative integers (`0..KINDS-1`) are gem types.
- Rendering is resolution-independent: cell size derives from canvas dimensions.
- Keep `core/` free of DOM concerns so it's easy to unit-test and reuse.
