'use client'

import { ReactNode, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import CommandPalette from '../ui/CommandPalette'
import AccessibilityPanel from '../ui/AccessibilityPanel'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
  noPadding?: boolean
}

export default function Layout({ children, noPadding = false }: LayoutProps) {
  const { sidebarCollapsed, commandPaletteOpen, toggleCommandPalette, settingsOpen, toggleSettings } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <AccessibilityProvider>
      <div className={`${styles.layout} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      <header className={styles.header}>
        <Navbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
      </header>
      
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
        <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
      </aside>
      
      <main className={styles.main}>
        <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
          {children}
        </div>
      </main>
      
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
        {/* Command Palette */}
        <CommandPalette 
          isOpen={commandPaletteOpen} 
          onClose={toggleCommandPalette}
        />
        
        {/* Accessibility Panel */}
        <AccessibilityPanel 
          isOpen={settingsOpen} 
          onClose={toggleSettings}
        />
      </div>
    </AccessibilityProvider>
  )
}