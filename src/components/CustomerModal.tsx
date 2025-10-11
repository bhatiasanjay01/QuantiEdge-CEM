import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCustomers, Customer } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

// Define the initial state outside the component to prevent re-creation on every render
const INITIAL_STATE = {
  firstName: '',
  lastName: '',
  email: '',
  customerType: 'Lead' as Customer['customerType'],
  cookingClassType: 'Group' as Customer['cookingClassType'],
  customerStage: 'Prospect' as Customer['customerStage'],
  tags: [] as string[],
  notes: '',
};

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose }) => {
  const { addCustomer, updateCustomer } = useCustomers();
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);

  // useEffect populates the form when editing an existing customer
  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        customerType: customer.customerType,
        cookingClassType: customer.cookingClassType,
        customerStage: customer.customerStage,
        tags: customer.tags || [],
        notes: customer.notes || '',
      });
    } else {
      // Reset to initial state when adding a new customer
      setFormData(INITIAL_STATE);
    }
  }, [customer]);

  // A single handler for most form inputs to keep the code clean
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Specific handler for the comma-separated tags input
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  // Handles form submission asynchronously
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Prepare the final customer data object
    const customerData = {
      ...formData,
      dateAdded: customer?.dateAdded || new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0],
    };

    try {
      if (customer) {
        await updateCustomer(customer.id, customerData);
        toast.success('Customer updated successfully!');
      } else {
        await addCustomer(customerData);
        toast.success('Customer added successfully!');
      }
      onClose(); // Close modal only on success
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast.error('Failed to save customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                {customer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input
                            type="text"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                            type="text"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                        <select name="customerType" value={formData.customerType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500">
                            <option value="Lead">Lead</option>
                            <option value="Active">Active</option>
                            <option value="VIP">VIP</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Stage</label>
                        <select name="customerStage" value={formData.customerStage} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500">
                            <option value="Prospect">Prospect</option>
                            <option value="Enrolled">Enrolled</option>
                            <option value="Completed">Completed</option>
                            <option value="Repeat">Repeat</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cooking Class Type</label>
                    <select name="cookingClassType" value={formData.cookingClassType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500">
                        <option value="Team Building">Team Building</option>
                        <option value="Date Night">Date Night</option>
                        <option value="Teen Cooking">Teen Cooking</option>
                        <option value="Private">Private</option>
                        <option value="Group">Group</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                        type="text"
                        name="tags"
                        value={formData.tags.join(', ')}
                        onChange={handleTagsChange}
                        placeholder="Premium, Frequent, Corporate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 flex items-center transition-colors">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading ? 'Saving...' : (customer ? 'Update Customer' : 'Add Customer')}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;