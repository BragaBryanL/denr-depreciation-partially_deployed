import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import AssetForm from "./AssetForm";
import StatsCards from "./StatsCards";
import NotificationContainer from "./components/Notification";
import { showNotification, showConfirmDialog } from "./utils/notificationHelpers";
import * as XLSX from "xlsx";
import { downloadCOAFile, generateCOAHTML } from "./coaGenerator";
import { saveAsset, getAssets, updateAsset, deleteAsset } from "./firebase";

import { 
  ClipboardDocumentListIcon, 
  ClipboardDocumentIcon, 
  ChartBarIcon, 
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentChartBarIcon,
  CheckIcon,
  XMarkIcon,
  TableCellsIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  PrinterIcon,
  ShareIcon
} from "@heroicons/react/24/outline";

export default function AssetManagement() {
  // State management
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]); // Initialize as empty array
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterPPEClass, setFilterPPEClass] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [transferForm, setTransferForm] = useState({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });
  const [disposalForm, setDisposalForm] = useState({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });
  const [assetHistory, setAssetHistory] = useState([]);
  const [depreciationLog, setDepreciationLog] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [showAssetHistory, setShowAssetHistory] = useState(false);
  const [showDepreciationLog, setShowDepreciationLog] = useState(false);
  const [showTransferRecords, setShowTransferRecords] = useState(false);
  const [showDisposalRecords, setShowDisposalRecords] = useState(false);
  const [showGenerateCOA, setShowGenerateCOA] = useState(false);
  const [coAsset, setCOAsset] = useState(null);

  const printRef = useRef(null);

  // Production detection
  const isProduction = import.meta.env.PROD || !window.location.hostname.includes('localhost');

  // Fetch assets from Firebase in production, local server in development
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isProduction) {
        // Production mode - use Firebase
        console.log('Running in production mode - using Firebase');
        
        try {
          const result = await getAssets();
          console.log('Firebase result:', result);
          
          if (result.success) {
            // Transform Firebase data to match your app's expected format
            const transformedAssets = (result.data || []).map(asset => ({
              id: asset.id,
              propertyNumber: asset.propertyNumber || '',
              entityName: asset.entityName || asset.asset_name || '',
              assetType: asset.assetType || asset.asset_type || 'Equipment',
              location: asset.location || '',
              office: asset.location || '',
              status: asset.status || 'Active',
              dateAcquired: asset.dateAcquired || asset.createdAt?.split('T')[0],
              originalCost: asset.originalCost || asset.purchase_cost || 0,
              current_value: asset.current_value || asset.originalCost || asset.purchase_cost || 0,
              usefulLife: asset.usefulLife || 5,
              depreciationRate: asset.depreciationRate || 0,
              depreciableAmount: asset.depreciableAmount || 0,
              annualDepreciation: asset.annualDepreciation || 0,
              accumulatedDepreciation: asset.accumulatedDepreciation || 0,
              netBookValue: asset.netBookValue || asset.current_value || asset.originalCost || asset.purchase_cost || 0,
              remarks: asset.remarks || asset.description || '',
              selected: false,
              created_at: asset.createdAt,
              updated_at: asset.updatedAt
            }));
            
            console.log('Transformed assets:', transformedAssets);
            setAssets(transformedAssets);
            setSelectedAssets([]);
          } else {
            console.error('Firebase error:', result.error);
            setError(`Failed to load assets from database: ${result.error}`);
          }
        } catch (firebaseError) {
          console.error('Firebase connection error:', firebaseError);
          setError('Failed to connect to Firebase database. Please check your configuration.');
        }
      } else {
        // Development mode - connect to local server
        try {
          const response = await fetch("http://localhost:4000/api/assets");
          if (response.ok) {
            const data = await response.json();
            setAssets(data);
            const selectedIds = (data || []).filter(a => a.selected).map(a => a.id);
            setSelectedAssets(selectedIds);
          } else {
            setError("Failed to fetch assets from local server");
          }
        } catch (err) {
          setError("Cannot connect to server. Make sure the server is running on port 4000.");
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchAssets:', err);
      setError('An unexpected error occurred while loading assets.');
      setLoading(false);
    }
  };

  // Simple placeholder for other functions to avoid build errors
  const fetchAllData = async () => {
    if (isProduction) {
      // Production mode - use empty data for now
      console.log('Production mode - using empty data for history/depreciation/transfers/disposals');
      setAssetHistory([]);
      setDepreciationLog([]);
      setTransfers([]);
      setDisposals([]);
    } else {
      // Development mode - connect to local server
      try {
        const [historyRes, depreciationRes, transfersRes, disposalsRes] = await Promise.all([
          fetch("http://localhost:4000/api/history"),
          fetch("http://localhost:4000/api/depreciation-log"),
          fetch("http://localhost:4000/api/transfers"),
          fetch("http://localhost:4000/api/disposals")
        ]);
        
        if (historyRes.ok) setAssetHistory(await historyRes.json());
        if (depreciationRes.ok) setDepreciationLog(await depreciationRes.json());
        if (transfersRes.ok) setTransfers(await transfersRes.json());
        if (disposalsRes.ok) setDisposals(await disposalsRes.json());
      } catch {
        console.error("Error fetching data");
      }
    }
  };

  // Helper functions
  const handleSelectAsset = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowAddForm(true);
  };

  const handleDeleteAsset = (assetId) => {
    showConfirmDialog(
      "Are you sure you want to delete this asset? This action cannot be undone.",
      async () => {
        try {
          const result = await deleteAsset(assetId);
          if (result.success) {
            showNotification("Asset deleted successfully!", "success");
            await fetchAssets();
          } else {
            showNotification("Failed to delete asset", "error");
          }
        } catch (error) {
          showNotification("Error deleting asset", "error");
        }
      }
    );
  };

  // Constants
  const ITEMS_PER_PAGE = 10;

  // Load data on component mount
  useEffect(() => {
    fetchAssets();
    fetchAllData();
  }, []);

  // Filter assets based on search and filters
  useEffect(() => {
    let filtered = assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        (asset.propertyNumber && asset.propertyNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.entityName && asset.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.assetType && asset.assetType.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
      const matchesOffice = filterOffice === 'all' || asset.office === filterOffice;
      const matchesPPEClass = filterPPEClass === 'all' || asset.assetType === filterPPEClass;
      
      return matchesSearch && matchesStatus && matchesOffice && matchesPPEClass;
    });
    
    setFilteredAssets(filtered);
  }, [assets, searchTerm, filterStatus, filterOffice, filterPPEClass]);

  // Delete function using Firebase
  const deleteSelectedAssets = async () => {
    if (selectedAssets.length === 0) {
      showNotification("No assets selected to delete.", "warning");
      return;
    }
    
    showConfirmDialog(
      `Are you sure you want to delete ${selectedAssets.length} asset(s)? This action cannot be undone.`,
      async () => {
        let successCount = 0;
        for (const id of selectedAssets) {
          try {
            const result = await deleteAsset(id);
            if (result.success) {
              successCount++;
            } else {
              console.error("Error deleting asset:", id);
            }
          } catch (err) {
            console.error("Error deleting asset:", id, err);
          }
        }
        
        setSelectedAssets([]);
        await fetchAssets();
        
        if (successCount > 0) {
          showNotification(`Successfully deleted ${successCount} asset(s).`, "success");
        } else {
          showNotification("Failed to delete assets. Please try again.", "error");
        }
      }
    );
  };

  // Rest of the component would be the same as your original App.jsx
  // For now, this is a clean working version with Firebase integration

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading assets...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content - Only show when not loading */}
        {!loading && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-bold text-green-800">DENR-PENRO</h1>
                <p className="text-gray-600">Property, Plant & Equipment Depreciation System</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105">
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  Import File
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                    onChange={() => {}}
                    className="hidden" 
                  />
                </label>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add New Property
                </button>
              </div>
            </div>

            <StatsCards 
              assets={assets}
              totalAssets={assets.length}
              totalValue={assets.reduce((sum, asset) => sum + (parseFloat(asset.current_value) || 0), 0)}
            />

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Disposed">Disposed</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <select
                    value={filterOffice}
                    onChange={(e) => setFilterOffice(e.target.value)}
                    className="px-4 py-2 border border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Offices</option>
                    <option value="PENRO">PENRO</option>
                    <option value="CENRO">CENRO</option>
                    <option value="INITAO">INITAO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAssets((filteredAssets || []).map(a => a.id));
                            } else {
                              setSelectedAssets([]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-blue-500 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                        Property #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PPE Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Acquired
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Original Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssets && filteredAssets.slice(0, ITEMS_PER_PAGE).map((asset, index) => (
                      <tr key={asset.id} className={asset.selected ? "bg-blue-50" : "hover:bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={asset.selected || selectedAssets.includes(asset.id)}
                            onChange={() => handleSelectAsset(asset.id)}
                            className="h-4 w-4 text-blue-600 border-blue-500 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {asset.propertyNumber || `IMP-${index + 1}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {asset.entityName || 'No entity name'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {asset.assetType || 'Equipment'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {asset.office || 'Main Office'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {asset.dateAcquired || 'No date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₱{parseFloat(asset.originalCost || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₱{parseFloat(asset.current_value || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            asset.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            asset.status === 'Disposed' ? 'bg-red-100 text-red-800' : 
                            asset.status === 'In Repair' ? 'bg-yellow-100 text-yellow-800' : 
                            asset.status === 'Lost' ? 'bg-gray-100 text-gray-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {asset.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAsset(asset)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {(!filteredAssets || filteredAssets.length === 0) && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-400">
                    <ArchiveBoxIcon className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || filterStatus !== 'all' || filterOffice !== 'all' || filterPPEClass !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'Get started by adding your first asset'}
                  </p>
                  {!searchTerm && filterStatus === 'all' && filterOffice === 'all' && filterPPEClass === 'all' && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      <PlusIcon className="w-5 h-5 inline mr-2" />
                      Add Your First Asset
                    </button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {filteredAssets && filteredAssets.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center mt-4 gap-2">
                  <button
                    onClick={() => setShowAllAssets(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Show All Assets ({filteredAssets.length})
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={deleteSelectedAssets}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                disabled={selectedAssets.length === 0}
              >
                <TrashIcon className="w-5 h-5" />
                Delete Selected ({selectedAssets.length})
              </button>
            </div>

            {/* Additional Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setShowAssetHistory(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <ClipboardDocumentListIcon className="w-5 h-5" />
                Asset History
                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  {assetHistory.length} records
                </span>
              </button>
              <button
                onClick={() => setShowDepreciationLog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <DocumentChartBarIcon className="w-5 h-5" />
                Depreciation Log
                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  {depreciationLog.length} records
                </span>
              </button>
              <button
                onClick={() => setShowTransferRecords(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <ArrowsRightLeftIcon className="w-5 h-5" />
                Transfer Records
                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  {transfers.length} records
                </span>
              </button>
              <button
                onClick={() => setShowDisposalRecords(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <ArchiveBoxIcon className="w-5 h-5" />
                Disposal Records
                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                  {disposals.length} records
                </span>
              </button>
            </div>

            {/* Generate COA Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setShowGenerateCOA(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                <PrinterIcon className="w-5 h-5" />
                Generate COA Form
              </button>
            </div>
          </>
        )}

        {/* Modals */}
        {showAddForm && (
          <AssetForm 
            asset={editingAsset}
            onAssetSaved={() => {
              setShowAddForm(false);
              setEditingAsset(null);
              fetchAssets();
            }}
            onCancel={() => {
              setShowAddForm(false);
              setEditingAsset(null);
            }}
          />
        )}

        {showAssetHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Asset History</h2>
                <button
                  onClick={() => setShowAssetHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-60">
                {assetHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">No asset history available.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(assetHistory || []).map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.performed_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {showDepreciationLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Depreciation Log</h2>
                <button
                  onClick={() => setShowDepreciationLog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-60">
                {depreciationLog.length === 0 ? (
                  <p className="text-gray-500 text-center">No depreciation records available.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Book Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Depreciation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accumulated Depreciation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Book Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(depreciationLog || []).map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.asset_name || 'Unknown Asset'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{parseFloat(entry.opening_book_value || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{parseFloat(entry.annual_depreciation || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{parseFloat(entry.accumulated_depreciation || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{parseFloat(entry.closing_book_value || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {showTransferRecords && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Transfer Records</h2>
                <button
                  onClick={() => setShowTransferRecords(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-60">
                {transfers.length === 0 ? (
                  <p className="text-gray-500 text-center">No transfer records available.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Office</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Office</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transfers || []).map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.transfer_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.asset_name || 'Unknown Asset'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.from_office}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.to_office}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.transfer_reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {showDisposalRecords && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Disposal Records</h2>
                <button
                  onClick={() => setShowDisposalRecords(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-60">
                {disposals.length === 0 ? (
                  <p className="text-gray-500 text-center">No disposal records available.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proceeds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(disposals || []).map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.disposal_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.asset_name || 'Unknown Asset'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.disposal_method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.disposal_reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₱{parseFloat(entry.proceeds || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {showGenerateCOA && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Generate COA Form</h2>
                <button
                  onClick={() => setShowGenerateCOA(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-500">COA generation feature coming soon!</p>
              </div>
            </div>
          </div>
        )}

        <NotificationContainer />
      </div>
    </div>
  );
}
