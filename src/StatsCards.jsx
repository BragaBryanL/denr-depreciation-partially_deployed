export default function StatsCards({ assets = [], loading = false }) {
  // Calculate real statistics from assets
  const totalAssets = assets.length;
  const totalCost = assets.reduce((sum, asset) => sum + (parseFloat(asset.totalCost) || 0), 0);
  const totalDepreciation = assets.reduce((sum, asset) => sum + (parseFloat(asset.accumulatedDepreciation) || 0), 0);
  const totalNetBookValue = assets.reduce((sum, asset) => sum + (parseFloat(asset.netBookValue) || 0), 0);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white shadow-lg rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Assets */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 shadow-lg rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-green-100">Total Assets</h3>
        <p className="text-3xl font-bold mt-2">{totalAssets}</p>
        <p className="text-xs text-green-200 mt-1">Registered properties</p>
      </div>

      {/* Total Acquisition Cost */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-blue-100">Total Acquisition Cost</h3>
        <p className="text-2xl font-bold mt-2">{formatCurrency(totalCost)}</p>
        <p className="text-xs text-blue-200 mt-1">Original cost</p>
      </div>

      {/* Total Accumulated Depreciation */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-amber-100">Accumulated Depreciation</h3>
        <p className="text-2xl font-bold mt-2">{formatCurrency(totalDepreciation)}</p>
        <p className="text-xs text-amber-200 mt-1">Total depreciation</p>
      </div>

      {/* Net Book Value */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg rounded-lg p-6 text-white">
        <h3 className="text-sm font-semibold text-teal-100">Net Book Value</h3>
        <p className="text-2xl font-bold mt-2">{formatCurrency(totalNetBookValue)}</p>
        <p className="text-xs text-teal-200 mt-1">Current value</p>
      </div>
    </div>
  );
}
