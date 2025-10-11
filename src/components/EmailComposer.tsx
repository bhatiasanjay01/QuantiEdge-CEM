import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Send, Clock, XCircle, CheckCircle, Trash2 } from 'lucide-react';

// --- Interface Definitions ---
interface EmailCampaign {
  id: string;
  name: string;
  type: 'one-off' | 'sequence';
  status: 'sent' | 'scheduled' | 'sending';
  recipients: number;
  content?: string;
  createdAt: string;
  scheduledAt?: string;
  steps?: { subject: string; body: string; delay_days: number }[];
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MessageBoxState {
  message: string;
  type: 'success' | 'error';
}

interface SequenceStep {
  subject: string;
  body: string;
  delay_days: number; // Used for relative delay in sequence steps
}

const API_BASE_URL = "http://localhost:5000/api";

// --- Initial Data ---
const initialCustomers: Customer[] = [
    { id: 'cust_1', firstName: 'Prady', lastName: 'Bhatia', email: 'bhatiaprady@gmail.com' },
    { id: 'cust_2', firstName: 'Sanjay', lastName: 'Bhatia', email: 'bhatia.sanjay01@gmail.com' },
    { id: 'cust_3', firstName: 'Ava', lastName: 'Garcia', email: 'ava.g@example.com' },
    { id: 'cust_4', firstName: 'Liam', lastName: 'Miller', email: 'liam.m@example.com' },
    { id: 'cust_5', firstName: 'Olivia', lastName: 'Davis', email: 'olivia.d@example.com' },
];

// --- Message Box Component ---
const MessageBox = ({ message, type, onClose }: MessageBoxState & { onClose: () => void }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-xl"
            style={{ backgroundColor: type === 'success' ? '#10B981' : '#EF4444', color: 'white' }}>
            <div className="flex items-center">
                {type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-all">
                    <XCircle className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// --- Email Composer ---
const EmailComposer = ({
    onBack,
    customers,
    setMessageBox,
    fetchCampaigns,
}: {
    onBack: () => void;
    customers: Customer[];
    setMessageBox: (message: string, type: 'success' | 'error') => void;
    fetchCampaigns: () => Promise<void>;
}) => {
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [isSequence, setIsSequence] = useState(false);
    const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(
        [{ subject: "", body: "", delay_days: 0 }]
    );
    const [loading, setLoading] = useState(false);

    // --- Load/Auto-save draft logic ---
    useEffect(() => {
        const saved = localStorage.getItem("draft_email");
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                setSubject(draft.subject || "");
                setContent(draft.content || "");
                setSelectedCustomers(draft.recipients || []);
                setIsScheduled(draft.isScheduled || false);
                setScheduledDateTime(draft.scheduledDateTime || "");
                setIsSequence(draft.isSequence || false);
                setSequenceSteps(
                    draft.sequenceSteps || [{ subject: "", body: "", delay_days: 0 }]
                );
            } catch (e) {
                console.error("Error parsing draft from localStorage:", e);
                localStorage.removeItem("draft_email");
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(
            "draft_email",
            JSON.stringify({
                subject,
                content,
                recipients: selectedCustomers,
                isScheduled,
                scheduledDateTime,
                isSequence,
                sequenceSteps,
            })
        );
    }, [subject, content, selectedCustomers, isScheduled, scheduledDateTime, isSequence, sequenceSteps]);

    const handleSelectAll = () => {
        if (!customers) return;
        setSelectedCustomers(prev =>
            prev.length === customers.length ? [] : customers.map(c => c.id)
        );
    };

    const handleAddStep = () => {
        setSequenceSteps([...sequenceSteps, { subject: "", body: "", delay_days: 1 }]); // Default delay of 1 day
    };

    const handleStepChange = (idx: number, field: keyof SequenceStep, value: any) => {
        const updatedSteps = [...sequenceSteps];
        if (field === 'delay_days') {
            updatedSteps[idx][field] = parseInt(value, 10) || 0;
        } else {
            // @ts-ignore - TS doesn't strictly know 'field' is a SequenceStep key
            updatedSteps[idx][field] = value;
        }
        setSequenceSteps(updatedSteps);
    };

    const handleRemoveStep = (idx: number) => {
        const updatedSteps = sequenceSteps.filter((_, i) => i !== idx);
        setSequenceSteps(updatedSteps);
    };

    // Resets form state and local storage
    const resetForm = () => {
        setSubject("");
        setContent("");
        setSelectedCustomers([]);
        setIsScheduled(false);
        setScheduledDateTime("");
        setIsSequence(false);
        setSequenceSteps([{ subject: "", body: "", delay_days: 0 }]);
        localStorage.removeItem("draft_email");
    }

    const handleSendOrSchedule = async () => {
        if (selectedCustomers.length === 0) {
            setMessageBox('Please select at least one recipient.', 'error');
            return;
        }

        const recipientEmails = selectedCustomers
            .map(id => customers.find(c => c.id === id)?.email)
            .filter(Boolean);

        if (recipientEmails.length === 0) {
            setMessageBox('Invalid recipients selected.', 'error');
            return;
        }

        setLoading(true);

        try {
            if (isSequence) {
                // --- Multi-Recipient Sequence Logic: SCHEDULES A SEPARATE SEQUENCE PER RECIPIENT ---
                const hasEmptyStep = sequenceSteps.some(step => !step.subject.trim() || !step.body.trim());
                if (hasEmptyStep) {
                    setMessageBox('All sequence steps must have a subject and message.', 'error');
                    return;
                }
                
                // Prepare steps payload
                const stepsToSend = sequenceSteps.map(step => ({
                    subject: step.subject,
                    body: step.body,
                    delay_days: step.delay_days,
                }));

                // Iterate over all selected recipients and schedule an individual sequence for each one
                const promises = recipientEmails.map(async (recipientEmail) => {
                    const payload = { 
                        to: recipientEmail, // Single recipient for a sequence
                        steps: stepsToSend,
                    };
                    
                    const res = await fetch(`${API_BASE_URL}/schedule-sequence`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                        const errorData = await res.json();
                        throw new Error(errorData.error || `Failed to schedule sequence for ${recipientEmail}.`);
                    }
                });

                await Promise.all(promises);
                setMessageBox(`Successfully scheduled ${recipientEmails.length} sequences.`, 'success');

            } else {
                // --- One-off Email Logic (Single API call for all recipients) ---
                if (!subject.trim() || !content.trim()) {
                    setMessageBox('Please add a subject and message.', 'error');
                    return;
                }

                let url: string;
                const payload: any = {
                    to: recipientEmails, // Array of recipients
                    subject,
                    body: content,
                };

                if (isScheduled) {
                    if (!scheduledDateTime) {
                        setMessageBox('Please set a valid date and time for scheduling.', 'error');
                        return;
                    }
                    const localDate = new Date(scheduledDateTime);
                    const utcDate = new Date(localDate.toUTCString());
                    payload.send_at = utcDate.toISOString();
                    url = `${API_BASE_URL}/schedule-email`;
                } else {
                    url = `${API_BASE_URL}/send-email`;
                }

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to send/schedule email.");
                }

                const responseData = await res.json();
                setMessageBox(responseData.message || (isScheduled ? 'Email scheduled!' : 'Email sent!'), 'success');
            }

            // After successful send/schedule:
            await fetchCampaigns(); // Refresh the list of campaigns
            resetForm();
            onBack(); // Go back to the main campaign list

        } catch (error: any) {
            console.error("Campaign creation failed:", error);
            // Check if it's a connection error or a server-side error
            if (error.message.includes("Failed to fetch")) {
                setMessageBox("Failed to connect to server. Please ensure server.py is running.", "error");
            } else {
                setMessageBox(error.message, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back to Campaigns
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isSequence ? 'Create Sequence' : 'Compose One-off Email'}
                </h1>
                <button
                    onClick={handleSendOrSchedule}
                    className="inline-flex items-center px-4 py-2 border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg disabled:bg-gray-400"
                    disabled={loading}
                >
                    {loading ? (
                        'Processing...'
                    ) : isScheduled || isSequence ? (
                        <><Clock className="h-4 w-4 mr-2" /> Schedule</>
                    ) : (
                        <><Send className="h-4 w-4 mr-2" /> Send Now</>
                    )}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border space-y-4 mb-8">
                <div className="flex items-center space-x-6">
                    <span className="text-gray-700 font-semibold">Campaign Type:</span>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="campaign-type"
                            checked={!isSequence}
                            onChange={() => setIsSequence(false)}
                            className="text-orange-600 h-5 w-5 border-gray-300 focus:ring-orange-500"
                        />
                        <span>One-off Broadcast</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="campaign-type"
                            checked={isSequence}
                            onChange={() => setIsSequence(true)}
                            className="text-orange-600 h-5 w-5 border-gray-300 focus:ring-orange-500"
                        />
                        <span>Email Sequence (Per Recipient)</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {isSequence ? (
                        <div className="bg-white p-6 rounded-xl shadow-md border space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900">Sequence Steps</h3>
                            {sequenceSteps.map((step, idx) => (
                                <div key={idx} className="border p-4 rounded-lg space-y-3 bg-gray-50 shadow-sm relative">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-orange-600">Step {idx + 1}</h4>
                                        {idx > 0 && (
                                            <button onClick={() => handleRemoveStep(idx)} className="text-gray-400 hover:text-red-500 transition-colors absolute top-2 right-2 p-1">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <label className="block text-sm font-medium text-gray-700 whitespace-nowrap">Delay (Days)</label>
                                        <input
                                            type="number"
                                            value={step.delay_days}
                                            min={idx === 0 ? 0 : 1} // Step 1 can be 0 delay (immediate start)
                                            onChange={(e) => handleStepChange(idx, "delay_days", e.target.value)}
                                            className="w-20 p-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        />
                                        <span className="text-sm text-gray-500">after previous step.</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={step.subject}
                                        onChange={(e) => handleStepChange(idx, "subject", e.target.value)}
                                        placeholder={`Step ${idx + 1} Subject`}
                                        className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <textarea
                                        value={step.body}
                                        onChange={(e) => handleStepChange(idx, "body", e.target.value)}
                                        placeholder={`Step ${idx + 1} Message`}
                                        className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                        rows={4}
                                    ></textarea>
                                </div>
                            ))}
                            <button onClick={handleAddStep} className="inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm text-gray-700">
                                <Plus className="h-4 w-4 mr-2" /> Add Next Step
                            </button>
                        </div>
                    ) : (
                        // One-off Email Content
                        <>
                            <div className="bg-white p-6 rounded-xl shadow-md border space-y-4">
                                <h3 className="text-xl font-semibold text-gray-900">Email Content</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Enter email subject..."
                                        className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        rows={12}
                                        placeholder="Write your email here..."
                                        className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-md border">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">Delivery Option</h3>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isScheduled}
                                            onChange={e => setIsScheduled(e.target.checked)}
                                            className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
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
                                            className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Recipients ({selectedCustomers.length} of {customers ? customers.length : 0})
                        </h3>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                            {customers && customers.map(c => (
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
                                        className="h-5 w-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div className="ml-3 text-sm">
                                        <div className="font-medium text-gray-800">{c.firstName} {c.lastName}</div>
                                        <div className="text-gray-500">{c.email}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleSelectAll} className="text-sm text-orange-600 hover:underline mt-4 font-medium">
                            {selectedCustomers.length === (customers ? customers.length : 0) ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'compose' | 'addCustomer'>('campaigns');
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [loading, setLoading] = useState(true);
    const [messageBox, setMessageBox] = useState<MessageBoxState>({ message: '', type: 'success' });
    const [messageBoxTimeout, setMessageBoxTimeout] = useState<NodeJS.Timeout | null>(null);

    const showMessage = (message: string, type: 'success' | 'error') => {
        if (messageBoxTimeout) clearTimeout(messageBoxTimeout);
        setMessageBox({ message, type });
        const timeout = setTimeout(() => {
            setMessageBox({ message: '', type: 'success' });
        }, 5000);
        setMessageBoxTimeout(timeout);
    };

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/emails`);
            if (!res.ok) {
                throw new Error("Failed to fetch campaigns from server.");
            }
            const data = await res.json();
            
            const typedData: EmailCampaign[] = data.map((item: any, index: number) => {
                const name = item.subject || (item.steps ? `Sequence to ${Array.isArray(item.to) ? item.to[0] : item.to}` : 'Untitled Campaign');

                return {
                    id: item.id || `${name}_${item.send_at}_${index}`,
                    name: name,
                    type: item.steps ? 'sequence' : 'one-off',
                    status: item.status,
                    recipients: Array.isArray(item.to) ? item.to.length : 1, 
                    content: item.body || item.steps ? `Contains ${item.steps.length} steps.` : 'No content preview.',
                    createdAt: item.send_at,
                    scheduledAt: item.status === 'scheduled' ? item.send_at : undefined,
                };
            });
            setCampaigns(typedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Fetch Campaigns Error:", error);
            if (campaigns.length === 0) {
                showMessage("Failed to connect to server. Check if server.py is running.", "error");
            }
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleAddCustomer = (firstName: string, lastName: string, email: string) => {
        const newCustomer: Customer = {
            id: `cust_${Date.now()}`,
            firstName,
            lastName,
            email,
        };
        setCustomers(prev => [...prev, newCustomer]);
        setActiveTab('campaigns');
        showMessage("New recipient added!", "success");
    };
    
    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            {activeTab === 'campaigns' ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900">Automation Hub</h1>
                            <p className="mt-1 text-sm text-gray-500">Manage your email broadcasts and drip sequences.</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setActiveTab('compose')}
                                className="inline-flex items-center px-5 py-2 border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-lg"
                            >
                                <Plus className="h-4 w-4 mr-2" /> New Campaign
                            </button>
                            <button
                                onClick={() => setActiveTab('addCustomer')}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-2 text-gray-700" /> Add Recipient
                            </button>
                        </div>
                    </div>

                    <div className="bg-white shadow-xl rounded-xl border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Campaign</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Recipients</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">Loading campaign history...</td>
                                        </tr>
                                    ) : campaigns.length > 0 ? campaigns.map(c => (
                                        <tr key={c.id} className="hover:bg-orange-50 transition-colors cursor-pointer" onClick={() => {}}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    <span className={`font-medium ${c.type === 'sequence' ? 'text-blue-500' : 'text-green-500'}`}>{c.type.toUpperCase()}</span> • {new Date(c.createdAt).toLocaleDateString()}
                                                    {c.status === 'scheduled' && c.scheduledAt ? ` • Scheduled for ${new Date(c.scheduledAt).toLocaleString()}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                                  ${c.status === 'sent' ? 'bg-green-100 text-green-800' :
                                                    c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                                      'bg-gray-100 text-gray-800'}`}>
                                                    {c.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">{c.recipients}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">
                                                No campaigns history found. Start by composing a new email!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'compose' ? (
                <EmailComposer
                    onBack={() => setActiveTab('campaigns')}
                    customers={customers}
                    setMessageBox={showMessage}
                    fetchCampaigns={fetchCampaigns}
                />
            ) : (
                // Add Recipient Form
                <div className="space-y-6 max-w-lg mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl border">
                    <h2 className="text-2xl font-bold text-gray-900">Add New Recipient</h2>
                    <div className="space-y-4">
                        <input id="firstName" placeholder="First Name" className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                        <input id="lastName" placeholder="Last Name" className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                        <input id="email" placeholder="Email Address" type="email" className="w-full p-3 border rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                        <div className="pt-2 flex space-x-3">
                            <button
                                onClick={() => {
                                    const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value.trim();
                                    const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value.trim();
                                    const email = (document.getElementById('email') as HTMLInputElement)?.value.trim();
                                    if (!firstName || !lastName || !email || !email.includes('@')) {
                                        showMessage('Please fill in all fields with a valid email.', 'error');
                                        return;
                                    }
                                    handleAddCustomer(firstName, lastName, email);
                                }}
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md"
                            >
                                Save Recipient
                            </button>
                            <button
                                onClick={() => setActiveTab('campaigns')}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <MessageBox
                message={messageBox.message}
                type={messageBox.type}
                onClose={() => setMessageBox({ message: '', type: 'success' })}
            />
        </div>
    );
};

export default App;