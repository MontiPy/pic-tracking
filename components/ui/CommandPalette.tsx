'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { 
  Search, 
  ChevronRight, 
  Clock,
  Star,
  ArrowRight,
  Hash,
  Building,
  ClipboardList,
  Users,
  Settings,
  Plus,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  Circle,
  Triangle,
  PlayCircle,
  X,
  Command,
  Keyboard,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useRouter } from 'next/navigation'
import styles from './CommandPalette.module.css'

export interface Command {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  category: 'navigation' | 'action' | 'search' | 'filter' | 'manufacturing'
  keywords: string[]
  shortcut?: string
  action: () => void | Promise<void>
  disabled?: boolean
  group?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const [favoriteCommands, setFavoriteCommands] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { 
    commandPaletteOpen,
    toggleCommandPalette,
    setCurrentView,
    filters,
    setFilters,
  } = useAppStore()

  // Base commands with enhanced manufacturing workflow support
  const baseCommands = useMemo<Command[]>(() => [
    // Navigation Commands
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      subtitle: 'View project overview and metrics',
      icon: <ClipboardList size={16} />,
      category: 'navigation',
      keywords: ['dashboard', 'home', 'overview', 'metrics'],
      shortcut: 'Ctrl+1',
      action: () => router.push('/dashboard'),
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      subtitle: 'Manage manufacturing projects',
      icon: <Building size={16} />,
      category: 'navigation',
      keywords: ['projects', 'manufacturing', 'manage'],
      shortcut: 'Ctrl+2',
      action: () => router.push('/projects'),
    },
    {
      id: 'nav-suppliers',
      title: 'Go to Suppliers',
      subtitle: 'Manage supplier relationships',
      icon: <Users size={16} />,
      category: 'navigation',
      keywords: ['suppliers', 'vendors', 'partners'],
      shortcut: 'Ctrl+3',
      action: () => router.push('/suppliers'),
    },
    {
      id: 'nav-schedule',
      title: 'Go to Schedule',
      subtitle: 'View task timeline and deadlines',
      icon: <Calendar size={16} />,
      category: 'navigation',
      keywords: ['schedule', 'timeline', 'calendar', 'deadlines'],
      shortcut: 'Ctrl+4',
      action: () => router.push('/schedule'),
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      subtitle: 'Configure application preferences',
      icon: <Settings size={16} />,
      category: 'navigation',
      keywords: ['settings', 'preferences', 'configuration'],
      shortcut: 'Ctrl+,',
      action: () => router.push('/settings'),
    },

    // View Actions
    {
      id: 'view-table',
      title: 'Switch to Table View',
      subtitle: 'Detailed tabular data view',
      icon: <ClipboardList size={16} />,
      category: 'action',
      keywords: ['table', 'view', 'data', 'rows', 'columns'],
      shortcut: '1',
      action: () => setCurrentView('table'),
    },
    {
      id: 'view-board',
      title: 'Switch to Board View',
      subtitle: 'Kanban-style board view',
      icon: <ClipboardList size={16} />,
      category: 'action',
      keywords: ['board', 'kanban', 'view', 'cards'],
      shortcut: '2',
      action: () => setCurrentView('board'),
    },
    {
      id: 'view-timeline',
      title: 'Switch to Timeline View',
      subtitle: 'Gantt-style timeline view',
      icon: <Calendar size={16} />,
      category: 'action',
      keywords: ['timeline', 'gantt', 'view', 'schedule'],
      shortcut: '3',
      action: () => setCurrentView('timeline'),
    },

    // Quick Actions
    {
      id: 'action-new-supplier',
      title: 'Add New Supplier',
      subtitle: 'Create a new supplier record',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'supplier', 'add', 'create', 'vendor'],
      shortcut: 'Ctrl+Shift+S',
      action: async () => {
        router.push('/suppliers?action=new')
      },
    },
    {
      id: 'action-new-project',
      title: 'Add New Project',
      subtitle: 'Create a new manufacturing project',
      icon: <Plus size={16} />,
      category: 'action',
      keywords: ['new', 'project', 'add', 'create', 'manufacturing'],
      shortcut: 'Ctrl+Shift+P',
      action: async () => {
        router.push('/projects?action=new')
      },
    },
    {
      id: 'action-refresh',
      title: 'Refresh Data',
      subtitle: 'Reload current page data',
      icon: <RefreshCw size={16} />,
      category: 'action',
      keywords: ['refresh', 'reload', 'update', 'sync'],
      shortcut: 'F5',
      action: () => {
        window.location.reload()
      },
    },

