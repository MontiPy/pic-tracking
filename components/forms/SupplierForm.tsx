'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contactInfo: string
}

interface SupplierFormProps {
  supplier?: Supplier
  onSave: (data: { name: string; contactInfo: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function SupplierForm({ supplier, onSave, onCancel, isLoading }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || '')
  const [contactInfo, setContactInfo] = useState(supplier?.contactInfo || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && contactInfo.trim()) {
      onSave({ name: name.trim(), contactInfo: contactInfo.trim() })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Supplier Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter supplier name"
          required
        />
      </div>

      <div>
        <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
          Contact Information
        </label>
        <input
          type="text"
          id="contactInfo"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="email@company.com | +1-555-0000"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: email | phone number
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isLoading || !name.trim() || !contactInfo.trim()}
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : supplier ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}