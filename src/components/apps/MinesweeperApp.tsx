import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Difficulty = 'beginner' | 'intermediate' | 'expert'
type GameState = 'ready' | 'playing' | 'won' | 'lost'

type Cell = {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

const LEVELS: Record<Difficulty, { rows: number; cols: number; mines: number; label: string }> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Expert' },
}

const NUMBER_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080']

function makeBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  )
}

function neighbors(r: number, c: number, rows: number, cols: number): Array<[number, number]> {
  const result: Array<[number, number]> = []
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc])
    }
  }
  return result
}

/** Place mines after the first click so the first reveal is always safe (and opens an area). */
function placeMines(board: Cell[][], mines: number, safeR: number, safeC: number): Cell[][] {
  const rows = board.length
  const cols = board[0].length
  const next = board.map((row) => row.map((cell) => ({ ...cell, mine: false, adjacent: 0 })))
  const forbidden = new Set<string>([`${safeR},${safeC}`, ...neighbors(safeR, safeC, rows, cols).map(([r, c]) => `${r},${c}`)])
  let placed = 0
  let guard = 0
  while (placed < mines && guard < 100000) {
    guard += 1
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (forbidden.has(`${r},${c}`) || next[r][c].mine) continue
    next[r][c].mine = true
    placed += 1
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (next[r][c].mine) continue
      next[r][c].adjacent = neighbors(r, c, rows, cols).filter(([nr, nc]) => next[nr][nc].mine).length
    }
  }
  return next
}

function floodReveal(board: Cell[][], startR: number, startC: number): Cell[][] {
  const rows = board.length
  const cols = board[0].length
  const next = board.map((row) => row.map((cell) => ({ ...cell })))
  const stack: Array<[number, number]> = [[startR, startC]]
  while (stack.length) {
    const [r, c] = stack.pop() as [number, number]
    const cell = next[r][c]
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    if (cell.adjacent === 0 && !cell.mine) {
      for (const [nr, nc] of neighbors(r, c, rows, cols)) {
        if (!next[nr][nc].revealed) stack.push([nr, nc])
      }
    }
  }
  return next
}

export function MinesweeperApp() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const level = LEVELS[difficulty]
  const [board, setBoard] = useState<Cell[][]>(() => makeBoard(level.rows, level.cols))
  const [gameState, setGameState] = useState<GameState>('ready')
  const [time, setTime] = useState(0)
  const timerRef = useRef<number | null>(null)

  const reset = useCallback((next: Difficulty = difficulty) => {
    const lvl = LEVELS[next]
    setBoard(makeBoard(lvl.rows, lvl.cols))
    setGameState('ready')
    setTime(0)
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [difficulty])

  // Run the timer while playing.
  useEffect(() => {
    if (gameState !== 'playing') return
    timerRef.current = window.setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [gameState])

  const flagsUsed = useMemo(
    () => board.reduce((sum, row) => sum + row.filter((cell) => cell.flagged).length, 0),
    [board],
  )

  function revealCell(r: number, c: number) {
    if (gameState === 'won' || gameState === 'lost') return
    const cell = board[r][c]
    if (cell.flagged || cell.revealed) return

    let working = board
    let playing = gameState
    if (gameState === 'ready') {
      working = placeMines(board, level.mines, r, c)
      playing = 'playing'
    }

    if (working[r][c].mine) {
      const exploded = working.map((row) => row.map((cellItem) => ({ ...cellItem, revealed: cellItem.mine ? true : cellItem.revealed })))
      exploded[r][c] = { ...exploded[r][c], revealed: true }
      setBoard(exploded)
      setGameState('lost')
      return
    }

    const revealed = floodReveal(working, r, c)
    const hiddenSafe = revealed.flat().filter((cellItem) => !cellItem.mine && !cellItem.revealed).length
    if (hiddenSafe === 0) {
      // Win: flag every mine.
      setBoard(revealed.map((row) => row.map((cellItem) => (cellItem.mine ? { ...cellItem, flagged: true } : cellItem))))
      setGameState('won')
      return
    }
    setBoard(revealed)
    if (playing !== gameState) setGameState(playing)
  }

  function toggleFlag(r: number, c: number) {
    if (gameState === 'won' || gameState === 'lost' || gameState === 'ready') {
      if (gameState === 'ready') setGameState('playing')
    }
    if (gameState === 'won' || gameState === 'lost') return
    const cell = board[r][c]
    if (cell.revealed) return
    const next = board.map((row) => row.map((cellItem) => ({ ...cellItem })))
    next[r][c].flagged = !next[r][c].flagged
    setBoard(next)
  }

  function changeDifficulty(next: Difficulty) {
    setDifficulty(next)
    reset(next)
  }

  const face = gameState === 'lost' ? '😵' : gameState === 'won' ? '😎' : '🙂'
  const mineCount = Math.max(0, level.mines - flagsUsed)

  function cellContent(cell: Cell): string {
    if (cell.flagged && !(gameState === 'lost' && cell.mine)) return '🚩'
    if (!cell.revealed) return ''
    if (cell.mine) return '💣'
    return cell.adjacent > 0 ? String(cell.adjacent) : ''
  }

  return (
    <div className="app-content minesweeper-app">
      <ul className="os-menu-bar" role="menubar">
        <li className="ms-menu">
          Game
          <ul className="ms-menu-dropdown">
            <li><button type="button" onClick={() => reset()}>New</button></li>
            <li className="ms-menu-sep" aria-hidden="true" />
            {(Object.keys(LEVELS) as Difficulty[]).map((id) => (
              <li key={id}>
                <button type="button" onClick={() => changeDifficulty(id)}>
                  {difficulty === id ? '• ' : '  '}
                  {LEVELS[id].label}
                </button>
              </li>
            ))}
          </ul>
        </li>
        <li>Help</li>
      </ul>

      <div className="sunken-panel ms-frame">
        <div className="ms-hud">
          <span className="ms-counter" aria-label="Mines remaining">{String(mineCount).padStart(3, '0')}</span>
          <button type="button" className="ms-face" onClick={() => reset()} aria-label="New game">
            {face}
          </button>
          <span className="ms-counter" aria-label="Time elapsed">{String(time).padStart(3, '0')}</span>
        </div>

        <div
          className="ms-grid"
          style={{ gridTemplateColumns: `repeat(${level.cols}, 26px)` }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const showNumber = cell.revealed && !cell.mine && cell.adjacent > 0
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={`ms-cell ${cell.revealed ? 'is-revealed' : ''} ${
                    cell.revealed && cell.mine ? 'is-mine' : ''
                  }`}
                  style={showNumber ? { color: NUMBER_COLORS[cell.adjacent] } : undefined}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    toggleFlag(r, c)
                  }}
                >
                  {cellContent(cell)}
                </button>
              )
            }),
          )}
        </div>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{LEVELS[difficulty].label}</p>
        <p className="status-bar-field">
          {gameState === 'won' ? 'You win! 😎' : gameState === 'lost' ? 'Boom! Click the face to retry.' : 'Left-click to reveal, right-click to flag'}
        </p>
      </div>
    </div>
  )
}
