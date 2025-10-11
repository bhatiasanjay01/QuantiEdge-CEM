import React, { useState } from 'react';
import { ArrowLeft, Send, Clock, Users, Eye, Mail, ExternalLink } from 'lucide-react';
import { useCustomers } from '../contexts/CustomerContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface EmailComposerProps {
  onBack: () => void;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ onBack }) => {
  const { customers } = useCustomers();
  const { user } = useAuth();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));

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

    if (!user) {
      toast.error('You must be logged in to send emails');
      return;
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email-oauth`;

      let successCount = 0;
      let failCount = 0;

      for (const customerId of selectedCustomers) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) continue;

        const personalizedSubject = personalizeContent(subject, customer);
        const personalizedBody = personalizeContent(content, customer);

        try {
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: customer.email,
              subject: personalizedSubject,
              body: personalizedBody,
              provider: 'google',
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.json();
            console.error(`Failed to send to ${customer.email}:`, error);
            failCount++;
          }
        } catch (error) {
          console.error(`Error sending to ${customer.email}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} email(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} email(s). Check console for details.`);
      }

      if (successCount === selectedCustomers.length) {
        onBack();
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send emails. Make sure you have connected your Google account.');
    } finally {
      setIsSending(false);
    }
  };

  const openEmailClient = () => {
    if (!subject.trim() || !content.trim() || selectedCustomers.length === 0) {
      toast.error('Please fill in all required fields and select recipients');
      return;
    }

    const selectedEmails = selectedCustomerData.map(c => c.email).join(',');
    const mailtoLink = `mailto:${selectedEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
    window.location.href = mailtoLink;
    toast.success('Opening email client...');
  };

  const openEmailInNewWindow = () => {
    if (!subject.trim() || !content.trim() || selectedCustomers.length === 0) {
      toast.error('Please fill in all required fields and select recipients');
      return;
    }

    const recipientsList = selectedCustomerData.map(c =>
      `${c.firstName} ${c.lastName} &lt;${c.email}&gt;`
    ).join('<br>');

    const scheduleInfo = isScheduled && scheduledDate && scheduledTime
      ? `<div style="background-color: #fef3c7; color: #92400e; padding: 12px; border-radius: 6px; margin-bottom: 20px;">📅 Scheduled for: ${scheduledDate} at ${scheduledTime}</div>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Email Draft - ${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f9fafb;
            padding: 20px;
            line-height: 1.6;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #ea580c;
            color: white;
            padding: 20px;
          }
          .content { padding: 30px; }
          .field { margin-bottom: 20px; }
          .field-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }
          .field-value {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .message { white-space: pre-wrap; }
          .actions {
            padding: 20px 30px;
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
          .btn {
            padding: 10px 20px;
            margin-right: 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-primary {
            background-color: #ea580c;
            color: white;
          }
          .btn-secondary {
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Draft</h1>
          </div>
          <div class="content">
            ${scheduleInfo}
            <div class="field">
              <div class="field-label">Recipients (${selectedCustomerData.length})</div>
              <div class="field-value">${recipientsList}</div>
            </div>
            <div class="field">
              <div class="field-label">Subject</div>
              <div class="field-value">${subject}</div>
            </div>
            <div class="field">
              <div class="field-label">Message</div>
              <div class="field-value message">${content}</div>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="openMail()">Open in Email Client</button>
            <button class="btn btn-secondary" onclick="window.print()">Print</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
          </div>
        </div>
        <script>
          function openMail() {
            const emails = '${selectedCustomerData.map(c => c.email).join(',')}';
            const subject = '${subject.replace(/'/g, "\\'")}';
            const body = '${content.replace(/'/g, "\\'").replace(/\n/g, '\\n')}';
            window.location.href = 'mailto:' + emails + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          }
        </script>
      </body>
      </html>
    `;

    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      toast.success('Email draft opened in new window');
    } else {
      toast.error('Please allow popups to open email draft');
    }
  };

  const personalizeContent = (content: string, customer: any) => {
    return content
      .replace(/{{firstName}}/g, customer.firstName)
      .replace(/{{lastName}}/g, customer.lastName)
      .replace(/{{email}}/g, customer.email);
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
            onClick={openEmailInNewWindow}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Draft
          </button>
          <button
            onClick={openEmailClient}
            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Client
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {isScheduled ? <Clock className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isScheduled ? 'Schedule' : 'Send Now'}
              </>
            )}
          </button>
        </div>
      </div>

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
