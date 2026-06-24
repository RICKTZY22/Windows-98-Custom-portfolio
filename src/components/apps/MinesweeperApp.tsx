import './MinesweeperApp.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'brutal' | 'nightmare'
type GameState = 'ready' | 'playing' | 'won' | 'lost'

type LevelConfig = {
  rows: number
  cols: number
  mines: number
  label: string
  rank: string
  cellSize: number
}

type Cell = {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

const LEVELS: Record<Difficulty, LevelConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner', rank: 'Classic', cellSize: 26 },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate', rank: 'Sharp', cellSize: 23 },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Expert', rank: 'Veteran', cellSize: 20 },
  brutal: { rows: 20, cols: 30, mines: 135, label: 'Brutal', rank: 'Pressure', cellSize: 19 },
  nightmare: { rows: 22, cols: 34, mines: 190, label: 'Nightmare', rank: 'No mercy', cellSize: 18 },
}

const LEVEL_ORDER: Difficulty[] = ['beginner', 'intermediate', 'expert', 'brutal', 'nightmare']
const NUMBER_COLORS = ['', '#0017d8', '#008000', '#e00000', '#000080', '#800000', '#008080', '#000000', '#808080']

function makeBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  )
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })))
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

function placeMines(board: Cell[][], mines: number, safeR: number, safeC: number): Cell[][] {
  const rows = board.length
  const cols = board[0].length
  const next = cloneBoard(board).map((row) => row.map((cell) => ({ ...cell, mine: false, adjacent: 0 })))
  const forbidden = new Set<string>([`${safeR},${safeC}`, ...neighbors(safeR, safeC, rows, cols).map(([r, c]) => `${r},${c}`)])
  const target = Math.min(mines, rows * cols - forbidden.size)
  let placed = 0
  let guard = 0

  while (placed < target && guard < 100000) {
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
  const next = cloneBoard(board)
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

function revealAllMines(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell.mine ? { ...cell, revealed: true } : { ...cell })))
}

function formatCounter(value: number): string {
  const clamped = Math.max(-99, Math.min(999, value))
  if (clamped < 0) return `-${String(Math.abs(clamped)).padStart(2, '0')}`
  return String(clamped).padStart(3, '0')
}

