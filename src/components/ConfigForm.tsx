import React, { useState, useEffect } from 'react';
import { buildTestConnectionPayload } from '../services/openaiService';
import { useNavigate } from 'react-router-dom';

const ConfigForm: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [formData, setFormData] = useState({
    VITE_AZURE_OPENAI_API_KEY: '',
    VITE_AZURE_OPENAI_ENDPOINT: '',
    VITE_AZURE_OPENAI_API_VERSION: '',
    VITE_AZURE_OPENAI_MODEL: 'gpt-4o',
    VITE_AZURE_OPENAI_API_TOKEN_SIZE: '',
    VITE_AZURE_OPENAI_API_BATCH_SIZE: '5'
  });
  const [testing, setTesting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'save' | 'test' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setFormData({
            ...data,
            VITE_AZURE_OPENAI_MODEL: data.VITE_AZURE_OPENAI_MODEL || 'gpt-4o'
          });
        } else {
          alert('Failed to load config');
        }
      } catch (err) {
        alert('Error fetching config');
      }
    };

    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!submitAction) return;

    if (submitAction === 'save') {
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert('✅ Config saved.\nRedirecting to home...');
          navigate('/');
        } else {
          alert('❌ Failed to save config');
        }
      } catch (err) {
        alert('Error while submitting config.');
      }
    }

    if (submitAction === 'test') {
      setTesting(true);
      try {
        let endpoint = formData.VITE_AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
        endpoint = endpoint.replace(/\/chat\/completions.*/, '');
        const url = `${endpoint}/chat/completions?api-version=${formData.VITE_AZURE_OPENAI_API_VERSION}`;
        const payload = await buildTestConnectionPayload(formData.VITE_AZURE_OPENAI_MODEL);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': formData.VITE_AZURE_OPENAI_API_KEY
          },
          body: JSON.stringify(payload)
        });

        const responseData = await res.json();

        if (!res.ok) {
          throw new Error('CONFIG_ERROR');
        }

        setApiResponse(responseData);
        // Removed redundant alert; response is shown in popup
      } catch (err: any) {
        setApiResponse({
          error: {
            message:
              'Please verify your configuration details — the API endpoint, API key, or API version may be incorrect for the selected model.'
          }
        });
      } finally {
        setTesting(false);
      }
    }

    setSubmitAction(null); // reset
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-2 overflow-auto" style={{ backgroundColor: 'rgb(85 125 165)', maxHeight: '100vh' }}>
      <div className="w-full max-w-xl bg-white shadow-lg rounded-lg p-3 mt-4" style={{ backgroundColor: 'rgb(244 246 248)' }}>
        <div className="flex items-center justify-between mb-2">
          <div />
          <button
            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-sm"
            type="button"
            onClick={() => navigate('/')}
          >
            Back
          </button>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-extrabold text-blue-500">OpenAI Configuration</h2>
          <h3 className="mt-2 text-lg font-semibold text-gray-600">Configure your OpenAI API settings for CodePulse AI</h3>
        </div>

        {/* Show error modal if apiResponse contains error */}
        {apiResponse?.error?.message && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
              <h3 className="text-xl font-bold mb-4 text-red-600">Connection Failed.</h3>
              <div className="bg-gray-100 rounded p-4 text-base text-gray-800 mb-4 flex items-center gap-2" style={{ wordBreak: 'break-word' }}>
                <span>{apiResponse.error.message}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  onClick={() => setApiResponse(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_API_KEY" className="block text-sm font-medium text-gray-700">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="VITE_AZURE_OPENAI_API_KEY"
              name="VITE_AZURE_OPENAI_API_KEY"
              value={formData.VITE_AZURE_OPENAI_API_KEY}
              onChange={handleChange}
              placeholder="Enter your Azure OpenAI API key"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_ENDPOINT" className="block text-sm font-medium text-gray-700">
              Endpoint <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="VITE_AZURE_OPENAI_ENDPOINT"
              name="VITE_AZURE_OPENAI_ENDPOINT"
              value={formData.VITE_AZURE_OPENAI_ENDPOINT}
              onChange={handleChange}
              placeholder="https://your-resource.openai.azure.com/openai/deployments/..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_API_VERSION" className="block text-sm font-medium text-gray-700">
              API Version <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="VITE_AZURE_OPENAI_API_VERSION"
              name="VITE_AZURE_OPENAI_API_VERSION"
              value={formData.VITE_AZURE_OPENAI_API_VERSION}
              onChange={handleChange}
              placeholder="2025-xx-xx-preview"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_MODEL" className="block text-sm font-medium text-gray-700">
              Model <span className="text-red-500">*</span>
            </label>
            <select
              id="VITE_AZURE_OPENAI_MODEL"
              name="VITE_AZURE_OPENAI_MODEL"
              value={formData.VITE_AZURE_OPENAI_MODEL}
              onChange={(e) => setFormData({ ...formData, VITE_AZURE_OPENAI_MODEL: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="o3-mini">o3-mini</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_API_TOKEN_SIZE" className="block text-sm font-medium text-gray-700">
              MAX TOKEN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="VITE_AZURE_OPENAI_API_TOKEN_SIZE"
              name="VITE_AZURE_OPENAI_API_TOKEN_SIZE"
              value={formData.VITE_AZURE_OPENAI_API_TOKEN_SIZE}
              onChange={handleChange}
              placeholder="128000"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="VITE_AZURE_OPENAI_API_BATCH_SIZE" className="block text-sm font-medium text-gray-700">
              BATCH SIZE <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="VITE_AZURE_OPENAI_API_BATCH_SIZE"
              name="VITE_AZURE_OPENAI_API_BATCH_SIZE"
              value={formData.VITE_AZURE_OPENAI_API_BATCH_SIZE}
              onChange={handleChange}
              placeholder="Batch range preferd between 1 with 10k token and 10 with 128K"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <button
              type="submit"
              onClick={() => setSubmitAction('save')}
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Save Configuration
            </button>
            <button
              type="submit"
              onClick={() => setSubmitAction('test')}
              disabled={testing}
              className={`px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 flex items-center ${testing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {testing && (
                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 01-8 8z" />
                </svg>
              )}
              Test Connection
            </button>
          </div>
        </form>
      </div>

      {/* Only show Test Connection Response if there is no error in apiResponse */}
      {apiResponse && !apiResponse.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full relative">
            <h3 className="text-xl font-bold mb-4 text-blue-600">Test Connection Response</h3>
            <div className="bg-gray-100 rounded p-4 text-base text-gray-800 mb-4 flex items-center gap-2" style={{ wordBreak: 'break-word' }}>
              <span>
                {apiResponse?.choices?.[0]?.message?.content
                  ? apiResponse.choices[0].message.content
                  : 'Connection succeeded, but no response content was returned by the API.'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                onClick={() => setApiResponse(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigForm;
