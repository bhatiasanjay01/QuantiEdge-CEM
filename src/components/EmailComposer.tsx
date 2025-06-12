import React, { useState } from 'react';
import { ArrowLeft, Send, Clock, Users, Paperclip, Eye } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

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

  const handleSend = () => {
    if (!subject.trim() || !content.trim() || selectedCustomers.length === 0) {
      toast.error('Please fill in all required fields and select recipients');
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      toast.error('Please set a valid schedule date and time');
      return;
    }

    // Mock send logic
    const action = isScheduled ? 'scheduled' : 'sent';
    toast.success(`Email ${action} successfully to ${selectedCustomers.length} recipients`);
    onBack();
  };

  const personalizeContent = (content: string, customer: any) => {
    return content
      .replace(/{{firstName}}/g, customer.firstName)
      .replace(/{{lastName}}/g, customer.lastName)
      .replace(/{{email}}/g, customer.email);
  };

  const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Header */}
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
              Create and send personalized emails to your customers
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
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
          >
            {isScheduled ? <Clock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {isScheduled ? 'Schedule' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
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

          {/* Email Content */}
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
                  <div><code>{{firstName}}</code> - Customer's first name</div>
                  <div><code>{{lastName}}</code> - Customer's last name</div>
                  <div><code>{{email}}</code> - Customer's email address</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
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

        {/* Preview Panel */}
        {showPreview && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h3>
            
            {selectedCustomerData.length > 0 ? (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <div className="text-sm text-gray-500 mb-2">Preview for:</div>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    {selectedCustomerData.map(customer => (
                      <option key={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </option>
                    ))}
                  </select>
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