export function MinesweeperApp() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const level = LEVELS[difficulty]
  const [board, setBoard] = useState<Cell[][]>(() => makeBoard(level.rows, level.cols))
  const [gameState, setGameState] = useState<GameState>('ready')
  const [armed, setArmed] = useState(false)
  const [time, setTime] = useState(0)
  const timerRef = useRef<number | null>(null)

  const reset = useCallback((next: Difficulty = difficulty) => {
    const lvl = LEVELS[next]
    setBoard(makeBoard(lvl.rows, lvl.cols))
    setGameState('ready')
    setArmed(false)
    setTime(0)
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [difficulty])

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

  const hiddenSafeCount = useCallback((next: Cell[][]) => next.flat().filter((cell) => !cell.mine && !cell.revealed).length, [])

  function finishReveal(next: Cell[][]) {
    if (hiddenSafeCount(next) === 0) {
      setBoard(next.map((row) => row.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell))))
      setGameState('won')
      return
    }
    setBoard(next)
    if (gameState === 'ready') setGameState('playing')
  }

  function revealCell(r: number, c: number) {
    if (gameState === 'won' || gameState === 'lost') return
    const cell = board[r][c]
    if (cell.flagged || cell.revealed) return

    let working = board
    if (!armed) {
      working = placeMines(board, level.mines, r, c)
      setArmed(true)
    }

    if (working[r][c].mine) {
      setBoard(revealAllMines(working))
      setGameState('lost')
      return
    }

    finishReveal(floodReveal(working, r, c))
  }

  function chordCell(r: number, c: number) {
    if (!armed || gameState !== 'playing') return
    const cell = board[r][c]
    if (!cell.revealed || cell.mine || cell.adjacent === 0) return

    const around = neighbors(r, c, level.rows, level.cols)
    const flaggedAround = around.filter(([nr, nc]) => board[nr][nc].flagged).length
    if (flaggedAround !== cell.adjacent) return

    let working = board
    for (const [nr, nc] of around) {
      const target = working[nr][nc]
      if (target.flagged || target.revealed) continue
      if (target.mine) {
        setBoard(revealAllMines(working))
        setGameState('lost')
        return
      }
      working = floodReveal(working, nr, nc)
    }
    finishReveal(working)
  }

  function toggleFlag(r: number, c: number) {
    if (gameState === 'won' || gameState === 'lost') return
    const cell = board[r][c]
    if (cell.revealed) return
    const next = cloneBoard(board)
    next[r][c].flagged = !next[r][c].flagged
    setBoard(next)
  }

  function changeDifficulty(next: Difficulty) {
    setDifficulty(next)
    reset(next)
  }

  const mineCount = level.mines - flagsUsed
  const density = Math.round((level.mines / (level.rows * level.cols)) * 100)
  const stateLabel = gameState === 'won' ? 'Cleared' : gameState === 'lost' ? 'Detonated' : armed ? 'Armed' : 'Ready'
  const face = gameState === 'lost' ? 'X(' : gameState === 'won' ? 'B)' : gameState === 'playing' ? ':o' : ':)'
  const gridStyle = {
    '--ms-cell-size': `${level.cellSize}px`,
    gridTemplateColumns: `repeat(${level.cols}, var(--ms-cell-size))`,
  } as CSSProperties

  function cellContent(cell: Cell): string {
    if (gameState === 'lost' && cell.flagged && !cell.mine) return 'X'
    if (cell.flagged && !(gameState === 'lost' && cell.mine)) return 'P'
    if (!cell.revealed) return ''
    if (cell.mine) return '*'
    return cell.adjacent > 0 ? String(cell.adjacent) : ''
  }

  return (
    <div className={`app-content minesweeper-app minesweeper-${difficulty}`}>
      <ul className="os-menu-bar" role="menubar">
        <li className="ms-menu">
          Game
          <ul className="ms-menu-dropdown">
            <li><button type="button" onClick={() => reset()}>New</button></li>
            <li className="ms-menu-sep" aria-hidden="true" />
            {LEVEL_ORDER.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => changeDifficulty(id)}>
                  {difficulty === id ? '* ' : '  '}
                  {LEVELS[id].label}
                </button>
              </li>
            ))}
          </ul>
        </li>
        <li>Help</li>
      </ul>

      <section className="ms-shell" aria-label="Minesweeper">
        <div className="ms-title-strip">
          <span>Minefield Control</span>
          <span>{level.rank}</span>
        </div>

        <div className="ms-hud">
          <span className="ms-counter" aria-label="Mines remaining">{formatCounter(mineCount)}</span>
          <button type="button" className="ms-face" onClick={() => reset()} aria-label="New game">
            {face}
          </button>
          <span className="ms-counter" aria-label="Time elapsed">{formatCounter(time)}</span>
        </div>

        <div className="ms-level-panel">
          <span>{level.label}</span>
          <span>{level.rows} x {level.cols}</span>
          <span>{level.mines} mines</span>
          <span>{density}%</span>
        </div>

        <div className="sunken-panel ms-board-scroll">
          <div className="ms-grid" style={gridStyle} onContextMenu={(event) => event.preventDefault()}>
            {board.map((row, r) =>
              row.map((cell, c) => {
                const showNumber = cell.revealed && !cell.mine && cell.adjacent > 0
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={`ms-cell ${cell.revealed ? 'is-revealed' : ''} ${
                      cell.revealed && cell.mine ? 'is-mine' : ''
                    } ${gameState === 'lost' && cell.flagged && !cell.mine ? 'is-wrong-flag' : ''}`}
                    style={showNumber ? { color: NUMBER_COLORS[cell.adjacent] } : undefined}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                    onClick={() => revealCell(r, c)}
                    onDoubleClick={() => chordCell(r, c)}
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
      </section>

      <div className="status-bar">
        <p className="status-bar-field">{stateLabel}</p>
        <p className="status-bar-field">{level.label} - {level.mines} mines</p>
      </div>
    </div>
  )
}
