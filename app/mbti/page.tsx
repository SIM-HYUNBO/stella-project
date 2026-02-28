'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'

export default function OmokGame() {
  const SIZE = 9
  const CELL = 50
  const BOARD_PIXEL = CELL * (SIZE - 1)

  const createBoard = () =>
    Array.from({ length: SIZE }, () => Array<string | null>(SIZE).fill(null))

  const [board, setBoard] = useState<(string | null)[][]>(createBoard())
  const [blackTurn, setBlackTurn] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)

  const handleClick = (row: number, col: number) => {
    if (winner) return
    if (board[row][col]) return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = blackTurn ? 'black' : 'white'
    setBoard(newBoard)

    if (checkWin(newBoard, row, col)) {
      setWinner(blackTurn ? '흑' : '백')
    } else {
      setBlackTurn(!blackTurn)
    }
  }

  const checkWin = (
    board: (string | null)[][],
    row: number,
    col: number
  ) => {
    const color = board[row][col]
    if (!color) return false

    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ]

    for (const [dx, dy] of directions) {
      let count = 1

      for (const dir of [-1, 1]) {
        let r = row + dx * dir
        let c = col + dy * dir

        while (
          r >= 0 &&
          r < SIZE &&
          c >= 0 &&
          c < SIZE &&
          board[r][c] === color
        ) {
          count++
          r += dx * dir
          c += dy * dir
        }
      }

      if (count >= 5) return true
    }

    return false
  }

  const resetGame = () => {
    setBoard(createBoard())
    setBlackTurn(true)
    setWinner(null)
  }

  return (
    <div style={styles.container}>
      <h1>9x9 교차점 오목</h1>

      <div style={styles.status}>
        {winner
          ? `${winner} 승리!`
          : `현재 턴: ${blackTurn ? '흑(●)' : '백(○)'}`}
      </div>

      <div
        style={{
          ...styles.board,
          width: BOARD_PIXEL,
          height: BOARD_PIXEL,
        }}
      >
        {/* 바둑판 선 */}
        {Array.from({ length: SIZE }).map((_, i) => (
          <div
            key={'h' + i}
            style={{
              position: 'absolute',
              top: i * CELL,
              left: 0,
              width: BOARD_PIXEL,
              height: 1,
              background: '#333',
            }}
          />
        ))}
        {Array.from({ length: SIZE }).map((_, i) => (
          <div
            key={'v' + i}
            style={{
              position: 'absolute',
              left: i * CELL,
              top: 0,
              width: 1,
              height: BOARD_PIXEL,
              background: '#333',
            }}
          />
        ))}

        {/* 교차점 클릭 영역 */}
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              style={{
                position: 'absolute',
                left: c * CELL - CELL / 2,
                top: r * CELL - CELL / 2,
                width: CELL,
                height: CELL,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {cell && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: cell,
                    boxShadow: '0 3px 6px rgba(0,0,0,0.4)',
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>

      <button style={styles.button} onClick={resetGame}>
        다시 시작
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 40,
    minHeight: '100vh',
    backgroundColor: '#f2e6c9',
  },
  status: {
    marginBottom: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  board: {
    position: 'relative',
    backgroundColor: '#d4a55d',
    border: '3px solid #8b5a2b',
  },
  button: {
    marginTop: 30,
    padding: '8px 16px',
    fontSize: 16,
    cursor: 'pointer',
  },
}