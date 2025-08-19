'use client'

import { useState } from 'react'
import { 
  Accessibility, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  MousePointer,
  Keyboard,
  Type,
  Contrast,
  Settings,
  Check,
  X,
  Info,
  Zap,
} from 'lucide-react'
import { useAccessibilityContext } from '@/contexts/AccessibilityContext'
import styles from './AccessibilityPanel.module.css'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { 
    preferences, 
    updatePreferences, 
    announce, 
    isScreenReaderActive 
  } = useAccessibilityContext()
  
  const [testAnnouncement, setTestAnnouncement] = useState('')

  const handleTogglePreference = (key: keyof typeof preferences) => {
    const newValue = !preferences[key]
    updatePreferences({ [key]: newValue })
    
    announce(
      `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${newValue ? 'enabled' : 'disabled'}`,
      'assertive'
    )
  }

  const handleFontSizeChange = (fontSize: typeof preferences.fontSize) => {
    updatePreferences({ fontSize })
    announce(`Font size changed to ${fontSize}`, 'polite')
  }

  const handleFocusStyleChange = (focusIndicatorStyle: typeof preferences.focusIndicatorStyle) => {
    updatePreferences({ focusIndicatorStyle })
    announce(`Focus indicator style changed to ${focusIndicatorStyle}`, 'polite')
  }

  const handleTestAnnouncement = () => {
    if (testAnnouncement.trim()) {
      announce(testAnnouncement, 'assertive')
      setTestAnnouncement('')
    }
  }

  const resetToDefaults = () => {
    updatePreferences({
      reduceMotion: false,
      highContrast: false,
      screenReader: false,
      keyboardOnly: false,
      fontSize: 'medium',
      focusIndicatorStyle: 'default',
      announceChanges: true,
      skipLinks: true,
    })
    announce('Accessibility settings reset to defaults', 'assertive')
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="accessibility-panel-title"
        aria-describedby="accessibility-panel-description"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Accessibility size={24} />
            <div>
              <h2 id="accessibility-panel-title" className={styles.title}>
                Accessibility Settings
              </h2>
              <p id="accessibility-panel-description" className={styles.description}>
                Customize the interface to meet your accessibility needs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close accessibility settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* System Detection */}
          {isScreenReaderActive && (
            <div className={styles.detection}>
              <Info size={16} />
              <span>Screen reader detected. Optimized settings applied automatically.</span>
            </div>
          )}

          {/* Visual Settings */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Eye size={18} />
              Visual Settings
            </h3>
            
            <div className={styles.settingGroup}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="high-contrast">
                    High Contrast Mode
                  </label>
                  <p className={styles.settingDescription}>
                    Increases contrast between text and background colors
                  </p>
                </div>
                <button
                  id="high-contrast"
                  onClick={() => handleTogglePreference('highContrast')}
                  className={`${styles.toggle} ${preferences.highContrast ? styles.enabled : ''}`}
                  aria-pressed={preferences.highContrast}
                  aria-describedby="high-contrast-desc"
                >
                  <span className={styles.toggleSlider} />
                  <span className="sr-only">
                    {preferences.highContrast ? 'Disable' : 'Enable'} high contrast mode
                  </span>
                </button>
              </div>

              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="font-size">
                    Font Size
                  </label>
                  <p className={styles.settingDescription}>
                    Adjust text size for better readability
                  </p>
                </div>
                <div className={styles.buttonGroup} role="radiogroup" aria-labelledby="font-size">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`${styles.optionButton} ${
                        preferences.fontSize === size ? styles.selected : ''
                      }`}
                      role="radio"
                      aria-checked={preferences.fontSize === size}
                    >
                      <Type size={size === 'small' ? 12 : size === 'large' ? 18 : size === 'extra-large' ? 20 : 14} />
                      <span className="sr-only">{size} font size</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Motion & Animation */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Zap size={18} />
              Motion & Animation
            </h3>
            
            <div className={styles.setting}>
              <div className={styles.settingInfo}>
                <label className={styles.settingLabel} htmlFor="reduce-motion">
                  Reduce Motion
                </label>
                <p className={styles.settingDescription}>
                  Minimizes animations and transitions that may cause discomfort
                </p>
              </div>
              <button
                id="reduce-motion"
                onClick={() => handleTogglePreference('reduceMotion')}
                className={`${styles.toggle} ${preferences.reduceMotion ? styles.enabled : ''}`}
                aria-pressed={preferences.reduceMotion}
              >
                <span className={styles.toggleSlider} />
                <span className="sr-only">
                  {preferences.reduceMotion ? 'Allow' : 'Reduce'} motion and animations
                </span>
              </button>
            </div>
          </section>

          {/* Navigation Settings */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Keyboard size={18} />
              Navigation Settings
            </h3>
            
            <div className={styles.settingGroup}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="keyboard-only">
                    Keyboard-Only Navigation
                  </label>
                  <p className={styles.settingDescription}>
                    Optimizes interface for keyboard-only navigation
                  </p>
                </div>
                <button
                  id="keyboard-only"
                  onClick={() => handleTogglePreference('keyboardOnly')}
                  className={`${styles.toggle} ${preferences.keyboardOnly ? styles.enabled : ''}`}
                  aria-pressed={preferences.keyboardOnly}
                >
                  <span className={styles.toggleSlider} />
                </button>
              </div>

              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="skip-links">
                    Skip Navigation Links
                  </label>
                  <p className={styles.settingDescription}>
                    Provides shortcuts to main content areas
                  </p>
                </div>
                <button
                  id="skip-links"
                  onClick={() => handleTogglePreference('skipLinks')}
                  className={`${styles.toggle} ${preferences.skipLinks ? styles.enabled : ''}`}
                  aria-pressed={preferences.skipLinks}
                >
                  <span className={styles.toggleSlider} />
                </button>
              </div>

              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="focus-style">
                    Focus Indicator Style
                  </label>
                  <p className={styles.settingDescription}>
                    Choose how focused elements are highlighted
                  </p>
                </div>
                <select
                  id="focus-style"
                  value={preferences.focusIndicatorStyle}
                  onChange={(e) => handleFocusStyleChange(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="default">Default</option>
                  <option value="high-visibility">High Visibility</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </section>

          {/* Screen Reader Settings */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Volume2 size={18} />
              Screen Reader Settings
            </h3>
            
            <div className={styles.settingGroup}>
              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="announce-changes">
                    Announce Changes
                  </label>
                  <p className={styles.settingDescription}>
                    Announces status updates and navigation changes
                  </p>
                </div>
                <button
                  id="announce-changes"
                  onClick={() => handleTogglePreference('announceChanges')}
                  className={`${styles.toggle} ${preferences.announceChanges ? styles.enabled : ''}`}
                  aria-pressed={preferences.announceChanges}
                >
                  <span className={styles.toggleSlider} />
                </button>
              </div>

              <div className={styles.setting}>
                <div className={styles.settingInfo}>
                  <label className={styles.settingLabel} htmlFor="screen-reader-mode">
                    Screen Reader Mode
                  </label>
                  <p className={styles.settingDescription}>
                    Enables additional screen reader optimizations
                  </p>
                </div>
                <button
                  id="screen-reader-mode"
                  onClick={() => handleTogglePreference('screenReader')}
                  className={`${styles.toggle} ${preferences.screenReader ? styles.enabled : ''}`}
                  aria-pressed={preferences.screenReader}
                >
                  <span className={styles.toggleSlider} />
                </button>
              </div>
            </div>
          </section>

          {/* Test Area */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Settings size={18} />
              Test Announcements
            </h3>
            
            <div className={styles.testArea}>
              <label htmlFor="test-announcement" className={styles.settingLabel}>
                Test Screen Reader Announcement
              </label>
              <div className={styles.testInputGroup}>
                <input
                  id="test-announcement"
                  type="text"
                  value={testAnnouncement}
                  onChange={(e) => setTestAnnouncement(e.target.value)}
                  placeholder="Enter text to announce..."
                  className={styles.testInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTestAnnouncement()
                    }
                  }}
                />
                <button
                  onClick={handleTestAnnouncement}
                  disabled={!testAnnouncement.trim()}
                  className={styles.testButton}
                  aria-label="Test announcement"
                >
                  Test
                </button>
              </div>
              <p className={styles.testDescription}>
                Use this to test if screen reader announcements are working correctly
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            onClick={resetToDefaults}
            className={styles.resetButton}
          >
            Reset to Defaults
          </button>
          <div className={styles.footerInfo}>
            <p>
              Need help? These settings follow WCAG 2.1 AA guidelines for accessibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}