    // Filter Commands
    {
      id: 'filter-overdue',
      title: 'Show Overdue Tasks',
      subtitle: 'Filter to show only overdue tasks',
      icon: <AlertCircle size={16} />,
      category: 'filter',
      keywords: ['overdue', 'late', 'urgent', 'filter'],
      action: () => {
        setFilters({ overdue: true })
        onClose()
      },
    },
    {
      id: 'filter-today',
      title: 'Show Tasks Due Today',
      subtitle: 'Filter to show tasks due today',
      icon: <Calendar size={16} />,
      category: 'filter',
      keywords: ['today', 'due', 'urgent', 'filter'],
      action: () => {
        setFilters({ today: true })
        onClose()
      },
    },
    {
      id: 'filter-this-week',
      title: 'Show Tasks Due This Week',
      subtitle: 'Filter to show tasks due this week',
      icon: <Calendar size={16} />,
      category: 'filter',
      keywords: ['week', 'due', 'upcoming', 'filter'],
      action: () => {
        setFilters({ thisWeek: true })
        onClose()
      },
    },
    {
      id: 'filter-clear',
      title: 'Clear All Filters',
      subtitle: 'Remove all active filters',
      icon: <X size={16} />,
      category: 'filter',
      keywords: ['clear', 'reset', 'filters', 'all'],
      action: () => {
        setFilters({
          searchTerm: '',
          projectIds: [],
          supplierIds: [],
          statuses: [],
          categories: [],
          dueDateRange: {},
          overdue: false,
          today: false,
          thisWeek: false,
        })
        onClose()
      },
    },

    // Manufacturing Workflow Commands
    {
      id: 'mfg-part-approval',
      title: 'Filter: Part Approval Tasks',
      subtitle: 'Show only Part Approval (PA) tasks',
      icon: <CheckCircle size={16} />,
      category: 'manufacturing',
      keywords: ['part', 'approval', 'pa', 'ppap', 'manufacturing'],
      action: () => {
        setFilters({ categories: ['Part Approval'] })
        onClose()
      },
    },
    {
      id: 'mfg-nmr',
      title: 'Filter: NMR Tasks',
      subtitle: 'Show only New Model Release tasks',
      icon: <PlayCircle size={16} />,
      category: 'manufacturing',
      keywords: ['nmr', 'new', 'model', 'release', 'manufacturing'],
      action: () => {
        setFilters({ categories: ['NMR'] })
        onClose()
      },
    },
    {
      id: 'mfg-new-builds',
      title: 'Filter: New Model Builds',
      subtitle: 'Show only New Model Build tasks',
      icon: <Settings size={16} />,
      category: 'manufacturing',
      keywords: ['new', 'model', 'builds', 'manufacturing', 'production'],
      action: () => {
        setFilters({ categories: ['New Model Builds'] })
        onClose()
      },
    },
    {
      id: 'status-not-started',
      title: 'Filter: Not Started Tasks',
      subtitle: 'Show tasks that haven\'t been started',
      icon: <Circle size={16} />,
      category: 'manufacturing',
      keywords: ['not', 'started', 'pending', 'status'],
      action: () => {
        setFilters({ statuses: ['not_started'] })
        onClose()
      },
    },
    {
      id: 'status-in-progress',
      title: 'Filter: In Progress Tasks',
      subtitle: 'Show tasks currently in progress',
      icon: <PlayCircle size={16} />,
      category: 'manufacturing',
      keywords: ['in', 'progress', 'active', 'working', 'status'],
      action: () => {
        setFilters({ statuses: ['in_progress'] })
        onClose()
      },
    },
    {
      id: 'status-submitted',
      title: 'Filter: Submitted Tasks',
      subtitle: 'Show submitted tasks awaiting approval',
      icon: <ArrowRight size={16} />,
      category: 'manufacturing',
      keywords: ['submitted', 'review', 'approval', 'status'],
      action: () => {
        setFilters({ statuses: ['submitted'] })
        onClose()
      },
    },
    {
      id: 'status-approved',
      title: 'Filter: Approved Tasks',
      subtitle: 'Show approved/completed tasks',
      icon: <CheckCircle size={16} />,
      category: 'manufacturing',
      keywords: ['approved', 'completed', 'done', 'status'],
      action: () => {
        setFilters({ statuses: ['approved'] })
        onClose()
      },
    },
    {
      id: 'status-blocked',
      title: 'Filter: Blocked Tasks',
      subtitle: 'Show blocked tasks requiring attention',
      icon: <Triangle size={16} />,
      category: 'manufacturing',
      keywords: ['blocked', 'issues', 'problems', 'status'],
      action: () => {
        setFilters({ statuses: ['blocked'] })
        onClose()
      },
    },

