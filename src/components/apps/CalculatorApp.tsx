import './CalculatorApp.css'
import { useState } from 'react'

const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+']

function calculate(expression: string) {
  const safe = expression.replace(/[^0-9+\-*/.() ]/g, '')
  if (!safe.trim()) {
    return '0'
  }
  try {
    const result = Function(`"use strict"; return (${safe})`)() as number
    return Number.isFinite(result) ? String(Math.round(result * 1000000) / 1000000) : 'Error'
  } catch {
    return 'Error'
  }
}

export function CalculatorApp() {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')

  function press(key: string) {
    if (key === 'C') {
      setDisplay('0')
      setExpression('')
      return
    }
    if (key === 'CE') {
      setDisplay('0')
      return
    }
    if (key === '=') {
      const result = calculate(expression || display)
      setDisplay(result)
      setExpression(result === 'Error' ? '' : result)
      return
    }
    const next = expression + key
    setExpression(next)
    setDisplay(next)
  }

  return (
    <div className="calculator-app">
      <ul className="os-menu-bar" role="menubar">
        <li>Edit</li>
        <li>View</li>
        <li>Help</li>
      </ul>
      <input className="calculator-display" value={display} readOnly aria-label="Calculator display" />
      <div className="calculator-keys">
        <button type="button" onClick={() => press('C')}>
          C
        </button>
        <button type="button" onClick={() => press('CE')}>
          CE
        </button>
        <button type="button" onClick={() => press('(')}>
          (
        </button>
        <button type="button" onClick={() => press(')')}>
          )
        </button>
        {keys.map((key) => (
          <button key={key} type="button" onClick={() => press(key)}>
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}
