import React, { useState, useEffect } from 'react';
import {
  Plus, ArrowLeft, Send, Clock, XCircle, CheckCircle,
  FileText, User, List, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCampaigns } from '../lib/api';

interface EmailCampaign {
  id: string;
  name: string;
  type: 'one-off' | 'sequence';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
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

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
}

interface SequenceStep {
  subject: string;
  body: string;
  scheduledAt?: string;
}

const parseCSV = (csvText: string): Array<{firstName: string, lastName: string, email: string, phone?: string, company?: string}> => {
  const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
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

  const mapHeaderToField = (h: string) => {
    if (h.includes('first name') || h === 'first') return 'firstName';
    if (h.includes('last name') || h === 'last') return 'lastName';
    if (h.includes('primary en email')) return 'email';
    if (h.includes('email') && !h.includes('stat') && !h.includes('source') && !h.includes('confidence')) return 'email';
    if (h.includes('mobile phone') || h.includes('work direct phone') || h.includes('phone number') || h.includes('phone')) return 'phone';
    if (h.includes('company name') || h.includes('company')) return 'company';
    return '';
  };

  const columnMap: { [key: string]: number } = {};
  header.forEach((h, i) => {
    const field = mapHeaderToField(h);
    if (field && !(field in columnMap)) {
      columnMap[field] = i;
    }
  });

  const contacts: any[] = [];

  dataLines.forEach((line) => {
    if (!line.trim()) return;

    const values = splitLine(line);
    const hasData = values.some(v => v.length > 0);
    if (!hasData) return;

    const contact: any = {};
    let hasValidEmail = false;

    Object.entries(columnMap).forEach(([field, index]) => {
      const value = values[index] ? values[index].trim() : '';
      if (value) {
        contact[field] = value;
        if (field === 'email' && value.includes('@') && value.includes('.')) {
          hasValidEmail = true;
        }
      }
    });

    if (hasValidEmail) {
      contacts.push({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone,
        company: contact.company,
      });
    }
  });

  return contacts;
};

