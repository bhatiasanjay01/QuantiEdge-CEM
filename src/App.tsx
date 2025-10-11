import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowLeft, Send, Clock, XCircle, CheckCircle, FileText, User, List, Upload } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';

// --- Global Variables (MANDATORY for Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

interface EmailCampaign {
  id: string;
  name: string;
  type: 'one-off' | 'sequence';
  status: 'sent' | 'scheduled' | 'sending';
  recipients: number;
  content?: string;
  createdAt: string;
  scheduledAt?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
}

interface ContactList {
    id: string;
    name: string;
    contactCount: number;
    createdAt: string;
    // contacts will be fetched separately from the 'contacts' subcollection
}

interface MessageBoxState {
  message: string;
  type: 'success' | 'error';
}

interface SequenceStep {
  subject: string;
  body: string;
  scheduledAt?: string;
}

const API_BASE_URL = "http://localhost:5000/api";


// --- Utility Functions ---

/**
 * Parses CSV text, mapping flexible column names to standard Customer fields.
 * This is designed to handle detailed headers like those found in Apollo exports.
 */
const parseCSV = (csvText: string): Customer[] => {
    // A more robust way to handle CSV splitting, especially if content contains commas
    // For simplicity with basic CSVs, we use split('\n') and then split(',')
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return []; // Needs at least a header and one data row
    
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const dataLines = lines.slice(1);

    // Determines the required mapping from a flexible header keyword to our Customer field
    const mapHeaderToField = (h: string) => {
        if (h.includes('first name') || h === 'first') return 'firstName';
        if (h.includes('last name') || h === 'last') return 'lastName';
        
        // Highly resilient email mapping: looks for 'email' but avoids 'status', 'source', etc.
        if (h.includes('email') && !h.includes('stat') && !h.includes('source') && !h.includes('confidence')) return 'email';
        
        if (h.includes('mobile phone') || h.includes('work direct phone') || h.includes('phone number')) return 'phone';
        if (h.includes('company name')) return 'company';
        if (h.includes('title')) return 'jobTitle';
        
        return ''; // Ignore other fields
    };
    
    // Find the index of the relevant columns based on the mapped field name
    const columnMap: { [key: string]: number } = {};
    header.forEach((h, i) => {
        const field = mapHeaderToField(h);
        if (field) {
            // Prefer the earliest index found for a field if duplicates exist
            if (!(field in columnMap)) {
                columnMap[field] = i;
            }
        }
    });

    const customers: Customer[] = [];

    dataLines.forEach((line) => {
        // Simple splitting, safe for basic CSVs but could fail on quoted fields with commas
        const values = line.split(',');
        if (values.length !== header.length) return; // Skip malformed lines

        const contact: Partial<Customer> = {};
        let hasValidEmail = false;

        // Iterate through our predefined fields and pull data from the correct column index
        Object.entries(columnMap).forEach(([field, index]) => {
            const value = values[index]?.trim();
            if (value) {
                (contact as any)[field] = value;
                // Check if the email field has a valid-looking email address
                if (field === 'email' && value.includes('@') && value.includes('.')) {
                    hasValidEmail = true;
                }
            }
        });

        // Only save contacts that have a valid email address
        if (hasValidEmail) {
            customers.push({
                id: `cust_${contact.email}_${Math.random().toString(36).substring(2, 9)}`, 
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                email: contact.email || '',
                phone: contact.phone,
                company: contact.company,
                jobTitle: contact.jobTitle,
            } as Customer);
        }
    });

    return customers;
};


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

