import React from 'react'
import ReactDOM from 'react-dom/client'
import SecurePathPSP from './SecurePathPSP'
import MiniSimulacro from './MiniSimulacro'

// Enrutado mínimo sin librería: la ruta /mini muestra el mini simulacro público
// (sin cuenta); cualquier otra ruta, la app normal.
const esMini = window.location.pathname.replace(/\/+$/, '') === '/mini'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esMini ? <MiniSimulacro /> : <SecurePathPSP />}
  </React.StrictMode>
)