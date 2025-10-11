import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useCustomers, Customer } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

interface CSVUploadModalProps {
  onClose: () => void;
}

const CSVUploadModal: React.FC<CSVUploadModalProps> = ({ onClose }) => {
  const { importCustomers } = useCustomers();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [errors, setErrors] = useState<string[]>([]);

  const requiredFields = ['firstName', 'lastName', 'email'];
  const optionalFields = ['customerType', 'cookingClassType', 'customerStage', 'tags', 'notes'];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const headers = results.data[0] as string[];
            const data = results.data.slice(1);
            setHeaders(headers);
            setCsvData(data);
            setStep('map');
          }
        },
        header: false,
        skipEmptyLines: true
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleMapping = (csvHeader: string, field: string) => {
    setMapping(prev => ({ ...prev, [field]: csvHeader }));
  };

  const validateAndPreview = () => {
    const newErrors: string[] = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!mapping[field]) {
        newErrors.push(`${field} is required but not mapped`);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setStep('preview');
  };

  const processImport = () => {
    const processedCustomers: Omit<Customer, 'id'>[] = csvData.map((row, index) => {
      const customer: any = {
        firstName: row[headers.indexOf(mapping.firstName)] || '',
        lastName: row[headers.indexOf(mapping.lastName)] || '',
        email: row[headers.indexOf(mapping.email)] || '',
        customerType: row[headers.indexOf(mapping.customerType)] || 'Lead',
        cookingClassType: row[headers.indexOf(mapping.cookingClassType)] || 'Group',
        customerStage: row[headers.indexOf(mapping.customerStage)] || 'Prospect',
        dateAdded: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        tags: mapping.tags ? (row[headers.indexOf(mapping.tags)] || '').split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
        notes: mapping.notes ? row[headers.indexOf(mapping.notes)] || '' : ''
      };

      return customer;
    }).filter(customer => customer.firstName && customer.lastName && customer.email);

    importCustomers(processedCustomers);
    toast.success(`Successfully imported ${processedCustomers.length} customers`);
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop the CSV file here' : 'Drag and drop a CSV file here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <FileText className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">CSV Format Requirements</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your CSV should include these columns:</p>
              <ul className="list-disc list-inside mt-1">
                <li>First Name (required)</li>
                <li>Last Name (required)</li>
                <li>Email (required)</li>
                <li>Customer Type (optional)</li>
                <li>Cooking Class Type (optional)</li>
                <li>Customer Stage (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="bg-yellow-50 p-4 rounded-md">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Map Your CSV Columns</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Match your CSV columns to the customer fields below.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[...requiredFields, ...optionalFields].map(field => (
          <div key={field} className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 capitalize">
              {field.replace(/([A-Z])/g, ' $1').trim()}
              {requiredFields.includes(field) && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={mapping[field] || ''}
              onChange={(e) => handleMapping(e.target.value, field)}
              className="w-48 px-3 py-1 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select column...</option>
              {headers.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Mapping Errors</h3>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => {
    const previewData = csvData.slice(0, 5).map(row => ({
      firstName: row[headers.indexOf(mapping.firstName)],
      lastName: row[headers.indexOf(mapping.lastName)],
      email: row[headers.indexOf(mapping.email)],
      customerType: row[headers.indexOf(mapping.customerType)] || 'Lead'
    }));

    return (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-green-800">Preview Import</h3>
          <p className="mt-1 text-sm text-green-700">
            Ready to import {csvData.length} customers. Here's a preview of the first 5 records:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.map((customer, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{customer.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{customer.customerType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Import Customers from CSV</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'upload' && renderUploadStep()}
        {step === 'map' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}

        <div className="flex justify-between pt-6">
          <div>
            {step !== 'upload' && (
              <button
                onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            {step === 'map' && (
              <button
                onClick={validateAndPreview}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
              >
                Preview
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={processImport}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
              >
                Import Customers
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadModal;