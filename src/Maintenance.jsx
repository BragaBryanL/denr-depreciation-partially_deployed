import React from 'react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-orange-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-orange-800 mb-2">System Under Maintenance</h1>
          <p className="text-orange-600 text-lg">DENR-PENRO Property Depreciation System</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-orange-800 mb-3">We're currently working on improvements</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Property, Plant & Equipment Depreciation System is currently undergoing scheduled maintenance to improve performance and add new features. We apologize for any inconvenience this may cause.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">What's being updated?</h3>
              <ul className="text-gray-700 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">-</span>
                  <span>System performance optimization</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">-</span>
                  <span>Enhanced security features</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">-</span>
                  <span>New reporting capabilities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">-</span>
                  <span>Improved user interface</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Expected completion</h3>
              <div className="text-gray-700 space-y-3">
                <p>
                  <strong>Estimated downtime:</strong> 2-4 hours
                </p>
                <p>
                  <strong>Started:</strong> {new Date().toLocaleString()}
                </p>
                <p>
                  <strong>Expected back:</strong> {new Date(Date.now() + 3 * 60 * 60 * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">During maintenance:</h3>
            <ul className="text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">-</span>
                <span>You may experience temporary service interruptions</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">-</span>
                <span>Some features may be unavailable</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">-</span>
                <span>Data synchronization may be delayed</span>
              </li>
            </ul>
          </div>

          </div>
      </div>
    </div>
  );
};

export default Maintenance;
