import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import TebexExchangeSystem from './tebexApp/main'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <TebexExchangeSystem></TebexExchangeSystem>
      </div>
    </>
  )
}

export default App
