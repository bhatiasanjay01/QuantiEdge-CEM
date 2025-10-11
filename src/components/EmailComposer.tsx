import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Clock, Users, Eye, Mail, AlertCircle } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';
import { sendEmail, getConnectedEmailAccount, type EmailAccount } from '../lib/emailApi';

interface EmailComposerProps {
  onBack: () => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ onBack }) => {
  const { customers } = useCustomers();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));

  useEffect(() => {
    loadEmailAccount();
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

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim() || selectedCustomers.length === 0) {
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
      const recipients = selectedCustomerData.map(c => ({
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
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

  const personalizeContent = (content: string, customer: any) => {
    return content
      .replace(/{{firstName}}/g, customer.firstName)
      .replace(/{{lastName}}/g, customer.lastName)
      .replace(/{{email}}/g, customer.email);
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
                  {selectedCustomers.length} of {customers.length} selected
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {customers.map(customer => (
                <label
                  key={customer.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => handleCustomerToggle(customer.id)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </div>
                </label>
              ))}
            </div>
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

            {selectedCustomerData.length > 0 ? (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <div className="text-sm text-gray-500 mb-2">Preview for:</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedCustomerData[0].firstName} {selectedCustomerData[0].lastName}
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
                    {personalizeContent(subject, selectedCustomerData[0]) || 'No subject'}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Message:</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {personalizeContent(content, selectedCustomerData[0]) || 'No content'}
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
