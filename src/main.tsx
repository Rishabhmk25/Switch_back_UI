import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installReducedMotionShim } from './lib/motion'

// Before the first render, so motion/react and Kokonut read the shimmed query.
installReducedMotionShim()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
