import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui'
import { configured } from './lib/supabase'
import App from './app/App'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {configured ? (
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter><App /></BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    ) : (
      <div className="state error" style={{ margin: 40 }}>
        <strong>Supabase is not configured.</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        (see .env.example and docs/SUPABASE_SETUP.md), then restart.
      </div>
    )}
  </React.StrictMode>,
)
