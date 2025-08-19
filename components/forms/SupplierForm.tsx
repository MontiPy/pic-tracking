'use client'

import { useState } from 'react'
import { Save, X, Plus, Trash2, Building, MapPin, User, Phone, Mail } from 'lucide-react'

interface Contact {
  name: string
  role: string
  email: string
  phone: string
}

interface Supplier {
  id: string
  name: string
  contactInfo: string
  supplierNumber?: string
  location?: string
  contacts?: string
  parsedContacts?: Contact[]
}

interface SupplierFormProps {
  supplier?: Supplier
  onSave: (data: { 
    name: string; 
    contactInfo: string;
    supplierNumber?: string;
    location?: string;
    contacts?: Contact[];
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function SupplierForm({ supplier, onSave, onCancel, isLoading }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || '')
  const [contactInfo, setContactInfo] = useState(supplier?.contactInfo || '')
  const [supplierNumber, setSupplierNumber] = useState(supplier?.supplierNumber || '')
  const [location, setLocation] = useState(supplier?.location || '')
  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (supplier?.parsedContacts) {
      return supplier.parsedContacts
    }
    if (supplier?.contacts) {
      try {
        return JSON.parse(supplier.contacts)
      } catch {
        return []
      }
    }
    return []
  })

  const addContact = () => {
    setContacts(prev => [...prev, { name: '', role: '', email: '', phone: '' }])
  }

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index))
  }

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    setContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSave({ 
        name: name.trim(), 
        contactInfo: contactInfo.trim() || 'No contact info provided',
        supplierNumber: supplierNumber.trim() || undefined,
        location: location.trim() || undefined,
        contacts: contacts.filter(c => c.name.trim() || c.email.trim())
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name *
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
            <label htmlFor="supplierNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Number
            </label>
            <input
              type="text"
              id="supplierNumber"
              value={supplierNumber}
              onChange={(e) => setSupplierNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SUP-001"
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="h-4 w-4 inline mr-1" />
            Location
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City, State, Country"
          />
        </div>

        <div>
          <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
            Legacy Contact Information
          </label>
          <input
            type="text"
            id="contactInfo"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@company.com | +1-555-0000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Legacy format: email | phone number (use structured contacts below)
          </p>
        </div>
      </div>

      {/* Structured Contacts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Contacts
          </h3>
          <button
            type="button"
            onClick={addContact}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
            No contacts added yet. Click "Add Contact" to add structured contact information.
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Contact {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(e) => updateContact(index, 'role', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Quality Manager"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="john.doe@supplier.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <Phone className="h-3 w-3 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
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
          disabled={isLoading || !name.trim()}
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
        </button>
      </div>
    </form>
  )
}