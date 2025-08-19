'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users, 
  CheckSquare, 
  Calendar,
  BarChart3,
  Settings,
  Table,
  Kanban,
  Plus,
  Eye,
  Clock,
  Archive
} from 'lucide-react'
import { useAppStore, useCurrentSavedView } from '@/stores/useAppStore'
import styles from './Sidebar.module.css'

interface SidebarProps {
  onItemClick?: () => void
}

const primaryNavigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: Building2,
    description: 'Overview and analytics'
  },
  { 
    name: 'Projects', 
    href: '/projects', 
    icon: Building2,
    description: 'Manage manufacturing projects'
  },
  { 
    name: 'Suppliers', 
    href: '/suppliers', 
    icon: Users,
    description: 'Supplier management'
  },
  { 
    name: 'Tasks', 
    href: '/tasks', 
    icon: CheckSquare,
    description: 'Task tracking and status'
  },
  { 
    name: 'Schedule', 
    href: '/schedule', 
    icon: Calendar,
    description: 'Master schedule and timeline'
  },
]

const secondaryNavigation = [
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    description: 'Analytics and reporting'
  },
  { 
    name: 'Templates', 
    href: '/templates', 
    icon: Archive,
    description: 'Task type templates'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    description: 'System configuration'
  },
]

const viewIcons = {
  table: Table,
  board: Kanban,
  timeline: Clock,
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const pathname = usePathname()
  const { 
    currentView, 
    viewDensity,
    sidebarCollapsed,
    savedViews,
    activeSavedViewId,
    setCurrentView,
    setViewDensity,
    setActiveSavedView,
    toggleSidebar 
  } = useAppStore()
  
  const currentSavedView = useCurrentSavedView()

  const handleNavClick = () => {
    onItemClick?.()
  }

  const isDataPage = ['/projects', '/suppliers', '/tasks', '/schedule'].includes(pathname)

  return (
    <div className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Brand Section */}
      {!sidebarCollapsed && (
        <div className={styles.brand}>
          <h1 className={styles.brandTitle}>Portal</h1>
          <p className={styles.brandSubtitle}>Manufacturing Task Management</p>
        </div>
      )}

      {/* Primary Navigation */}
      <nav className={styles.navSection}>
        {!sidebarCollapsed && (
          <h2 className={styles.navSectionTitle}>Navigation</h2>
        )}
        <ul className={styles.navList}>
          {primaryNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <li key={item.name} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  onClick={handleNavClick}
                  title={sidebarCollapsed ? item.description : ''}
                >
                  <Icon className={styles.navIcon} />
                  {!sidebarCollapsed && (
                    <>
                      <span className={styles.navText}>{item.name}</span>
                      {item.name === 'Tasks' && (
                        <span className={styles.navBadge}>12</span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* View Controls (only show on data pages) */}
      {isDataPage && !sidebarCollapsed && (
        <div className={styles.viewControls}>
          <h3 className={styles.navSectionTitle}>View</h3>
          
          {/* View Toggle */}
          <div className={styles.viewToggle}>
            {(['table', 'board', 'timeline'] as const).map((view) => {
              const Icon = viewIcons[view]
              return (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`${styles.viewButton} ${currentView === view ? styles.active : ''}`}
                  title={`Switch to ${view} view`}
                >
                  <Icon size={12} />
                </button>
              )
            })}
          </div>

          {/* Density Control */}
          <div className={styles.densityControl}>
            <label className={styles.densityLabel} htmlFor="density-select">
              Density
            </label>
            <select
              id="density-select"
              value={viewDensity}
              onChange={(e) => setViewDensity(e.target.value as any)}
              className={styles.densitySelect}
            >
              <option value="comfortable">Comfortable</option>
              <option value="normal">Normal</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
      )}

      {/* Saved Views */}
      {isDataPage && !sidebarCollapsed && (
        <div className={styles.savedViews}>
          <div className={styles.savedViewsHeader}>
            <h3 className={styles.savedViewsTitle}>Saved Views</h3>
            <button 
              className={styles.addViewButton}
              title="Create new saved view"
            >
              <Plus size={12} />
            </button>
          </div>
          
          <ul className={styles.savedViewsList}>
            {savedViews.map((view) => {
              const isActive = activeSavedViewId === view.id
              const ViewIcon = viewIcons[view.viewMode]
              
              return (
                <li key={view.id} className={styles.savedViewItem}>
                  <button
                    onClick={() => {
                      setActiveSavedView(view.id)
                      handleNavClick()
                    }}
                    className={`${styles.savedViewLink} ${isActive ? styles.active : ''}`}
                  >
                    <ViewIcon className={styles.savedViewIcon} />
                    <span className={styles.savedViewText}>{view.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Secondary Navigation */}
      <nav className={styles.navSection}>
        {!sidebarCollapsed && (
          <h2 className={styles.navSectionTitle}>Management</h2>
        )}
        <ul className={styles.navList}>
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <li key={item.name} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  onClick={handleNavClick}
                  title={sidebarCollapsed ? item.description : ''}
                >
                  <Icon className={styles.navIcon} />
                  {!sidebarCollapsed && (
                    <span className={styles.navText}>{item.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Actions */}
      {!sidebarCollapsed && (
        <div className={styles.footer}>
          <button 
            onClick={toggleSidebar}
            className={styles.footerButton}
            title="Collapse sidebar"
          >
            <Eye className={styles.footerIcon} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      )}
    </div>
  )
}