// --- List Manager Component ---
const ListManager = ({ db, userId, appId, setMessageBox, setActiveTab, setAllCustomers, isAuthReady }: {
    db: any, 
    userId: string | null, 
    appId: string, 
    setMessageBox: (message: string, type: 'success' | 'error') => void,
    setActiveTab: (tab: 'campaigns' | 'compose' | 'addCustomer' | 'lists') => void,
    setAllCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
    isAuthReady: boolean
}) => {
    const [lists, setLists] = useState<ContactList[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewContacts, setPreviewContacts] = useState<Customer[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Fetch lists from Firestore
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return; // CRITICAL FIX: Ensure Auth is ready

        const listsCollection = collection(db, `/artifacts/${appId}/users/${userId}/lists`);
        
        const unsubscribe = onSnapshot(listsCollection, async (snapshot) => {
            const fetchedLists: ContactList[] = [];
            
            let allContacts: Customer[] = [];

            // Use Promise.all to fetch counts and contacts concurrently for better performance
            const listPromises = snapshot.docs.map(async (doc) => {
                const listData = doc.data();
                // Ensure contacts subcollection path is correct
                const contactsSubcollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/lists/${doc.id}/contacts`);
                const contactsSnapshot = await getDocs(contactsSubcollectionRef);

                contactsSnapshot.forEach(contactDoc => {
                    allContacts.push(contactDoc.data() as Customer);
                });

                return {
                    id: doc.id,
                    name: listData.name,
                    createdAt: listData.createdAt,
                    contactCount: contactsSnapshot.size,
                };
            });
            
            const results = await Promise.all(listPromises);
            setLists(results);
            
            // Add initial customers and then filter in uploaded contacts to avoid duplicates based on email
            const finalContacts = [...initialCustomers];
            allContacts.forEach(uploadedContact => {
                if (!finalContacts.some(existingContact => existingContact.email === uploadedContact.email)) {
                    finalContacts.push(uploadedContact);
                }
            });
            setAllCustomers(finalContacts);

        }, (error) => {
            console.error("Error fetching lists:", error);
            setMessageBox("Error fetching contact lists. Check console for details.", "error");
        });

        return () => unsubscribe();
    }, [db, userId, appId, isAuthReady]); // Added isAuthReady to dependencies

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files ? e.target.files[0] : null;
        if (!selectedFile) return;

        setFile(selectedFile);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target?.result as string;
            const contacts = parseCSV(csvText);
            
            if (contacts.length === 0) {
                setMessageBox("No valid contacts found in the CSV. Make sure you have an 'Email' column with valid emails.", "error");
            }
            setPreviewContacts(contacts);
        };
        reader.readAsText(selectedFile);
    };

    const handleListUpload = async () => {
        // CRITICAL FIX: Check if DB and User are ready
        if (!db || !userId || !isAuthReady) {
            setMessageBox('Database connection is not ready. Please wait a moment and try again.', 'error');
            return;
        }
        if (!newListName.trim() || previewContacts.length === 0) {
            setMessageBox('Please enter a list name and upload a file with valid contacts.', 'error');
            return;
        }

        setUploadLoading(true);
        try {
            // 1. Create the new list document
            const listsCollection = collection(db, `/artifacts/${appId}/users/${userId}/lists`);
            const newListRef = await addDoc(listsCollection, {
                name: newListName.trim(),
                createdAt: new Date().toISOString(),
                ownerId: userId,
            });

            // 2. Add contacts to the 'contacts' subcollection (one write per contact)
            const contactsSubcollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/lists/${newListRef.id}/contacts`);
            const batchPromises = previewContacts.map(contact => {
                // Ensure a unique ID for the contact, which is important for the firestore document key if needed later
                const contactToSave = {
                    ...contact,
                    // Note: Removing the temporary ID generation here, Firestore will assign a permanent ID
                    // We only ensure the contact has all fields needed for saving
                    id: contact.id
                };
                return addDoc(contactsSubcollectionRef, contactToSave);
            });
            
            await Promise.all(batchPromises);

            setMessageBox(`Successfully imported ${previewContacts.length} contacts to list "${newListName}".`, 'success');
            setIsUploadModalOpen(false);
            setNewListName('');
            setFile(null);
            setPreviewContacts([]);

        } catch (error) {
            console.error("Error uploading list:", error);
            setMessageBox("Failed to upload list. Check console for details.", "error");
        } finally {
            setUploadLoading(false);
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <List className="h-6 w-6 mr-2 text-orange-600" /> Contact Lists
                </h1>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" /> New List / Import CSV
                </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">List Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Contacts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Created</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {lists.length > 0 ? lists.map(list => (
                                <tr key={list.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {}}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{list.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{list.contactCount}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(list.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">
                                        No contact lists saved yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- CSV Upload Modal --- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-bold flex items-center">
                                <Upload className="w-5 h-5 mr-2" /> Import People (CSV)
                            </h2>
                            <button onClick={() => {
                                setIsUploadModalOpen(false);
                                setNewListName('');
                                setFile(null);
                                setPreviewContacts([]);
                            }} className="text-gray-500 hover:text-gray-900">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                                <input
                                    type="text"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    placeholder="e.g., 'Q3 Marketing Leads'"
                                    className="w-full p-2 border rounded-md"
                                />
                            </div>
                            
                            <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center cursor-pointer hover:border-orange-500 transition-colors">
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleFileChange} 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    key={file ? 'file-uploaded' : 'no-file'} // Forces re-render if the same file is chosen
                                />
                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">
                                    {file ? `File selected: ${file.name}` : "Click here to select CSV file"}
                                </p>
                            </div>

                            <p className="text-xs text-gray-500">
                                **Import fields:** First Name, Last Name, Company, Job Title, Email, Phone.
                            </p>


                            {previewContacts.length > 0 && (
                                <div className="p-4 border rounded-md bg-yellow-50 text-sm">
                                    <p className="font-semibold text-yellow-800">Preview:</p>
                                    <p>{previewContacts.length} valid contacts found with email addresses.</p>
                                    <p className="mt-1">
                                        **Example Contact:** {previewContacts[0].firstName} {previewContacts[0].lastName} ({previewContacts[0].email})
                                    </p>
                                </div>
                            )}

                            <button 
                                onClick={handleListUpload}
                                disabled={uploadLoading || !newListName.trim() || previewContacts.length === 0}
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

// --- Email Composer (Same as before) ---
const EmailComposer = ({
    onBack,
    customers,
    setMessageBox,
    onSendEmail,
    onScheduleEmail,
    onScheduleSequence,
}: {
    onBack: () => void;
    customers: Customer[];
    setMessageBox: (message: string, type: 'success' | 'error') => void;
    onSendEmail: (payload: any) => Promise<boolean>;
    onScheduleEmail: (payload: any) => Promise<boolean>;
    onScheduleSequence: (payload: any) => Promise<boolean>;
}) => {
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState('');
    const [isSequence, setIsSequence] = useState(false);
    const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(
        [{ subject: "", body: "", scheduledAt: "" }]
    );
    const [loading, setLoading] = useState(false);

    const handleSelectAll = () => {
        if (!customers) return;
        setSelectedCustomers(prev =>
            prev.length === customers.length ? [] : customers.map(c => c.id)
        );
    };

    const handleAddStep = () => {
        setSequenceSteps([...sequenceSteps, { subject: "", body: "", scheduledAt: "" }]);
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
            setMessageBox('Please select at least one recipient.', 'error');
            return;
        }

        let payload: any;
        let success = false;
        
        const recipientEmails = selectedCustomers.map(id => {
            const customer = customers.find(c => c.id === id);
            return customer ? customer.email : null;
        }).filter((email): email is string => email !== null);

        if (recipientEmails.length === 0) {
            setMessageBox('Invalid recipients selected.', 'error');
            return;
        }

        if (isSequence) {
            const hasEmptyStep = sequenceSteps.some(step => !step.subject.trim() || !step.body.trim() || !step.scheduledAt);
            if (hasEmptyStep) {
                setMessageBox('All sequence steps must have a subject, message, and schedule time.', 'error');
                return;
            }
            
            const stepsWithUtcTime = sequenceSteps.map(step => {
                const localDate = new Date(step.scheduledAt || '');
                const utcDate = new Date(localDate.toUTCString());
                return { ...step, scheduledAt: utcDate.toISOString() };
            });
            
            payload = { 
                to: recipientEmails, 
                steps: stepsWithUtcTime,
                campaign_meta: {
                    name: subject || `Sequence for ${recipientEmails.join(', ')}`,
                    type: 'sequence',
                    recipients: recipientEmails.length,
                    content: 'See sequence steps',
                    createdAt: new Date().toISOString(),
                    status: 'scheduled',
                }
            }; 
            setLoading(true);
            success = await onScheduleSequence(payload);

        } else {
            if (!subject.trim() || !content.trim()) {
                setMessageBox('Please add a subject and message.', 'error');
                return;
            }

            payload = {
                to: recipientEmails,
                subject,
                body: content,
                campaign_meta: {
                    name: subject,
                    type: 'one-off',
                    recipients: recipientEmails.length,
                    content: content,
                    createdAt: new Date().toISOString(),
                    status: isScheduled ? 'scheduled' : 'sent',
                }
            };

            if (isScheduled) {
                if (!scheduledDateTime) {
                    setMessageBox('Please set a valid date and time for scheduling.', 'error');
                    return;
                }
                const localDate = new Date(scheduledDateTime);
                const utcDate = new Date(localDate.toUTCString());
                payload.send_at = utcDate.toISOString();
                payload.campaign_meta.scheduledAt = scheduledDateTime;
                setLoading(true);
                success = await onScheduleEmail(payload);
            } else {
                setLoading(true);
                success = await onSendEmail(payload);
            }
        }
        
        setLoading(false);
        if (success) {
            setMessageBox(isSequence || isScheduled ? 'Campaign scheduled successfully!' : 'Campaign sent successfully!', 'success');
            onBack();
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
                            Recipients ({selectedCustomers.length} of {customers ? customers.length : 0})
                        </h3>
                        <div className="max-h-48 overflow-y-auto border rounded-md">
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
                                        className="h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div className="ml-3 text-sm">
                                        <div className="font-medium text-gray-800">{c.firstName} {c.lastName}</div>
                                        <div className="text-gray-500">{c.email}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleSelectAll} className="text-sm text-orange-600 hover:underline mt-2">
                            {selectedCustomers.length === (customers ? customers.length : 0) ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---
const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'compose' | 'addCustomer' | 'lists'>('campaigns');
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [loading, setLoading] = useState(true);
    const [messageBox, setMessageBox] = useState<MessageBoxState>({ message: '', type: 'success' });
    const [messageBoxTimeout, setMessageBoxTimeout] = useState<NodeJS.Timeout | null>(null);
    const [db, setDb] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const showMessage = (message: string, type: 'success' | 'error') => {
        if (messageBoxTimeout) clearTimeout(messageBoxTimeout);
        setMessageBox({ message, type });
        const timeout = setTimeout(() => {
            setMessageBox({ message: '', type: 'success' });
        }, 5000);
        setMessageBoxTimeout(timeout);
    };

    // --- Firebase Init & Auth ---
    useEffect(() => {
        try {
            if (Object.keys(firebaseConfig).length > 0) {
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                const firestore = getFirestore(app);
                setDb(firestore);

                onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        if (initialAuthToken) {
                            await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            await signInAnonymously(auth);
                        }
                    }
                    setIsAuthReady(true);
                    setUserId(auth.currentUser?.uid || null);
                });
            } else {
                console.error("Firebase config is not defined. App will not be able to save data.");
                // Removed showMessage here to avoid the repeated popup error on every render
            }
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            showMessage("Error initializing Firebase. Please check the console.", "error");
        }
    }, []);

    // --- Fetch Campaigns from Firestore (Real-time updates) ---
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;
        setLoading(true);
    
        const collectionPath = `/artifacts/${appId}/users/${userId}/campaigns`;
        const campaignsCollection = collection(db, collectionPath);
    
        const unsubscribe = onSnapshot(campaignsCollection, (snapshot) => {
            const campaignsData: EmailCampaign[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Untitled Campaign',
                    type: data.type || 'one-off',
                    status: data.status,
                    recipients: data.recipients,
                    content: data.content,
                    createdAt: data.createdAt,
                    scheduledAt: data.scheduledAt,
                };
            });
            setCampaigns(campaignsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching campaigns:", error);
            // Show message only on initial failure, not continuous failures
            if (loading) showMessage("Error fetching campaigns. Check console for network issues.", "error");
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, [db, isAuthReady, userId]); // Dependency on userId ensures correct user data isolation


    const handleAddCustomer = (firstName: string, lastName: string, email: string) => {
        const newCustomer: Customer = {
            id: `cust_${Date.now()}`,
            firstName,
            lastName,
            email,
        };
        // For simplicity, manually adding to local state for now
        setCustomers(prev => [...prev, newCustomer]); 
        setActiveTab('campaigns');
        showMessage("New recipient added! (Note: Only saved locally in browser state)", "success");
    };
    
    // --- API calls for sending/scheduling emails (Python Server) ---
    // The client passes the campaign metadata (including userId and appId) for the server to save to Firestore.

    const onSendEmail = async (payload: any): Promise<boolean> => {
        if (!userId) { showMessage('Authentication not complete. Cannot send.', 'error'); return false; }
        try {
            const res = await fetch(`${API_BASE_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, user_id: userId, app_id: appId }),
            });
            if (!res.ok) throw new Error("Failed to send email via API.");
            return true;
        } catch (e) {
            console.error(e);
            showMessage("Failed to connect to server. Check server.py is running.", "error");
            return false;
        }
    };

    const onScheduleEmail = async (payload: any): Promise<boolean> => {
        if (!userId) { showMessage('Authentication not complete. Cannot schedule.', 'error'); return false; }
        try {
            const res = await fetch(`${API_BASE_URL}/schedule-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, user_id: userId, app_id: appId }),
            });
            if (!res.ok) throw new Error("Failed to schedule email via API.");
            return true;
        } catch (e) {
            console.error(e);
            showMessage("Failed to connect to server. Check server.py is running.", "error");
            return false;
        }
    };

    const onScheduleSequence = async (payload: any): Promise<boolean> => {
        if (!userId) { showMessage('Authentication not complete. Cannot schedule sequence.', 'error'); return false; }
        try {
            const res = await fetch(`${API_BASE_URL}/schedule-sequence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, user_id: userId, app_id: appId }),
            });
            if (!res.ok) throw new Error("Failed to schedule sequence via API.");
            return true;
        } catch (e) {
            console.error(e);
            showMessage("Failed to connect to server. Check server.py is running.", "error");
            return false;
        }
    };

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
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center ${
                            activeTab === 'lists' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <User className="h-4 w-4 mr-2" /> Contacts & Lists
                    </button>
                </div>
                <div className="text-right text-xs text-gray-500">
                    User ID: <span className="font-mono break-all">{userId || 'Not signed in'}</span>
                </div>
            </div>

            {activeTab === 'campaigns' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
                            <p className="mt-1 text-sm text-gray-500">Manage your email campaigns</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveTab('compose')}
                                className="inline-flex items-center px-4 py-2 border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Compose Email
                            </button>
                            <button
                                onClick={() => setActiveTab('addCustomer')}
                                className="inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Recipient
                            </button>
                        </div>
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
                                        <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {}}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    {c.type} • Created {new Date(c.createdAt).toLocaleDateString()}
                                                    {c.status === 'scheduled' && c.scheduledAt ? ` • Scheduled for ${new Date(c.scheduledAt).toLocaleString()}` : ''}
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
                                            <td className="px-6 py-4 text-sm text-gray-500">{c.recipients}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">
                                                No campaigns yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'lists' && (
                <ListManager 
                    db={db} 
                    userId={userId} 
                    appId={appId} 
                    setMessageBox={showMessage} 
                    setActiveTab={setActiveTab}
                    setAllCustomers={setCustomers}
                    isAuthReady={isAuthReady} // Passing the auth status
                />
            )}
            
            {activeTab === 'compose' && (
                <EmailComposer
                    onBack={() => setActiveTab('campaigns')}
                    customers={customers}
                    setMessageBox={showMessage}
                    onSendEmail={onSendEmail}
                    onScheduleEmail={onScheduleEmail}
                    onScheduleSequence={onScheduleSequence}
                />
            )}
            
            {activeTab === 'addCustomer' && (
                // Add Recipient Form
                <div className="space-y-6 max-w-lg mx-auto bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold">Add New Recipient</h2>
                    <div className="space-y-4">
                        <input id="firstName" placeholder="First Name" className="w-full p-2 border rounded-md" />
                        <input id="lastName" placeholder="Last Name" className="w-full p-2 border rounded-md" />
                        <input id="email" placeholder="Email Address" type="email" className="w-full p-2 border rounded-md" />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    const firstName = (document.getElementById('firstName') as HTMLInputElement).value;
                                    const lastName = (document.getElementById('lastName') as HTMLInputElement).value;
                                    const email = (document.getElementById('email') as HTMLInputElement).value;
                                    if (!firstName || !lastName || !email) {
                                        showMessage('All fields are required.', 'error');
                                        return;
                                    }
                                    handleAddCustomer(firstName, lastName, email);
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setActiveTab('campaigns')}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
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