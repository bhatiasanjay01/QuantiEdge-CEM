import React, { useState } from 'react';
import { ArrowLeft, Plus, Mail, Clock, Trash2, Edit, Play, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailStep {
  id: string;
  subject: string;
  content: string;
  delay: number;
  delayUnit: 'hours' | 'days';
}

interface SequenceBuilderProps {
  onBack: () => void;
}

const SequenceBuilder: React.FC<SequenceBuilderProps> = ({ onBack }) => {
  const [sequenceName, setSequenceName] = useState('');
  const [steps, setSteps] = useState<EmailStep[]>([
    {
      id: '1',
      subject: '',
      content: '',
      delay: 0,
      delayUnit: 'days'
    }
  ]);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  const addStep = () => {
    const newStep: EmailStep = {
      id: Date.now().toString(),
      subject: '',
      content: '',
      delay: 1,
      delayUnit: 'days'
    };
    setSteps([...steps, newStep]);
    setEditingStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<EmailStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const deleteStep = (stepId: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== stepId));
      if (editingStep === stepId) {
        setEditingStep(null);
      }
    }
  };

  const saveSequence = () => {
    if (!sequenceName.trim()) {
      toast.error('Please enter a sequence name');
      return;
    }

    const incompleteSteps = steps.filter(step => !step.subject.trim() || !step.content.trim());
    if (incompleteSteps.length > 0) {
      toast.error('Please complete all email steps');
      return;
    }

    // Mock save logic
    toast.success('Email sequence saved successfully');
    onBack();
  };

  const getStepDelay = (step: EmailStep, index: number) => {
    if (index === 0) return 'Immediately';
    return `${step.delay} ${step.delayUnit} after previous email`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Sequence Builder</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create automated email sequences for your customers
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={saveSequence}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </button>
          <button
            onClick={saveSequence}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
          >
            <Play className="h-4 w-4 mr-2" />
            Activate Sequence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sequence Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sequence Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sequence Name
                </label>
                <input
                  type="text"
                  value={sequenceName}
                  onChange={(e) => setSequenceName(e.target.value)}
                  placeholder="e.g., New Customer Welcome"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Sequence Timeline</h4>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                      editingStep === step.id 
                        ? 'border-orange-300 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setEditingStep(step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          Email {index + 1}
                        </span>
                      </div>
                      {steps.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {getStepDelay(step, index)}
                    </div>
                    {step.subject && (
                      <div className="mt-1 text-xs text-gray-700 truncate">
                        {step.subject}
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addStep}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-sm">Add Email Step</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Editor */}
        <div className="lg:col-span-2">
          {editingStep ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              {(() => {
                const step = steps.find(s => s.id === editingStep);
                const stepIndex = steps.findIndex(s => s.id === editingStep);
                if (!step) return null;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Email {stepIndex + 1}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {getStepDelay(step, stepIndex)}
                      </div>
                    </div>

                    {stepIndex > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delay Amount
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={step.delay}
                            onChange={(e) => updateStep(step.id, { delay: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delay Unit
                          </label>
                          <select
                            value={step.delayUnit}
                            onChange={(e) => updateStep(step.id, { delayUnit: e.target.value as 'hours' | 'days' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                        placeholder="Enter email subject..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Content
                      </label>
                      <textarea
                        value={step.content}
                        onChange={(e) => updateStep(step.id, { content: e.target.value })}
                        rows={12}
                        placeholder="Write your email content here... Use {{firstName}}, {{lastName}}, {{email}} for personalization"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Personalization Tokens</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div><code>{{firstName}}</code> - Customer's first name</div>
                        <div><code>{{lastName}}</code> - Customer's last name</div>
                        <div><code>{{email}}</code> - Customer's email address</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Email Step</h3>
              <p className="text-gray-500">
                Choose an email step from the timeline to start editing its content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SequenceBuilder;