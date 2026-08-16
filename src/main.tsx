import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadData } from './storage'

const root = createRoot(document.getElementById('root')!)

// Hard-sync from the real src/data/*.json files (via the local dev-server
// data API) before the first render, so the app always opens showing
// exactly what's on disk right now — including anything Save'd in a
// previous session or edited directly in the code.
loadData().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
