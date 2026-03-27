import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

const _ol=console.log,_ow=console.warn,_oe=console.error;
console.log=(...a)=>{_ol(...a);window.__mqdebug?.({type:'console',message:a.map(String).join(' ')})};
console.warn=(...a)=>{_ow(...a);window.__mqdebug?.({type:'warn',message:a.map(String).join(' ')})};
console.error=(...a)=>{_oe(...a);window.__mqdebug?.({type:'error',message:a.map(String).join(' ')})};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
