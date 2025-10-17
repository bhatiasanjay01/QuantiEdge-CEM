const API_URL = 'http://localhost:5000';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  lastContact?: string;
}

export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_URL}/api/customers`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return await response.json();
}

export async function createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
  const response = await fetch(`${API_URL}/api/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(customer),
  });

  if (!response.ok) {
    throw new Error('Failed to create customer');
  }

  return await response.json();
}

export async function deleteCustomer(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/customers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete customer');
  }
}

export async function getCampaigns(): Promise<any[]> {
  const response = await fetch(`${API_URL}/api/campaigns`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch campaigns');
  }

  return await response.json();
}
