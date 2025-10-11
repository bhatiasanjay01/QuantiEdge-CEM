import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, ArrowLeft, Send, Clock, XCircle, CheckCircle,
  FileText, User, List, Upload, Mail, Edit, Trash2, Users, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCustomers } from '../contexts/CustomerContext';
import AddRecipientModal from '../components/AddRecipientModal';
import EmailComposer from '../components/EmailComposer';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface EmailCampaign {
  id: string;
  name: string;
  type: 'one-off' | 'sequence';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'paused';
  subject?: string;
  content?: string;
  recipients_count: number;
  sent_count: number;
  open_rate?: number;
  click_rate?: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id?: string;
  list_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

const parseCSV = (csvText: string): Contact[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];

  const splitLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const header = splitLine(lines[0]).map(h => h.toLowerCase().trim());
  const dataLines = lines.slice(1);

  const firstNameIndex = header.findIndex(h => h.includes('first name') || h.includes('firstname') || h === 'first');
  const lastNameIndex = header.findIndex(h => h.includes('last name') || h.includes('lastname') || h === 'last');
  const emailIndex = header.findIndex(h => h === 'email' || h.includes('email'));
  const phoneIndex = header.findIndex(h => h.includes('phone'));
  const companyIndex = header.findIndex(h => h.includes('company'));
  const jobTitleIndex = header.findIndex(h => h.includes('title') || h.includes('job'));

  if (firstNameIndex === -1 || lastNameIndex === -1 || emailIndex === -1) {
    return [];
  }

  const contacts: Contact[] = [];
  dataLines.forEach((line) => {
    if (!line.trim()) return;
    const values = splitLine(line);

    const email = values[emailIndex]?.trim() || '';
    const firstName = values[firstNameIndex]?.trim() || '';
    const lastName = values[lastNameIndex]?.trim() || '';

    if (email && email.includes('@') && (firstName || lastName)) {
      contacts.push({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phoneIndex !== -1 ? values[phoneIndex]?.trim() : undefined,
        company: companyIndex !== -1 ? values[companyIndex]?.trim() : undefined,
        job_title: jobTitleIndex !== -1 ? values[jobTitleIndex]?.trim() : undefined,
      });
    }
  });

  return contacts;
};

const EmailCampaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'compose' | 'lists'>('campaigns');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Campaign deleted successfully');
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4" />;
      case 'sending': return <Send className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'paused': return <User className="h-4 w-4" />;
      case 'draft': return <Edit className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const renderCampaignsList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your email campaigns and contact lists
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddRecipientModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Recipient
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <List className="h-4 w-4 mr-2" />
            Contact Lists
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Campaigns</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{campaigns.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Recipients</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaigns.reduce((sum, c) => sum + c.recipients_count, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sent</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaigns.filter(c => c.status === 'sent').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {campaigns.filter(c => c.status === 'scheduled').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No campaigns found. Create your first campaign to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {campaign.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1 capitalize">{campaign.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.recipients_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {activeTab === 'campaigns' && renderCampaignsList()}
      {activeTab === 'compose' && (
        <EmailComposer
          onBack={() => setActiveTab('campaigns')}
        />
      )}
      {activeTab === 'lists' && (
        <ContactListManager
          onBack={() => setActiveTab('campaigns')}
        />
      )}
      <AddRecipientModal
        isOpen={showAddRecipientModal}
        onClose={() => setShowAddRecipientModal(false)}
        onRecipientAdded={() => {
          loadCampaigns();
        }}
      />
    </div>
  );
};

const ContactListManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
      toast.error('Failed to load contact lists');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const contacts = parseCSV(csvText);

      if (contacts.length === 0) {
        toast.error('No valid contacts found. Ensure CSV has firstName, lastName, and email columns.');
      }
      setPreviewContacts(contacts);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!newListName.trim() || previewContacts.length === 0) {
      toast.error('Please enter a list name and upload valid contacts');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: listData, error: listError } = await supabase
        .from('contact_lists')
        .insert({
          user_id: user.id,
          name: newListName,
          description: newListDescription || null,
          contact_count: previewContacts.length,
        })
        .select()
        .single();

      if (listError) throw listError;

      const contactsWithListId = previewContacts.map(contact => ({
        ...contact,
        user_id: user.id,
        list_id: listData.id,
      }));

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contactsWithListId);

      if (contactsError) throw contactsError;

      toast.success(`Successfully imported ${previewContacts.length} contacts`);
      setShowUploadModal(false);
      setNewListName('');
      setNewListDescription('');
      setFile(null);
      setPreviewContacts([]);
      loadLists();
    } catch (error) {
      console.error('Error uploading contacts:', error);
      toast.error('Failed to import contacts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <List className="h-6 w-6 mr-2 text-orange-600" /> Contact Lists
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your contact lists and import new contacts
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" /> New List / Import CSV
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  List Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lists.length > 0 ? (
                lists.map(list => (
                  <tr key={list.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {list.name}
                      {list.description && (
                        <div className="text-xs text-gray-500">{list.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{list.contact_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(list.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">
                    No contact lists found. Import a CSV to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Upload className="w-5 h-5 mr-2" /> Import Contacts from CSV
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter a name for your new list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Brief description of this list"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="relative border-2 border-dashed border-gray-300 p-6 rounded-lg text-center cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? `File: ${file.name}` : 'Click to select a CSV file'}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                <strong>Required columns:</strong> firstName (or first_name), lastName (or last_name), email
              </p>

              {previewContacts.length > 0 && (
                <div className="p-4 border rounded-md bg-yellow-50 text-sm">
                  <p className="font-semibold text-yellow-800">Preview:</p>
                  <p>{previewContacts.length} valid contacts found.</p>
                  <p className="mt-1">
                    <strong>Example:</strong> {previewContacts[0].first_name}{' '}
                    {previewContacts[0].last_name} ({previewContacts[0].email})
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !newListName.trim() || previewContacts.length === 0}
                className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
              >
                {loading ? 'Importing...' : `Import ${previewContacts.length} Contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;
