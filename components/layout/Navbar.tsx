'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Users, CheckSquare, BarChart3, Search, Menu, X, ChevronDown } from 'lucide-react'

const primaryNavigation = [
  { name: 'Dashboard', href: '/', icon: Building2 },
  { name: 'Suppliers', href: '/suppliers', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Projects', href: '/projects', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
]

const secondaryNavigation = [
  { name: 'Schedule', href: '/schedule' },
  { name: 'Settings', href: '/settings' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const searchRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

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
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between h-12">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg text-gray-900">
                Supplier Portal
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {primaryNavigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* More Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>More</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {showMoreMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border z-50">
                  <div className="py-1">
                    {secondaryNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowMoreMenu(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchTerm && filteredSuppliers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border z-50 max-h-60 overflow-y-auto">
                  <div className="py-1">
                    {filteredSuppliers.map((supplier: any) => (
                      <button
                        key={supplier.id}
                        onClick={() => handleSupplierSelect(supplier.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-xs text-gray-500">{supplier.contactInfo.split(' | ')[0]}</div>
                        </div>
                        <Users className="h-3 w-3 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {searchTerm && filteredSuppliers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border z-50">
                  <div className="py-2 px-3 text-sm text-gray-500">
                    No suppliers found
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-1"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <div className="space-y-1">
              {primaryNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              <div className="border-t border-gray-200 pt-2 mt-2">
                {secondaryNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-sm text-gray-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Search */}
            <div className="mt-3 px-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              
              {searchTerm && filteredSuppliers.length > 0 && (
                <div className="mt-2 space-y-1">
                  {filteredSuppliers.map((supplier: any) => (
                    <button
                      key={supplier.id}
                      onClick={() => {
                        handleSupplierSelect(supplier.id)
                        setMobileMenuOpen(false)
                      }}
                      className="w-full text-left px-2 py-2 text-sm text-gray-700 bg-gray-50 rounded"
                    >
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-gray-500">{supplier.contactInfo.split(' | ')[0]}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
