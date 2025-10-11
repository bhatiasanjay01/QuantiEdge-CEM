import React, { useState } from 'react';
import { XCircle, User, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipientAdded: () => void;
}

const AddRecipientModal: React.FC<AddRecipientModalProps> = ({ isOpen, onClose, onRecipientAdded }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      let listId: string | null = null;

      const { data: lists, error: listsError } = await supabase
        .from('contact_lists')
        .select('id')
        .eq('name', 'Direct Additions')
        .maybeSingle();

      if (listsError && listsError.code !== 'PGRST116') {
        throw listsError;
      }

      if (lists) {
        listId = lists.id;
      } else {
        const { data: newList, error: createListError } = await supabase
          .from('contact_lists')
          .insert({
            name: 'Direct Additions',
            description: 'Contacts added directly through the app',
            contact_count: 0,
          })
          .select()
          .single();

        if (createListError) throw createListError;
        listId = newList.id;
      }

      const { error: contactError } = await supabase.from('contacts').insert({
        list_id: listId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
      });

      if (contactError) {
        if (contactError.code === '23505') {
          toast.error('A contact with this email already exists');
          return;
        }
        throw contactError;
      }

      const { error: updateCountError } = await supabase.rpc('increment', {
        table_name: 'contact_lists',
        row_id: listId,
        column_name: 'contact_count'
      });

      toast.success('Recipient added successfully!');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setJobTitle('');
      onRecipientAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      toast.error(error.message || 'Failed to add recipient');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <User className="w-5 h-5 mr-2" /> Add New Recipient
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Marketing Manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : <><Plus className="h-4 w-4 mr-2" /> Add Recipient</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipientModal;
