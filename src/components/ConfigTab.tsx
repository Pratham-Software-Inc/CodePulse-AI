import React from 'react';
import { useNavigate } from 'react-router-dom';

const ConfigTab: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-4 right-4 z-10">
      <button
        onClick={() => navigate('/config')}
        className="group relative inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
        aria-label="Open Config"
      >
        <span className="text-lg mr-2 text-gray-500 group-hover:text-gray-700 transition-colors">⚙️</span>
        <span>OpenAI Configuration</span>

        {/* Enhanced Tooltip */}
        {/* Hover tooltip removed as requested */}
      </button>
    </div>
  );
};

export default ConfigTab;
