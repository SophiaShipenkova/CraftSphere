import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { OverlayScrollbars } from 'overlayscrollbars'

import { router } from './app/router'
import { ThemeProvider } from './context/ThemeContext'
import 'overlayscrollbars/overlayscrollbars.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
)

/** Главный скролл страницы: оверлей вместо системной «белой» полосы (особенно Win/Chromium). */
if (!document.documentElement.hasAttribute('data-overlayscrollbars-body')) {
  OverlayScrollbars(document.body, {
    scrollbars: {
      theme: 'os-theme-craftsphere',
      visibility: 'auto',
      autoHide: 'move',
      autoHideDelay: 600,
      dragScroll: true,
      clickScroll: true,
    },
  })
}
