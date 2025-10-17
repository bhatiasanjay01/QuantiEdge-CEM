import React, { useState, useEffect } from 'react';
import { Save, Mail, Shield, Bell, Building, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { initiateGmailOAuth, getConnectedEmailAccount, type EmailAccount } from '../lib/emailApi';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('email');
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const [businessSettings, setBusinessSettings] = useState({
    businessName: user?.businessName || '',
    businessUrl: user?.businessUrl || '',
    email: user?.email || '',
    phone: '',
    address: '',
    timezone: 'America/New_York',
    currency: 'USD'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newCustomer: true,
    classBooking: true,
    emailCampaign: true,
    weeklyReport: true,
    monthlyReport: true
  });

  const tabs = [
    { id: 'email', name: 'Email Setup', icon: Mail },
    { id: 'business', name: 'Business Info', icon: Building },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  useEffect(() => {
    loadEmailAccount();

    const urlParams = new URLSearchParams(window.location.search);
    const emailConnected = urlParams.get('email_connected');
    const connectedEmail = urlParams.get('email');

    if (emailConnected === 'true') {
      toast.success(`Gmail account ${connectedEmail} connected successfully!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadEmailAccount();
    }
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

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      await initiateGmailOAuth();
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate Gmail connection');
      setIsConnecting(false);
    }
  };

  const handleSave = (section: string) => {
    toast.success(`${section} settings saved successfully`);
  };

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail Integration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your Gmail account to send emails directly from the CRM using Gmail's API.
        </p>

        {isLoadingAccount ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-orange-600 border-t-transparent rounded-full"></div>
          </div>
        ) : emailAccount?.is_connected ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-green-900">Connected</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Your Gmail account is connected and ready to send emails.
                  </p>
                  <div className="mt-3 bg-white border border-green-200 rounded-md p-3">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{emailAccount.email}</div>
                        <div className="text-xs text-gray-500">
                          Connected via Google OAuth
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <Mail className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900">Connect Your Gmail Account</h4>
                <p className="text-sm text-blue-800 mt-1">
                  To send emails from the CRM, you need to connect your Gmail account using OAuth 2.0.
                </p>
                <div className="mt-4 bg-white border border-blue-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">What happens when you connect:</h5>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Secure OAuth 2.0 authentication with Google</li>
                    <li>Send emails directly through your Gmail account</li>
                    <li>Personalized email campaigns to your customers</li>
                    <li>Track sent emails and delivery status</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Connect Gmail Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Important Notes:</h5>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>You'll be redirected to Google to authorize access</li>
            <li>We only request permissions to send emails on your behalf</li>
            <li>Your credentials are securely stored and encrypted</li>
            <li>Make sure Python server is running on port 5000</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={businessSettings.businessName}
              onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business URL
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                quantiedge.com/
              </span>
              <input
                type="text"
                value={businessSettings.businessUrl}
                onChange={(e) => setBusinessSettings({ ...businessSettings, businessUrl: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={businessSettings.email}
              onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={businessSettings.phone}
              onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Address
            </label>
            <textarea
              value={businessSettings.address}
              onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={businessSettings.timezone}
              onChange={(e) => setBusinessSettings({ ...businessSettings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={businessSettings.currency}
              onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('Business')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(notificationSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-sm text-gray-500">
                  {key === 'newCustomer' && 'Get notified when a new customer signs up'}
                  {key === 'classBooking' && 'Get notified when someone books a class'}
                  {key === 'emailCampaign' && 'Get notified about email campaign results'}
                  {key === 'weeklyReport' && 'Receive weekly business performance reports'}
                  {key === 'monthlyReport' && 'Receive monthly business analytics reports'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    [key]: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('Notification')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Preferences
        </button>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Change Password</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Two-Factor Authentication</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Enable 2FA</div>
                  <div className="text-sm text-gray-500">Add an extra layer of security to your account</div>
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200">
                  Enable
                </button>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Active Sessions</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Current Session</div>
                  <div className="text-sm text-gray-500">Chrome on Windows • Last active now</div>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('Security')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
        >
          <Save className="h-4 w-4 mr-2" />
          Update Security
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your business settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 w-full text-left transition-colors duration-200`}
              >
                <tab.icon
                  className={`${
                    activeTab === tab.id ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-5 w-5 transition-colors duration-200`}
                />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            {activeTab === 'business' && renderBusinessSettings()}
            {activeTab === 'email' && renderEmailSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
