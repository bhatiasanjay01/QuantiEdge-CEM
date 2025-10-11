import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Clock, Users, Eye, Mail, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sendEmail, getConnectedEmailAccount, type EmailAccount } from '../lib/emailApi';

interface EmailComposerProps {
  onBack: () => void;
}

interface ContactList {
  id: string;
  name: string;
  description?: string;
  contact_count: number;
}

interface Contact {
  id: string;
  list_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ onBack }) => {
  const { customers } = useCustomers();
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  const selectedContactData = contacts.filter(c => selectedContacts.includes(c.id));

  useEffect(() => {
    loadEmailAccount();
    loadContactsAndLists();
  }, []);

  const loadEmailAccount = async () => {
    try {
      const account = await getConnectedEmailAccount();
      setEmailAccount(account);
    } catch (error) {
      console.error('Failed to load email account:', error);
    } finally {
      setIsLoadingAccount(false);
    }
  };

  const loadContactsAndLists = async () => {
    try {
      setIsLoadingContacts(true);

      const { data: listsData, error: listsError } = await supabase
        .from('contact_lists')
        .select('*')
        .order('name');

      if (listsError) throw listsError;

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('first_name');

      if (contactsError) throw contactsError;

      setContactLists(listsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const toggleList = (listId: string) => {
    setExpandedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAllInList = (listId: string | null) => {
    const listContacts = contacts.filter(c => c.list_id === listId);
    const listContactIds = listContacts.map(c => c.id);
    const allSelected = listContactIds.every(id => selectedContacts.includes(id));

    if (allSelected) {
      setSelectedContacts(prev => prev.filter(id => !listContactIds.includes(id)));
    } else {
      setSelectedContacts(prev => [...new Set([...prev, ...listContactIds])]);
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim() || selectedContacts.length === 0) {
      toast.error('Please fill in all required fields and select recipients');
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      toast.error('Please set a valid schedule date and time');
      return;
    }

    if (!emailAccount) {
      toast.error('Please connect your Gmail account in Settings first');
      return;
    }

    setIsSending(true);

    try {
      const recipients = selectedContactData.map(c => ({
        email: c.email,
        name: `${c.first_name} ${c.last_name}`,
      }));

      const scheduledAt = isScheduled && scheduledDate && scheduledTime
        ? `${scheduledDate}T${scheduledTime}:00`
        : undefined;

      const result = await sendEmail({
        campaignName: subject,
        subject,
        content,
        recipients,
        scheduledAt,
      });

      if (result.success) {
        if (scheduledAt) {
          toast.success(`Email scheduled for ${scheduledDate} at ${scheduledTime}`);
        } else {
          toast.success(`Successfully sent ${result.successCount || 0} emails!`);
          if (result.failedCount && result.failedCount > 0) {
            toast.error(`${result.failedCount} emails failed to send`);
          }
        }
        onBack();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const personalizeContent = (content: string, contact: Contact) => {
    return content
      .replace(/{{firstName}}/g, contact.first_name)
      .replace(/{{lastName}}/g, contact.last_name)
      .replace(/{{email}}/g, contact.email);
  };

  if (isLoadingAccount) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Compose Email</h1>
            <p className="mt-1 text-sm text-gray-500">
              {emailAccount
                ? `Sending from ${emailAccount.email}`
                : 'Connect your Gmail account to send emails'}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !emailAccount}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSending ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Sending...
              </>
            ) : (
              <>
                {isScheduled ? <Clock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isScheduled ? 'Schedule' : 'Send via Gmail'}
              </>
            )}
          </button>
        </div>
      </div>

      {!emailAccount && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Gmail Account Required</h3>
              <p className="mt-1 text-sm text-orange-700">
                You need to connect your Gmail account before you can send emails. Go to Settings to connect your account.
              </p>
              <button
                onClick={() => window.location.href = '/settings'}
                className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Go to Settings →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recipients</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {selectedContacts.length} of {contacts.length} selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                Loading contacts...
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                {contactLists.map(list => {
                  const listContacts = contacts.filter(c => c.list_id === list.id);
                  const isExpanded = expandedLists.has(list.id);
                  const listContactIds = listContacts.map(c => c.id);
                  const allSelected = listContactIds.length > 0 && listContactIds.every(id => selectedContacts.includes(id));

                  return (
                    <div key={list.id} className="border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                        <button
                          onClick={() => toggleList(list.id)}
                          className="flex items-center flex-1 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 mr-2" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{list.name}</div>
                            {list.description && (
                              <div className="text-xs text-gray-500">{list.description}</div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 ml-2">
                            {listContacts.length} contact{listContacts.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                        {listContacts.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAllInList(list.id);
                            }}
                            className="ml-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {isExpanded && listContacts.length > 0 && (
                        <div className="bg-white">
                          {listContacts.map(contact => (
                            <label
                              key={contact.id}
                              className="flex items-center p-3 pl-10 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.id)}
                                onChange={() => handleContactToggle(contact.id)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{contact.email}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized contacts (no list assigned) */}
                {(() => {
                  const uncategorized = contacts.filter(c => !c.list_id);
                  if (uncategorized.length === 0) return null;

                  const isExpanded = expandedLists.has('uncategorized');
                  const uncategorizedIds = uncategorized.map(c => c.id);
                  const allSelected = uncategorizedIds.every(id => selectedContacts.includes(id));

                  return (
                    <div className="border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                        <button
                          onClick={() => toggleList('uncategorized')}
                          className="flex items-center flex-1 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 mr-2" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-700">Uncategorized</div>
                            <div className="text-xs text-gray-500">Contacts without a list</div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">
                            {uncategorized.length} contact{uncategorized.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAllInList(null);
                          }}
                          className="ml-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="bg-white">
                          {uncategorized.map(contact => (
                            <label
                              key={contact.id}
                              className="flex items-center p-3 pl-10 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.id)}
                                onChange={() => handleContactToggle(contact.id)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {contact.first_name} {contact.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{contact.email}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Content</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  placeholder="Write your email content here... Use {{firstName}}, {{lastName}}, {{email}} for personalization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Personalization Tokens</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><code className="bg-blue-100 px-1 rounded">{'{{firstName}}'}</code> - Customer's first name</div>
                  <div><code className="bg-blue-100 px-1 rounded">{'{{lastName}}'}</code> - Customer's last name</div>
                  <div><code className="bg-blue-100 px-1 rounded">{'{{email}}'}</code> - Customer's email address</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delivery Options</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {showPreview && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h3>

            {selectedContactData.length > 0 ? (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <div className="text-sm text-gray-500 mb-2">Preview for:</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedContactData[0].first_name} {selectedContactData[0].last_name}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">From:</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {emailAccount?.email || 'Connect Gmail account'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Subject:</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {personalizeContent(subject, selectedContactData[0]) || 'No subject'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Message:</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {personalizeContent(content, selectedContactData[0]) || 'No content'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select recipients to see preview</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailComposer;
