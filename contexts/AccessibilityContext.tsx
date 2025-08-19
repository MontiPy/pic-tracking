'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useAccessibility } from '@/hooks/useAccessibility'
import type { AccessibilityPreferences } from '@/hooks/useAccessibility'

interface AccessibilityContextType {
  preferences: AccessibilityPreferences
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => void
  announce: (message: string, priority?: 'polite' | 'assertive', delay?: number) => void
  manageFocus: (element: HTMLElement | null, options?: {
    preventScroll?: boolean
    temporary?: boolean
    reason?: string
  }) => void
  restoreFocus: () => void
  trapFocus: (container: HTMLElement) => (() => void)
  addSkipLink: (href: string, label: string, id?: string) => void
  removeSkipLink: (id: string) => void
  announceTaskStatusChange: (taskName: string, oldStatus: string, newStatus: string, supplierName?: string) => void
  announceFilterChange: (filterType: string, filterValue: string, resultCount: number) => void
  announceNavigationChange: (pageName: string) => void
  isScreenReaderActive: boolean
  currentFocus: HTMLElement | null
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const accessibility = useAccessibility()

  // Register common skip links
  useEffect(() => {
    accessibility.addSkipLink('#main-content', 'Skip to main content')
    accessibility.addSkipLink('#primary-navigation', 'Skip to navigation')
    accessibility.addSkipLink('#search', 'Skip to search')
    
    return () => {
      accessibility.removeSkipLink('skip-main-content')
      accessibility.removeSkipLink('skip-primary-navigation') 
      accessibility.removeSkipLink('skip-search')
    }
  }, [accessibility])

  // Apply global accessibility styles
  useEffect(() => {
    if (typeof document === 'undefined') return

    const style = document.createElement('style')
    style.textContent = `
      /* Screen reader only content */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      /* Skip links */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--color-neutral-900, #111827);
        color: var(--color-neutral-50, #f9fafb);
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        transition: top 0.3s ease;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      /* High contrast mode styles */
      .high-contrast {
        --color-text-primary: #000000;
        --color-text-secondary: #000000;
        --color-bg-primary: #ffffff;
        --color-bg-secondary: #ffffff;
        --color-border-default: #000000;
        --color-accent-500: #0000ff;
        --focus-ring-color: #ff0000;
        --focus-ring-width: 3px;
      }
      
      .high-contrast * {
        text-shadow: none !important;
        box-shadow: none !important;
      }
      
      .high-contrast button,
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        border: 2px solid #000000 !important;
      }
      
      /* Keyboard navigation styles */
      .keyboard-navigation *:focus-visible {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3b82f6) !important;
        outline-offset: 2px;
      }
      
      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
      
      /* Font size scaling */
      .font-size-small { font-size: calc(var(--base-font-size, 1rem) * 0.875); }
      .font-size-medium { font-size: var(--base-font-size, 1rem); }
      .font-size-large { font-size: calc(var(--base-font-size, 1rem) * 1.125); }
      .font-size-extra-large { font-size: calc(var(--base-font-size, 1rem) * 1.25); }
      
      /* Focus indicators for custom components */
      [role="button"]:focus-visible,
      [role="tab"]:focus-visible,
      [role="menuitem"]:focus-visible,
      [role="option"]:focus-visible {
        outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, #3b82f6);
        outline-offset: 2px;
      }
      
      /* Ensure sufficient color contrast for status indicators */
      .status-indicator {
        border: 1px solid rgba(0, 0, 0, 0.2);
      }
      
      .high-contrast .status-indicator {
        border-width: 2px;
        border-color: #000000;
      }
      
      /* Accessibility improvements for manufacturing status */
      .status-not-started::after {
        content: " (Not Started)";
      }
      
      .status-in-progress::after {
        content: " (In Progress)";
      }
      
      .status-submitted::after {
        content: " (Submitted)";
      }
      
      .status-approved::after {
        content: " (Approved)";
      }
      
      .status-blocked::after {
        content: " (Blocked)";
      }
      
      .sr-only .status-not-started::after,
      .sr-only .status-in-progress::after,
      .sr-only .status-submitted::after,
      .sr-only .status-approved::after,
      .sr-only .status-blocked::after {
        content: "";
      }
      
      /* Live region styling */
      [aria-live] {
        font-weight: 500;
      }
      
      /* Keyboard shortcut indicators */
      .keyboard-shortcut {
        border: 1px solid var(--color-border-default);
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 11px;
        font-family: monospace;
        background: var(--color-bg-tertiary);
      }
      
      .high-contrast .keyboard-shortcut {
        border: 2px solid #000000;
        background: #ffffff;
        color: #000000;
      }
    `
    
    document.head.appendChild(style)
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  const contextValue: AccessibilityContextType = {
    preferences: accessibility.preferences,
    updatePreferences: accessibility.updatePreferences,
    announce: accessibility.announce,
    manageFocus: accessibility.manageFocus,
    restoreFocus: accessibility.restoreFocus,
    trapFocus: accessibility.trapFocus,
    addSkipLink: accessibility.addSkipLink,
    removeSkipLink: accessibility.removeSkipLink,
    announceTaskStatusChange: accessibility.announceTaskStatusChange,
    announceFilterChange: accessibility.announceFilterChange,
    announceNavigationChange: accessibility.announceNavigationChange,
    isScreenReaderActive: accessibility.isScreenReaderActive,
    currentFocus: accessibility.currentFocus,
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip Links */}
      {accessibility.preferences.skipLinks && (
        <div className="skip-links">
          {accessibility.features.skipLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="skip-link"
              onFocus={() => accessibility.announce(`Skip link: ${link.label}`, 'polite')}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      
      {children}
    </AccessibilityContext.Provider>
  )
}