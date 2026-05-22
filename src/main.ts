import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('app')

if (!root) {
  throw new Error('App root not found')
}

createRoot(root).render(createElement(App))
