'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface AccessibilityPreferences {
  reduceMotion: boolean
  highContrast: boolean
  screenReader: boolean
  keyboardOnly: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  focusIndicatorStyle: 'default' | 'high-visibility' | 'custom'
  announceChanges: boolean
  skipLinks: boolean
}

export interface AccessibilityFeatures {
  liveRegions: Map<string, HTMLElement>
  skipLinks: Array<{ href: string; label: string; id: string }>
  landmarkRegions: Array<{ element: HTMLElement; role: string; label?: string }>
  focusHistory: Array<{ element: HTMLElement; timestamp: number }>
  screenReaderText: Map<string, string>
}

const defaultPreferences: AccessibilityPreferences = {
  reduceMotion: false,
  highContrast: false,
  screenReader: false,
  keyboardOnly: false,
  fontSize: 'medium',
  focusIndicatorStyle: 'default',
  announceChanges: true,
  skipLinks: true,
}

export const useAccessibility = () => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences)
  const [features, setFeatures] = useState<AccessibilityFeatures>({
    liveRegions: new Map(),
    skipLinks: [],
    landmarkRegions: [],
    focusHistory: [],
    screenReaderText: new Map(),
  })
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false)
  const [currentFocus, setCurrentFocus] = useState<HTMLElement | null>(null)
  
  const router = useRouter()
  const announceTimeout = useRef<NodeJS.Timeout>()
  const focusTrackingEnabled = useRef(true)

  // Detect accessibility preferences from system
  const detectSystemPreferences = useCallback(() => {
    const systemPrefs: Partial<AccessibilityPreferences> = {}

    // Detect reduced motion preference
    if (typeof window !== 'undefined') {
      systemPrefs.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      systemPrefs.highContrast = window.matchMedia('(prefers-contrast: high)').matches
    }

    return systemPrefs
  }, [])

  // Initialize preferences from localStorage and system
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedPrefs = localStorage.getItem('accessibility-preferences')
    const systemPrefs = detectSystemPreferences()
    
    let initialPrefs = { ...defaultPreferences, ...systemPrefs }
    
    if (savedPrefs) {
      try {
        const parsedPrefs = JSON.parse(savedPrefs)
        initialPrefs = { ...initialPrefs, ...parsedPrefs }
      } catch (error) {
        console.error('Failed to parse accessibility preferences:', error)
      }
    }

    setPreferences(initialPrefs)
  }, [detectSystemPreferences])

  // Save preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-preferences', JSON.stringify(preferences))
    }
  }, [preferences])

  // Apply CSS custom properties based on preferences
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    
    // Font size scaling
    const fontSizeMap = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem',
      'extra-large': '1.25rem'
    }
    root.style.setProperty('--accessibility-font-size', fontSizeMap[preferences.fontSize])

    // Focus indicator styles
    if (preferences.focusIndicatorStyle === 'high-visibility') {
      root.style.setProperty('--focus-ring-width', '3px')
      root.style.setProperty('--focus-ring-color', '#ff0066')
      root.style.setProperty('--focus-ring-style', 'solid')
    } else {
      root.style.setProperty('--focus-ring-width', '2px')
      root.style.setProperty('--focus-ring-color', '#3b82f6')
      root.style.setProperty('--focus-ring-style', 'solid')
    }

    // Animation preferences
    if (preferences.reduceMotion) {
      root.style.setProperty('--animation-duration', '0.01ms')
      root.style.setProperty('--transition-duration', '0.01ms')
    } else {
      root.style.setProperty('--animation-duration', '300ms')
      root.style.setProperty('--transition-duration', '150ms')
    }

    // Contrast preferences
    root.classList.toggle('high-contrast', preferences.highContrast)
    root.classList.toggle('keyboard-navigation', preferences.keyboardOnly)
  }, [preferences])

  // Screen reader detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Simple screen reader detection heuristic
    const detectScreenReader = () => {
      // Check for common screen reader user agents or accessibility APIs
      const userAgent = navigator.userAgent.toLowerCase()
      const hasAccessibilityAPI = 'speechSynthesis' in window || 'speechSynthesis' in window
      
      // More sophisticated detection could be added here
      const likelyScreenReader = hasAccessibilityAPI && (
        userAgent.includes('nvda') ||
        userAgent.includes('jaws') ||
        userAgent.includes('dragon') ||
        userAgent.includes('voiceover')
      )

      setIsScreenReaderActive(likelyScreenReader)
      
      if (likelyScreenReader && !preferences.screenReader) {
        setPreferences(prev => ({ ...prev, screenReader: true }))
      }
    }

    detectScreenReader()
  }, [preferences.screenReader])

  // Live region management
  const createLiveRegion = useCallback((id: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return null

    let liveRegion = document.getElementById(`live-region-${id}`)
    
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = `live-region-${id}`
      liveRegion.setAttribute('aria-live', politeness)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      liveRegion.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `
      document.body.appendChild(liveRegion)
    }

    setFeatures(prev => ({
      ...prev,
      liveRegions: new Map(prev.liveRegions.set(id, liveRegion as HTMLElement))
    }))

    return liveRegion
  }, [])

  // Announce to screen readers
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    delay = 100
  ) => {
    if (!preferences.announceChanges) return

    if (announceTimeout.current) {
      clearTimeout(announceTimeout.current)
    }

    announceTimeout.current = setTimeout(() => {
      const liveRegion = createLiveRegion('announcements', priority)
      if (liveRegion) {
        liveRegion.textContent = message
        
        // Clear after announcement to avoid repetition
        setTimeout(() => {
          liveRegion.textContent = ''
        }, 1000)
      }
    }, delay)
  }, [preferences.announceChanges, createLiveRegion])

  // Skip link management
  const addSkipLink = useCallback((href: string, label: string, id?: string) => {
    const skipLinkId = id || `skip-${href.replace(/[^a-zA-Z0-9]/g, '-')}`
    
    setFeatures(prev => ({
      ...prev,
      skipLinks: [
        ...prev.skipLinks.filter(link => link.id !== skipLinkId),
        { href, label, id: skipLinkId }
      ]
    }))
  }, [])

  const removeSkipLink = useCallback((id: string) => {
    setFeatures(prev => ({
      ...prev,
      skipLinks: prev.skipLinks.filter(link => link.id !== id)
    }))
  }, [])

  // Focus management
  const manageFocus = useCallback((element: HTMLElement | null, options?: {
    preventScroll?: boolean
    temporary?: boolean
    reason?: string
  }) => {
    if (!element || !focusTrackingEnabled.current) return

    const opts = { preventScroll: false, temporary: false, ...options }

    // Store focus history for restoration
    if (!opts.temporary && currentFocus) {
      setFeatures(prev => ({
        ...prev,
        focusHistory: [
          ...prev.focusHistory.slice(-4), // Keep last 5 items
          { element: currentFocus, timestamp: Date.now() }
        ]
      }))
    }

    element.focus({ preventScroll: opts.preventScroll })
    setCurrentFocus(element)

    if (opts.reason && preferences.announceChanges) {
      announce(`Focus moved to ${opts.reason}`, 'polite')
    }
  }, [currentFocus, preferences.announceChanges, announce])

  const restoreFocus = useCallback(() => {
    const lastFocus = features.focusHistory[features.focusHistory.length - 1]
    if (lastFocus && document.contains(lastFocus.element)) {
      manageFocus(lastFocus.element, { reason: 'previous location' })
      
      setFeatures(prev => ({
        ...prev,
        focusHistory: prev.focusHistory.slice(0, -1)
      }))
    }
  }, [features.focusHistory, manageFocus])

  // Keyboard navigation helpers
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Manufacturing-specific accessibility helpers
  const announceTaskStatusChange = useCallback((
    taskName: string, 
    oldStatus: string, 
    newStatus: string,
    supplierName?: string
  ) => {
    const statusLabels = {
      not_started: 'not started',
      in_progress: 'in progress',
      submitted: 'submitted',
      approved: 'approved',
      blocked: 'blocked'
    }

    const message = `${supplierName ? `${supplierName} ` : ''}${taskName} status changed from ${
      statusLabels[oldStatus as keyof typeof statusLabels] || oldStatus
    } to ${
      statusLabels[newStatus as keyof typeof statusLabels] || newStatus
    }`

    announce(message, 'assertive')
  }, [announce])

  const announceFilterChange = useCallback((
    filterType: string, 
    filterValue: string, 
    resultCount: number
  ) => {
    const message = `${filterType} filter applied: ${filterValue}. ${resultCount} result${resultCount !== 1 ? 's' : ''} found.`
    announce(message, 'polite')
  }, [announce])

  const announceNavigationChange = useCallback((pageName: string) => {
    announce(`Navigated to ${pageName}`, 'polite', 300)
  }, [announce])

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (announceTimeout.current) {
        clearTimeout(announceTimeout.current)
      }
    }
  }, [])

  return {
    preferences,
    features,
    isScreenReaderActive,
    currentFocus,
    
    // Configuration
    updatePreferences,
    
    // Live regions
    createLiveRegion,
    announce,
    
    // Skip links
    addSkipLink,
    removeSkipLink,
    
    // Focus management
    manageFocus,
    restoreFocus,
    trapFocus,
    
    // Manufacturing-specific
    announceTaskStatusChange,
    announceFilterChange,
    announceNavigationChange,
  }
}