    // Help and Documentation
    {
      id: 'help-shortcuts',
      title: 'Show Keyboard Shortcuts',
      subtitle: 'Display all available keyboard shortcuts',
      icon: <Keyboard size={16} />,
      category: 'action',
      keywords: ['help', 'shortcuts', 'keyboard', 'hotkeys'],
      action: () => {
        // This would open a shortcuts help dialog
        console.log('Opening shortcuts help')
        onClose()
      },
    },
  ], [router, setCurrentView, setFilters, onClose])

  // Fuzzy search implementation
  const fuzzySearch = useCallback((items: Command[], searchQuery: string): Command[] => {
    if (!searchQuery) {
      return items
    }

    const query = searchQuery.toLowerCase()
    
    return items
      .map(item => {
        let score = 0
        const title = item.title.toLowerCase()
        const subtitle = item.subtitle?.toLowerCase() || ''
        const keywords = item.keywords.join(' ').toLowerCase()
        const searchText = `${title} ${subtitle} ${keywords}`
        
        // Exact matches get highest score
        if (title.includes(query)) {
          score += 100
        }
        
        if (subtitle.includes(query)) {
          score += 50
        }
        
        // Keyword matches
        item.keywords.forEach(keyword => {
          if (keyword.toLowerCase().includes(query)) {
            score += 30
          }
        })
        
        // Fuzzy matching for partial matches
        let queryIndex = 0
        for (let i = 0; i < searchText.length && queryIndex < query.length; i++) {
          if (searchText[i] === query[queryIndex]) {
            queryIndex++
            score += 1
          }
        }
        
        // Bonus for recent commands
        if (recentCommands.includes(item.id)) {
          score += 20
        }
        
        // Bonus for favorite commands
        if (favoriteCommands.includes(item.id)) {
          score += 30
        }
        
        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [recentCommands, favoriteCommands])

  // Filtered and sorted commands
  const filteredCommands = useMemo(() => {
    return fuzzySearch(baseCommands, query).slice(0, 10) // Limit to 10 results
  }, [baseCommands, query, fuzzySearch])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    if (query) {
      return { 'Search Results': filteredCommands }
    }
    
    // Show recent/favorite commands when no query
    const recentCommandsFiltered = baseCommands
      .filter(cmd => recentCommands.includes(cmd.id))
      .slice(0, 5)
    
    const favoriteCommandsFiltered = baseCommands
      .filter(cmd => favoriteCommands.includes(cmd.id))
      .slice(0, 5)
    
    const groups: Record<string, Command[]> = {}
    
    if (favoriteCommandsFiltered.length > 0) {
      groups['Favorites'] = favoriteCommandsFiltered
    }
    
    if (recentCommandsFiltered.length > 0) {
      groups['Recent'] = recentCommandsFiltered
    }
    
    // Add popular commands if no recent/favorites
    if (Object.keys(groups).length === 0) {
      groups['Navigation'] = baseCommands.filter(cmd => cmd.category === 'navigation').slice(0, 5)
      groups['Quick Actions'] = baseCommands.filter(cmd => cmd.category === 'action').slice(0, 5)
      groups['Manufacturing'] = baseCommands.filter(cmd => cmd.category === 'manufacturing').slice(0, 5)
    }
    
    return groups
  }, [query, filteredCommands, baseCommands, recentCommands, favoriteCommands])

  // Get all commands in display order for keyboard navigation
  const allDisplayedCommands = useMemo(() => {
    return Object.values(groupedCommands).flat()
  }, [groupedCommands])

  // Execute command
  const executeCommand = useCallback(async (command: Command) => {
    if (command.disabled) return
    
    setIsLoading(true)
    
    try {
      await command.action()
      
      // Add to recent commands
      setRecentCommands(prev => {
        const filtered = prev.filter(id => id !== command.id)
        return [command.id, ...filtered].slice(0, 10)
      })
      
      onClose()
    } catch (error) {
      console.error('Command execution failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onClose])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
        
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < allDisplayedCommands.length - 1 ? prev + 1 : 0
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allDisplayedCommands.length - 1
        )
        break
        
      case 'Enter':
        e.preventDefault()
        if (allDisplayedCommands[selectedIndex]) {
          executeCommand(allDisplayedCommands[selectedIndex])
        }
        break
        
      case 'Tab':
        if (e.shiftKey) {
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : allDisplayedCommands.length - 1
          )
        } else {
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < allDisplayedCommands.length - 1 ? prev + 1 : 0
          )
        }
        break
    }
  }, [allDisplayedCommands, selectedIndex, executeCommand, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Load persisted data
  useEffect(() => {
    const savedRecent = localStorage.getItem('commandPalette.recent')
    const savedFavorites = localStorage.getItem('commandPalette.favorites')
    
    if (savedRecent) {
      setRecentCommands(JSON.parse(savedRecent))
    }
    
    if (savedFavorites) {
      setFavoriteCommands(JSON.parse(savedFavorites))
    }
  }, [])

  // Persist recent commands
  useEffect(() => {
    localStorage.setItem('commandPalette.recent', JSON.stringify(recentCommands))
  }, [recentCommands])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className={styles.header}>
          <Search className={styles.searchIcon} size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
            autoComplete="off"
            aria-label="Command palette search"
          />
          <div className={styles.shortcuts}>
            <kbd className={styles.shortcut}>
              <Command size={12} />
              K
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className={styles.results}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              Executing command...
            </div>
          ) : Object.keys(groupedCommands).length === 0 ? (
            <div className={styles.empty}>
              <Search size={24} className={styles.emptyIcon} />
              <p>No commands found</p>
              <p className={styles.emptySubtext}>
                Try searching for "project", "supplier", or "filter"
              </p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([groupName, commands]) => (
              <div key={groupName} className={styles.group}>
                <div className={styles.groupHeader}>
                  {groupName === 'Favorites' && <Star size={14} />}
                  {groupName === 'Recent' && <Clock size={14} />}
                  {groupName === 'Search Results' && <Search size={14} />}
                  <span>{groupName}</span>
                </div>
                
                {commands.map((command, commandIndex) => {
                  const globalIndex = allDisplayedCommands.findIndex(c => c.id === command.id)
                  const isSelected = globalIndex === selectedIndex
                  
                  return (
                    <button
                      key={command.id}
                      data-index={globalIndex}
                      className={`${styles.command} ${isSelected ? styles.selected : ''} ${command.disabled ? styles.disabled : ''}`}
                      onClick={() => executeCommand(command)}
                      disabled={command.disabled}
                    >
                      <div className={styles.commandIcon}>
                        {command.icon}
                      </div>
                      
                      <div className={styles.commandContent}>
                        <div className={styles.commandTitle}>
                          {command.title}
                        </div>
                        {command.subtitle && (
                          <div className={styles.commandSubtitle}>
                            {command.subtitle}
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.commandMeta}>
                        {command.shortcut && (
                          <kbd className={styles.commandShortcut}>
                            {command.shortcut}
                          </kbd>
                        )}
                        <ChevronRight size={14} className={styles.commandArrow} />
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerHints}>
            <span>
              <kbd className={styles.footerShortcut}>↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className={styles.footerShortcut}>↵</kbd> to select
            </span>
            <span>
              <kbd className={styles.footerShortcut}>esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}