const EmailComposer = ({
  onBack,
  customers,
  onSendEmail,
}: {
  onBack: () => void;
  customers: Customer[];
  onSendEmail: (payload: any) => Promise<boolean>;
}) => {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isSequence, setIsSequence] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    { subject: '', body: '', scheduledAt: '' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSelectAll = () => {
    setSelectedCustomers(prev =>
      prev.length === customers.length ? [] : customers.map(c => c.id)
    );
  };

  const handleAddStep = () => {
    setSequenceSteps([...sequenceSteps, { subject: '', body: '', scheduledAt: '' }]);
  };

  const handleStepChange = (idx: number, field: keyof SequenceStep, value: any) => {
    const updatedSteps = [...sequenceSteps];
    updatedSteps[idx][field] = value;
    setSequenceSteps(updatedSteps);
  };

  const handleRemoveStep = (idx: number) => {
    const updatedSteps = sequenceSteps.filter((_, i) => i !== idx);
    setSequenceSteps(updatedSteps);
  };

  const handleSendOrSchedule = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one recipient.');
      return;
    }

    const recipientEmails = selectedCustomers.map(id => {
      const customer = customers.find(c => c.id === id);
      return customer ? customer.email : null;
    }).filter((email): email is string => email !== null);

    if (recipientEmails.length === 0) {
      toast.error('Invalid recipients selected.');
      return;
    }

    setLoading(true);

    try {
      if (isSequence) {
        const hasEmptyStep = sequenceSteps.some(step => !step.subject.trim() || !step.body.trim() || !step.scheduledAt);
        if (hasEmptyStep) {
          toast.error('All sequence steps must have a subject, message, and schedule time.');
          return;
        }

        toast.info('Sequence scheduling coming soon!');
        setLoading(false);
        return;
      }

      if (!subject.trim() || !content.trim()) {
        toast.error('Please add a subject and message.');
        return;
      }

      const payload = {
        to: recipientEmails,
        subject,
        body: content,
        ...(isScheduled && scheduledDateTime ? { send_at: scheduledDateTime } : {})
      };

      const success = await onSendEmail(payload);

      if (success) {
        toast.success(isScheduled ? 'Campaign scheduled successfully!' : 'Campaign sent successfully!');
        onBack();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isSequence ? 'Create Sequence' : 'Compose Email'}
        </h1>
        <button
          onClick={handleSendOrSchedule}
          className="inline-flex items-center px-4 py-2 border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? (
            'Sending...'
          ) : isScheduled || isSequence ? (
            <><Clock className="h-4 w-4 mr-2" /> Schedule</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Send Now</>
          )}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 mb-8">
        <div className="flex items-center space-x-4">
          <span className="text-gray-700 font-medium">Campaign Type:</span>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="campaign-type"
              checked={!isSequence}
              onChange={() => setIsSequence(false)}
              className="text-orange-600"
            />
            <span>One-off Email</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="campaign-type"
              checked={isSequence}
              onChange={() => setIsSequence(true)}
              className="text-orange-600"
            />
            <span>Email Sequence</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isSequence ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Sequence Steps</h3>
              {sequenceSteps.map((step, idx) => (
                <div key={idx} className="border p-4 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold">Step {idx + 1}</h4>
                    {idx > 0 && (
                      <button onClick={() => handleRemoveStep(idx)} className="text-gray-500 hover:text-gray-700">
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={step.subject}
                    onChange={(e) => handleStepChange(idx, "subject", e.target.value)}
                    placeholder="Subject"
                    className="w-full p-2 border rounded-md"
                  />
                  <textarea
                    value={step.body}
                    onChange={(e) => handleStepChange(idx, "body", e.target.value)}
                    placeholder="Message"
                    className="w-full p-2 border rounded-md"
                    rows={4}
                  ></textarea>
                  <div className="flex items-center space-x-2">
                    <span>Schedule for:</span>
                    <input
                      type="datetime-local"
                      value={step.scheduledAt}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => handleStepChange(idx, "scheduledAt", e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
              ))}
              <button onClick={handleAddStep} className="inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200">
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Email Content</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={12}
                    placeholder="Write your email here..."
                    className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  ></textarea>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Delivery Options</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={e => setIsScheduled(e.target.checked)}
                      className="h-4 w-4 text-orange-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
                  </label>
                </div>
                {isScheduled && (
                  <div className="mt-4">
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setScheduledDateTime(e.target.value)}
                      className="w-full p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recipients ({selectedCustomers.length} of {customers.length})
            </h3>
            <div className="max-h-96 overflow-y-auto border rounded-md">
              {customers.map(c => (
                <label
                  key={c.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(c.id)}
                    onChange={() =>
                      setSelectedCustomers(p =>
                        p.includes(c.id) ? p.filter(id => id !== c.id) : [...p, c.id]
                      )
                    }
                    className="h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div className="ml-3 text-sm">
                    <div className="font-medium text-gray-800">{c.name}</div>
                    <div className="text-gray-500">{c.email}</div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleSelectAll} className="text-sm text-orange-600 hover:underline mt-2">
              {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailCampaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'compose' | 'import'>('campaigns');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewContacts, setPreviewContacts] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignsData, customersData] = await Promise.all([
        getCampaigns(),
        fetch('http://localhost:5000/api/customers', { credentials: 'include' }).then(r => r.json())
      ]);
      setCampaigns(campaignsData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const contacts = parseCSV(csvText);

      if (contacts.length === 0) {
        toast.error("No valid contacts found in the CSV. Make sure you have an 'Email' column with valid emails.");
      }
      setPreviewContacts(contacts);
    };
    reader.readAsText(selectedFile);
  };

  const handleCSVUpload = async () => {
    if (previewContacts.length === 0) {
      toast.error('Please upload a file with valid contacts.');
      return;
    }

    setUploadLoading(true);
    try {
      const promises = previewContacts.map(contact =>
        fetch('http://localhost:5000/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone,
            company: contact.company,
          }),
        })
      );

      await Promise.all(promises);

      toast.success(`Successfully imported ${previewContacts.length} contacts!`);
      setIsUploadModalOpen(false);
      setFile(null);
      setPreviewContacts([]);
      loadData();
    } catch (error) {
      console.error("Error uploading contacts:", error);
      toast.error("Failed to upload contacts. Check console for details.");
    } finally {
      setUploadLoading(false);
    }
  };

  const onSendEmail = async (payload: any): Promise<boolean> => {
    try {
      const url = payload.send_at
        ? 'http://localhost:5000/api/schedule-email'
        : 'http://localhost:5000/api/send-email';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        toast.error('Gmail account not connected. Please connect in Settings.');
        return false;
      }

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to send email');
        return false;
      }

      loadData();
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to server. Make sure Python server is running.");
      return false;
    }
  };

  if (activeTab === 'compose') {
    return (
      <EmailComposer
        onBack={() => setActiveTab('campaigns')}
        customers={customers}
        onSendEmail={onSendEmail}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${
              activeTab === 'campaigns' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" /> Campaigns
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('compose')}
            className="inline-flex items-center px-4 py-2 border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Compose Email
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your email campaigns</p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase">Recipients</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">Loading campaigns...</td>
                  </tr>
                ) : campaigns.length > 0 ? campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-500">
                        {c.type} • Created {new Date(c.created_at).toLocaleDateString()}
                        {c.status === 'scheduled' && c.scheduled_at ? ` • Scheduled for ${new Date(c.scheduled_at).toLocaleString()}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${c.status === 'sent' ? 'bg-green-100 text-green-800' :
                          c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.recipients_count}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">
                      No campaigns yet. Click "Compose Email" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Upload className="w-5 h-5 mr-2" /> Import People (CSV)
              </h2>
              <button onClick={() => {
                setIsUploadModalOpen(false);
                setFile(null);
                setPreviewContacts([]);
              }} className="text-gray-500 hover:text-gray-900">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center cursor-pointer hover:border-orange-500 transition-colors relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? `File selected: ${file.name}` : "Click here to select CSV file"}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Import fields: First Name, Last Name, Company, Email, Phone
              </p>

              {previewContacts.length > 0 && (
                <div className="p-4 border rounded-md bg-yellow-50 text-sm">
                  <p className="font-semibold text-yellow-800">Preview:</p>
                  <p>{previewContacts.length} valid contacts found with email addresses.</p>
                  <p className="mt-1">
                    Example: {previewContacts[0].firstName} {previewContacts[0].lastName} ({previewContacts[0].email})
                  </p>
                </div>
              )}

              <button
                onClick={handleCSVUpload}
                disabled={uploadLoading || previewContacts.length === 0}
                className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
              >
                {uploadLoading ? 'Importing...' : `Import ${previewContacts.length} Contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;
