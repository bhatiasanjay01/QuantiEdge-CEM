import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCustomers, Customer } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose }) => {
  const { addCustomer, updateCustomer } = useCustomers();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    customerType: 'Lead' as Customer['customerType'],
    cookingClassType: 'Group' as Customer['cookingClassType'],
    customerStage: 'Prospect' as Customer['customerStage'],
    tags: [] as string[],
    notes: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        customerType: customer.customerType,
        cookingClassType: customer.cookingClassType,
        customerStage: customer.customerStage,
        tags: customer.tags,
        notes: customer.notes || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customerData = {
      ...formData,
      dateAdded: customer?.dateAdded || new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0]
    };

    try {
      if (customer) {
        await updateCustomer(customer.id, customerData);
      } else {
        await addCustomer(customerData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData({ ...formData, tags });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type
              </label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as Customer['customerType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="VIP">VIP</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Stage
              </label>
              <select
                value={formData.customerStage}
                onChange={(e) => setFormData({ ...formData, customerStage: e.target.value as Customer['customerStage'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="Prospect">Prospect</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Completed">Completed</option>
                <option value="Repeat">Repeat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cooking Class Type
            </label>
            <select
              value={formData.cookingClassType}
              onChange={(e) => setFormData({ ...formData, cookingClassType: e.target.value as Customer['cookingClassType'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="Team Building">Team Building</option>
              <option value="Date Night">Date Night</option>
              <option value="Teen Cooking">Teen Cooking</option>
              <option value="Private">Private</option>
              <option value="Group">Group</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={handleTagsChange}
              placeholder="Premium, Frequent, Corporate"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
            >
              {customer ? 'Update' : 'Add'} Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;