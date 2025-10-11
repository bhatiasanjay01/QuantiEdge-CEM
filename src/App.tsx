import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerProvider } from './contexts/CustomerContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import EmailCampaigns from './pages/EmailCampaigns';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CustomerProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="email-campaigns" element={<EmailCampaigns />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="bottom-right" />
      </CustomerProvider>
    </AuthProvider>
  );
};

export default App;
