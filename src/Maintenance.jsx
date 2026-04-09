import React from 'react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-green-200 flex items-center justify-center px-4 overflow-hidden">
      {/* Environment Animation Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Trees */}
        <div className="absolute bottom-0 left-10 w-16 h-32 bg-green-600 rounded-t-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-0 left-32 w-20 h-40 bg-green-700 rounded-t-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 right-16 w-24 h-36 bg-green-600 rounded-t-full opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 right-40 w-16 h-28 bg-green-700 rounded-t-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Mountains */}
        <div className="absolute bottom-0 left-1/4 w-48 h-64 bg-gray-400 rounded-t-full opacity-30 transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-56 h-72 bg-gray-500 rounded-t-full opacity-25 transform translate-x-1/2"></div>
        
        {/* Clouds */}
        <div className="absolute top-20 left-20 w-24 h-12 bg-white rounded-full opacity-60 animate-bounce" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-32 right-32 w-32 h-16 bg-white rounded-full opacity-50 animate-bounce" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute top-16 left-1/2 w-28 h-14 bg-white rounded-full opacity-55 animate-bounce" style={{ animationDuration: '9s', animationDelay: '1s' }}></div>
        
        {/* Birds */}
        <div className="absolute top-40 left-40 text-gray-700 text-2xl animate-pulse" style={{ animationDuration: '3s' }}>V</div>
        <div className="absolute top-36 right-48 text-gray-600 text-xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }}>V</div>
        <div className="absolute top-44 left-1/3 text-gray-700 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>V</div>
        
        {/* Sun */}
        <div className="absolute top-16 right-20 w-16 h-16 bg-yellow-400 rounded-full opacity-80 animate-pulse shadow-lg"></div>
        
        {/* Flowers */}
        <div className="absolute bottom-8 left-24 w-4 h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
        <div className="absolute bottom-12 right-28 w-3 h-3 bg-yellow-300 rounded-full animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-6 left-1/2 w-4 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDuration: '2.2s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-10 right-16 w-3 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full bg-white bg-opacity-90 backdrop-blur-sm rounded-3xl shadow-2xl p-12 border border-green-300">
        <div className="text-center">
          {/* Animated Leaf Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce" style={{ animationDuration: '3s' }}>
            <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
            </svg>
          </div>
          
          <h1 className="text-5xl font-bold text-green-800 mb-4 animate-pulse" style={{ animationDuration: '2s' }}>
            System Under Maintenance
          </h1>
          
          <p className="text-green-600 text-xl mb-8">
            DENR-PENRO Property Depreciation System
          </p>
          
          {/* Simple Environment Message */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              We're working to improve our system to better serve our environment and community.
              Thank you for your patience during this maintenance period.
            </p>
          </div>
          
          {/* Animated Environment Elements */}
          <div className="mt-8 flex justify-center space-x-8">
            <div className="text-green-600 text-4xl animate-bounce" style={{ animationDuration: '2s' }}> trees</div>
            <div className="text-blue-600 text-4xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}> water</div>
            <div className="text-yellow-600 text-4xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}> sun</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
