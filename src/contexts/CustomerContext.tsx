import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  customerType: 'Lead' | 'Active' | 'VIP' | 'Inactive';
  cookingClassType: 'Team Building' | 'Date Night' | 'Teen Cooking' | 'Private' | 'Group';
  customerStage: 'Prospect' | 'Enrolled' | 'Completed' | 'Repeat';
  dateAdded: string;
  lastActivity: string;
  tags: string[];
  notes?: string;
}

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importCustomers: (customers: Omit<Customer, 'id'>[]) => void;
  getCustomersByType: (type: string) => Customer[];
  searchCustomers: (query: string) => Customer[];
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const useCustomers = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
};

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      customerType: 'VIP',
      cookingClassType: 'Date Night',
      customerStage: 'Repeat',
      dateAdded: '2024-01-15',
      lastActivity: '2024-01-20',
      tags: ['Premium', 'Frequent']
    },
    {
      id: '2',
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@email.com',
      customerType: 'Active',
      cookingClassType: 'Team Building',
      customerStage: 'Completed',
      dateAdded: '2024-01-10',
      lastActivity: '2024-01-18',
      tags: ['Corporate']
    }
  ]);

  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Date.now().toString()
    };
    setCustomers(prev => [...prev, newCustomer]);
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, ...updates } : customer
    ));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  }, []);

  const importCustomers = useCallback((newCustomers: Omit<Customer, 'id'>[]) => {
    const customersWithIds = newCustomers.map(customer => ({
      ...customer,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }));
    setCustomers(prev => [...prev, ...customersWithIds]);
  }, []);

  const getCustomersByType = useCallback((type: string) => {
    return customers.filter(customer => customer.cookingClassType === type);
  }, [customers]);

  const searchCustomers = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return customers.filter(customer =>
      customer.firstName.toLowerCase().includes(lowercaseQuery) ||
      customer.lastName.toLowerCase().includes(lowercaseQuery) ||
      customer.email.toLowerCase().includes(lowercaseQuery) ||
      customer.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [customers]);

  return (
    <CustomerContext.Provider value={{
      customers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      importCustomers,
      getCustomersByType,
      searchCustomers
    }}>
      {children}
    </CustomerContext.Provider>
  );
};