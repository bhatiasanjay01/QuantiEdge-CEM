import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  importCustomers: (customers: Omit<Customer, 'id'>[]) => Promise<void>;
  getCustomersByType: (type: string) => Customer[];
  searchCustomers: (query: string) => Customer[];
  loading: boolean;
  refreshCustomers: () => Promise<void>;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCustomers: Customer[] = (data || []).map(contact => ({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        customerType: (contact.custom_fields as any)?.customerType || 'Lead',
        cookingClassType: (contact.custom_fields as any)?.cookingClassType || 'Group',
        customerStage: (contact.custom_fields as any)?.customerStage || 'Prospect',
        dateAdded: contact.created_at,
        lastActivity: contact.updated_at,
        tags: contact.tags || [],
        notes: (contact.custom_fields as any)?.notes
      }));

      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          first_name: customer.firstName,
          last_name: customer.lastName,
          email: customer.email,
          tags: customer.tags,
          custom_fields: {
            customerType: customer.customerType,
            cookingClassType: customer.cookingClassType,
            customerStage: customer.customerStage,
            notes: customer.notes
          }
        })
        .select()
        .single();

      if (error) throw error;

      const newCustomer: Customer = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        customerType: customer.customerType,
        cookingClassType: customer.cookingClassType,
        customerStage: customer.customerStage,
        dateAdded: data.created_at,
        lastActivity: data.updated_at,
        tags: data.tags || [],
        notes: customer.notes
      };

      setCustomers(prev => [newCustomer, ...prev]);
      toast.success('Contact added successfully');
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add contact');
      throw error;
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    try {
      const currentCustomer = customers.find(c => c.id === id);
      if (!currentCustomer) throw new Error('Customer not found');

      const { error } = await supabase
        .from('contacts')
        .update({
          first_name: updates.firstName || currentCustomer.firstName,
          last_name: updates.lastName || currentCustomer.lastName,
          email: updates.email || currentCustomer.email,
          tags: updates.tags || currentCustomer.tags,
          custom_fields: {
            customerType: updates.customerType || currentCustomer.customerType,
            cookingClassType: updates.cookingClassType || currentCustomer.cookingClassType,
            customerStage: updates.customerStage || currentCustomer.customerStage,
            notes: updates.notes !== undefined ? updates.notes : currentCustomer.notes
          }
        })
        .eq('id', id);

      if (error) throw error;

      setCustomers(prev => prev.map(customer =>
        customer.id === id ? { ...customer, ...updates } : customer
      ));
      toast.success('Contact updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update contact');
      throw error;
    }
  }, [customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCustomers(prev => prev.filter(customer => customer.id !== id));
      toast.success('Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete contact');
      throw error;
    }
  }, []);

  const importCustomers = useCallback(async (newCustomers: Omit<Customer, 'id'>[]) => {
    try {
      const contactsToInsert = newCustomers.map(customer => ({
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        tags: customer.tags,
        custom_fields: {
          customerType: customer.customerType,
          cookingClassType: customer.cookingClassType,
          customerStage: customer.customerStage,
          notes: customer.notes
        }
      }));

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsToInsert)
        .select();

      if (error) throw error;

      const transformedCustomers: Customer[] = (data || []).map(contact => ({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        customerType: (contact.custom_fields as any)?.customerType || 'Lead',
        cookingClassType: (contact.custom_fields as any)?.cookingClassType || 'Group',
        customerStage: (contact.custom_fields as any)?.customerStage || 'Prospect',
        dateAdded: contact.created_at,
        lastActivity: contact.updated_at,
        tags: contact.tags || [],
        notes: (contact.custom_fields as any)?.notes
      }));

      setCustomers(prev => [...transformedCustomers, ...prev]);
      toast.success(`${newCustomers.length} contacts imported successfully`);
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error('Failed to import contacts');
      throw error;
    }
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
      searchCustomers,
      loading,
      refreshCustomers: loadCustomers
    }}>
      {children}
    </CustomerContext.Provider>
  );
};