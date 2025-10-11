import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useCustomers, Customer } from '../contexts/CustomerContext';
import toast from 'react-hot-toast';

interface CSVUploadModalProps {
  onClose: () => void;
}

// Define the fields for clarity and reusability
const REQUIRED_FIELDS = ['firstName', 'lastName', 'email'];
const OPTIONAL_FIELDS = ['customerType', 'cookingClassType', 'customerStage', 'tags', 'notes'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const CSVUploadModal: React.FC<CSVUploadModalProps> = ({ onClose }) => {
  const { importCustomers } = useCustomers();
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 1) {
            const parsedData = results.data as string[][];
            setHeaders(parsedData[0]);
            setCsvData(parsedData.slice(1));
            setStep('map');
          } else {
            toast.error('CSV file is empty or contains only a header.');
          }
        },
        header: false,
        skipEmptyLines: true,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleMapping = (csvHeader: string, field: string) => {
    setMapping((prev) => ({ ...prev, [field]: csvHeader }));
  };

  const validateAndPreview = () => {
    const newErrors = REQUIRED_FIELDS.filter(field => !mapping[field])
      .map(field => `The '${field.replace(/([A-Z])/g, ' $1')}' field must be mapped.`);

    setErrors(newErrors);
    if (newErrors.length === 0) {
      setStep('preview');
    }
  };

  const processImport = async () => {
    setIsImporting(true);

    // Create a map of your field names to their column index for efficiency
    const indexMap: Record<string, number> = {};
    for (const field of ALL_FIELDS) {
      if (mapping[field]) {
        indexMap[field] = headers.indexOf(mapping[field]);
      }
    }

    const importResults = csvData.reduce<{
      valid: Omit<Customer, 'id'>[];
      skipped: number;
    }>(
      (acc, row) => {
        const firstName = row[indexMap.firstName]?.trim();
        const lastName = row[indexMap.lastName]?.trim();
        const email = row[indexMap.email]?.trim();

        // Skip row if any required field is missing or empty
        if (!firstName || !lastName || !email) {
          acc.skipped += 1;
          return acc;
        }

        const customer: Omit<Customer, 'id'> = {
          firstName,
          lastName,
          email,
          customerType: row[indexMap.customerType]?.trim() || 'Lead',
          cookingClassType: row[indexMap.cookingClassType]?.trim() || 'Group',
          customerStage: row[indexMap.customerStage]?.trim() || 'Prospect',
          dateAdded: new Date().toISOString().split('T')[0],
          lastActivity: new Date().toISOString().split('T')[0],
          tags: mapping.tags ? (row[indexMap.tags] || '').split(',').map(t => t.trim()).filter(Boolean) : [],
          notes: row[indexMap.notes]?.trim() || '',
        };

        acc.valid.push(customer);
        return acc;
      },
      { valid: [], skipped: 0 }
    );
    
    try {
      if (importResults.valid.length > 0) {
        await importCustomers(importResults.valid);
        toast.success(`Imported ${importResults.valid.length} customers successfully.`);
      }
      if (importResults.skipped > 0) {
        toast.error(`Skipped ${importResults.skipped} rows due to missing required data.`);
      }
      if (importResults.valid.length === 0 && importResults.skipped === 0) {
        toast.error("No data to import.");
      }
      onClose();
    } catch (error) {
      toast.error('An error occurred during the import.');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
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
          {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <FileText className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">CSV Format Requirements</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your CSV must include columns for at least First Name, Last Name, and Email.</p>
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
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Map Your CSV Columns</h3>
            <p className="mt-1 text-sm text-yellow-700">Match your CSV columns to the customer fields below.</p>
          </div>
        </div>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {ALL_FIELDS.map(field => (
          <div key={field} className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 capitalize">
              {field.replace(/([A-Z])/g, ' $1').trim()}
              {REQUIRED_FIELDS.includes(field) && <span className="text-red-500 ml-1">*</span>}
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
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                    <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                        {errors.map((error, index) => <li key={index}>{error}</li>)}
                    </ul>
                </div>
            </div>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => {
    const previewData = csvData.slice(0, 5).map(row => ({
      name: `${row[headers.indexOf(mapping.firstName)] || ''} ${row[headers.indexOf(mapping.lastName)] || ''}`,
      email: row[headers.indexOf(mapping.email)] || '',
      type: row[headers.indexOf(mapping.customerType)] || 'Lead',
    }));

    return (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-green-800">Preview Import</h3>
          <p className="mt-1 text-sm text-green-700">
            Ready to import {csvData.length} customers. Here's a preview of the first 5 records:
          </p>
        </div>
        <div className="overflow-x-auto border rounded-lg">
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
                  <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{customer.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{customer.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">{customer.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
        <div className="p-5">
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
        </div>

        <div className="flex justify-between items-center p-4 bg-gray-50 border-t rounded-b-lg">
            <div>
            {step !== 'upload' && (
                <button
                onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}
                disabled={isImporting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                Back
                </button>
            )}
            </div>
            <div className="flex space-x-3">
            <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                disabled={isImporting}
            >
                Cancel
            </button>
            {step === 'map' && (
                <button
                onClick={validateAndPreview}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                Preview
                </button>
            )}
            {step === 'preview' && (
                <button
                onClick={processImport}
                disabled={isImporting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 transition-colors flex items-center"
                >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isImporting ? 'Importing...' : `Import ${csvData.length} Customers`}
                </button>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadModal;