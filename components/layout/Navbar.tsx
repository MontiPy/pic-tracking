'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Search, Command, Settings, User } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import styles from './Navbar.module.css'

interface NavbarProps {
  onMobileMenuToggle: () => void
}

export default function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const { toggleCommandPalette, toggleSettings } = useAppStore()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch suppliers for search
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => setSuppliers(data))
      .catch(err => console.error('Error fetching suppliers:', err))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Keyboard shortcuts
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggleCommandPalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  const filteredSuppliers = suppliers
    .filter((supplier: any) => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length > 0
    )
    .slice(0, 5)

  const handleSupplierSelect = (supplierId: string) => {
    setSearchTerm('')
    router.push(`/suppliers#${supplierId}`)
  }

  return (
    <nav className={styles.navbar}>
      {/* Brand */}
      <Link href="/" className={styles.brand}>
        <Building2 className={styles.brandIcon} />
        <span>Supplier Portal</span>
      </Link>

      {/* Search */}
      <div className={styles.search} ref={searchRef}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search suppliers... (⌘K for command palette)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        
        {/* Search Results Dropdown */}
        {searchTerm && filteredSuppliers.length > 0 && (
          <div className={styles.searchResults}>
            {filteredSuppliers.map((supplier: any) => (
              <button
                key={supplier.id}
                onClick={() => handleSupplierSelect(supplier.id)}
                className={styles.searchResult}
              >
                <div className={styles.searchResultContent}>
                  <div className={styles.searchResultName}>{supplier.name}</div>
                  <div className={styles.searchResultMeta}>
                    {supplier.contactInfo?.split(' | ')[0] || 'No contact info'}
                  </div>
                </div>
                <User className={styles.searchResultIcon} />
              </button>
            ))}
          </div>
        )}
        
        {searchTerm && filteredSuppliers.length === 0 && (
          <div className={styles.searchResults}>
            <div className={styles.noResults}>
              No suppliers found
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={toggleCommandPalette}
          className={styles.actionButton}
          title="Command Palette (Ctrl+K)"
          aria-label="Open command palette"
          data-keyboard-shortcut="Ctrl+K"
        >
          <Command size={16} />
          <span className={styles.actionButtonTooltip}>⌘K</span>
        </button>
        
        <button
          onClick={toggleSettings}
          className={styles.actionButton}
          title="Settings"
          aria-label="Open settings"
        >
          <Settings size={16} />
        </button>
        
        <button
          onClick={onMobileMenuToggle}
          className={styles.mobileMenuButton}
          aria-label="Toggle mobile menu"
        >
          <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
