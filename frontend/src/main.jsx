import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CoupleProvider } from './context/CoupleContext.jsx'
import { GuideContentProvider } from './context/GuideContentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GuideContentProvider>
          <CoupleProvider>
            <App />
          </CoupleProvider>
        </GuideContentProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
