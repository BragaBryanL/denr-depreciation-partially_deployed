import { useState, useEffect, useRef } from "react";

import Navbar from "./Navbar";

import AssetForm from "./AssetForm";

import StatsCards from "./StatsCards";

import NotificationContainer from "./components/Notification";

import { showNotification, showConfirmDialog } from "./utils/notificationHelpers";

import { getAssets, saveAsset, updateAsset, deleteAsset as deleteAssetFromFirebase, forceDeleteAssets, deleteSpecificAssets, subscribeToAssets, subscribeToAssetHistory, subscribeToDepreciationLog, subscribeToTransfers, subscribeToDisposals, getAssetHistory, getDepreciationLog, getTransfers, getDisposals } from "./firebase";

import * as XLSX from "xlsx";

import { downloadCOAFile, generateCOAHTML } from "./coaGenerator";

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

  ArrowPathIcon

} from "@heroicons/react/24/outline";



export default function App() {

  const [assets, setAssets] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [editingAsset, setEditingAsset] = useState(null);

  const [selectedAssets, setSelectedAssets] = useState([]);

  

  // Notification states

  const [notifications, setNotifications] = useState([]);

  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null, onCancel: null });

  // Track when deletion is in progress to prevent real-time listener interference
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Track recent local updates to prevent real-time listener from overwriting them
  const [recentLocalUpdates, setRecentLocalUpdates] = useState(new Set());

  

  // Modal states

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showDepreciationModal, setShowDepreciationModal] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);

  const [showDisposalModal, setShowDisposalModal] = useState(false);

  const [showCOAModal, setShowCOAModal] = useState(false);

  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  

  // Data states

  const [assetHistory, setAssetHistory] = useState([]);

  const [depreciationLog, setDepreciationLog] = useState([]);

  const [transfers, setTransfers] = useState([]);

  const [disposals, setDisposals] = useState([]);

  const [coAsset, setCoAsset] = useState(null);

  

  // Pagination for Asset History modal

  const [historyModalPage, setHistoryModalPage] = useState(1);

  const [historyModalPageSize] = useState(10);



  // Pagination for Depreciation Log modal

  const [depreciationModalPage, setDepreciationModalPage] = useState(1);

  const [depreciationModalPageSize] = useState(10);



  // Pagination for Transfer Records modal

  const [transferModalPage, setTransferModalPage] = useState(1);

  const [transferModalPageSize] = useState(10);



  // Pagination for Disposal Records modal

  const [disposalModalPage, setDisposalModalPage] = useState(1);

  const [disposalModalPageSize] = useState(10);

  

  // Form states

  const [transferForm, setTransferForm] = useState({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });

  const [disposalForm, setDisposalForm] = useState({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });

  

  const printRef = useRef(null);

  // Production detection
  const isProduction = import.meta.env.PROD || !window.location.hostname.includes('localhost');

  // Fetch assets from Firebase in production, local server in development
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isProduction) {
        // Production mode - use localStorage with cross-device sync
        console.log('Production mode - using localStorage with cross-device sync');
        
        // Skip Firebase fetch if we're currently updating status to prevent overwrites
        if (isUpdatingStatus) {
          console.log('Skipping Firebase fetch during status update');
          const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
          if (localAssets.length > 0) {
            const transformedLocalAssets = localAssets.map(asset => ({
              id: asset.id,
              propertyNumber: asset.propertyNumber || '',
              entityName: asset.entityName || '',
              location: asset.office || '',
              office: asset.office || '',
              accountableOfficer: asset.accountableOfficer || '',
              status: asset.status || 'Active',
              dateAcquired: asset.dateAcquired,
              originalCost: asset.originalCost || asset.unitCost || 0,
              current_value: asset.current_value || asset.netBookValue || asset.unitCost || 0,
              usefulLife: asset.usefulLife || 5,
              depreciationRate: asset.depreciationRate || 0,
              depreciableAmount: asset.depreciableAmount || 0,
              annualDepreciation: asset.annualDepreciation || 0,
              accumulatedDepreciation: asset.accumulatedDepreciation || 0,
              netBookValue: asset.netBookValue || asset.unitCost || 0,
              remarks: asset.remarks || '',
              description: asset.description || '',
              ppeClass: asset.ppeClass || '',
              accountCode: asset.accountCode || '',
              quantity: asset.quantity || 1,
              unitCost: asset.unitCost || 0,
              totalCost: asset.totalCost || 0,
              residualValue: asset.residualValue || 0,
              reference: asset.reference || '',
              receipt: asset.receipt || '',
              fundCluster: asset.fundCluster || '',
              selected: false,
              created_at: asset.createdAt,
              updated_at: asset.updatedAt
            }));
            
            console.log('Loaded from localStorage during status update:', transformedLocalAssets.length, 'assets');
            setAssets(transformedLocalAssets);
            setSelectedAssets([]);
            setError(null);
          } else {
            setError('No assets found. Please import some assets to get started.');
          }
          setLoading(false);
          return;
        }
        
        // Use localStorage with cross-device synchronization
        const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
        if (localAssets.length > 0) {
          const transformedLocalAssets = localAssets.map(asset => ({
            id: asset.id,
            propertyNumber: asset.propertyNumber || '',
            entityName: asset.entityName || '',
            location: asset.office || '',
            office: asset.office || '',
            accountableOfficer: asset.accountableOfficer || '',
            status: asset.status || 'Active',
            dateAcquired: asset.dateAcquired,
            originalCost: asset.originalCost || asset.unitCost || 0,
            current_value: asset.current_value || asset.netBookValue || asset.unitCost || 0,
            usefulLife: asset.usefulLife || 5,
            depreciationRate: asset.depreciationRate || 0,
            depreciableAmount: asset.depreciableAmount || 0,
            annualDepreciation: asset.annualDepreciation || 0,
            accumulatedDepreciation: asset.accumulatedDepreciation || 0,
            netBookValue: asset.netBookValue || asset.unitCost || 0,
            remarks: asset.remarks || '',
            description: asset.description || '',
            ppeClass: asset.ppeClass || '',
            accountCode: asset.accountCode || '',
            quantity: asset.quantity || 1,
            unitCost: asset.unitCost || 0,
            totalCost: asset.totalCost || 0,
            residualValue: asset.residualValue || 0,
            reference: asset.reference || '',
            receipt: asset.receipt || '',
            fundCluster: asset.fundCluster || '',
            selected: false,
            created_at: asset.createdAt,
            updated_at: asset.updatedAt
          }));
          
          console.log('Loaded from localStorage:', transformedLocalAssets.length, 'assets');
          setAssets(transformedLocalAssets);
          setSelectedAssets([]);
          setError(null);
        } else {
          setError('No assets found. Please import some assets to get started.');
        }
        
        // Cross-device sync: Check Firebase for newer data and merge with localStorage
        if (isProduction) {
          try {
            const result = await getAssets();
            if (result.success && result.data.length > 0) {
              console.log('Cross-device sync: Firebase has newer data');
              const firebaseAssets = result.data;
              
              // Merge Firebase data with localStorage data
              const mergedAssets = [...firebaseAssets];
              
              // Add localStorage assets that aren't in Firebase
              localAssets.forEach(localAsset => {
                if (!firebaseAssets.find(fa => fa.id === localAsset.id)) {
                  mergedAssets.push(localAsset);
                }
              });
              
              // Save merged data to localStorage and update state
              localStorage.setItem('denr_assets', JSON.stringify(mergedAssets));
              setAssets(mergedAssets);
              console.log('Cross-device sync completed: Total assets:', mergedAssets.length);
            }
          } catch (error) {
            console.log('Cross-device sync failed:', error);
          }
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


  const fetchAllData = async () => {
    try {
      if (isProduction) {
        // Production mode - using localStorage to prevent Accountable Officer field from vanishing
        console.log('Production mode - using localStorage to prevent Accountable Officer field overwrites');
        
        // Fetch from Firebase collections
        try {
          const [historyRes, depreciationRes, transfersRes, disposalsRes] = await Promise.all([
            getAssetHistory(),
            getDepreciationLog(),
            getTransfers(),
            getDisposals()
          ]);
          
          if (historyRes.success) {
            setAssetHistory(historyRes.data);
            localStorage.setItem('denr_asset_history', JSON.stringify(historyRes.data));
          }
          
          if (depreciationRes.success) {
            setDepreciationLog(depreciationRes.data);
            localStorage.setItem('denr_depreciation_log', JSON.stringify(depreciationRes.data));
          }
          
          if (transfersRes.success) {
            setTransfers(transfersRes.data);
            localStorage.setItem('denr_transfers', JSON.stringify(transfersRes.data));
          }
          
          if (disposalsRes.success) {
            setDisposals(disposalsRes.data);
            localStorage.setItem('denr_disposals', JSON.stringify(disposalsRes.data));
          }
          
          console.log('Firebase asset records loaded successfully');
        } catch (error) {
          console.log('Firebase asset records failed, falling back to localStorage:', error);
          
          // Fallback to localStorage
          const history = JSON.parse(localStorage.getItem('denr_asset_history') || '[]');
          const depreciationLog = JSON.parse(localStorage.getItem('denr_depreciation_log') || '[]');
          const transfers = JSON.parse(localStorage.getItem('denr_transfers') || '[]');
          const disposals = JSON.parse(localStorage.getItem('denr_disposals') || '[]');
          
          setAssetHistory(history);
          setDepreciationLog(depreciationLog);
          setTransfers(transfers);
          setDisposals(disposals);
        }
        
      } else {
        // Development mode - use local server
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
      }
    } catch {
      console.error("Error fetching data");
    }
  };



  // Close modal on ESC key press

  useEffect(() => {

    const handleEsc = (e) => {

      if (e.key === 'Escape') {

        if (showHistoryModal) setShowHistoryModal(false);

        if (showDepreciationModal) setShowDepreciationModal(false);

        if (showTransferModal) setShowTransferModal(false);

        if (showDisposalModal) setShowDisposalModal(false);

        if (showCOAModal) setShowCOAModal(false);

        if (showAddForm) { setShowAddForm(false); setEditingAsset(null); }

      }

    };

    window.addEventListener('keydown', handleEsc);

    return () => window.removeEventListener('keydown', handleEsc);

  }, [showHistoryModal, showDepreciationModal, showTransferModal, showDisposalModal, showCOAModal, showAddForm]);



  // Toggle asset selection
  const toggleAssetSelection = async (id) => {
    const isSelected = selectedAssets.includes(id);
    const newSelected = isSelected
      ? selectedAssets.filter(aid => aid !== id)
      : [...selectedAssets, id];
    
    setSelectedAssets(newSelected);
    
    // In production, we don't need to update Firebase for selection state
    // In development, update the local server
    if (!isProduction) {
      try {
        await fetch(`http://localhost:4000/api/assets/${id}/select`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected: !isSelected })
        });
      } catch {
        console.error("Error updating selection");
      }
    }
  };



  // Select all assets

  const selectAllAssets = async () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
      // Only clear selections on local server in development
      if (!isProduction) {
        try {
          const response = await fetch("http://localhost:4000/api/assets/clear-selections", { method: "PUT" });
          const result = await response.json();
          console.log("Clear selections response:", result);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          console.error("Error clearing selections:", error);
        }
      }
    } else {
      const allIds = (filteredAssets || []).map(a => a.id);
      setSelectedAssets(allIds);
      
      // Only update selections on local server in development
      if (!isProduction) {
        for (const asset of filteredAssets) {
          try {
            await fetch(`http://localhost:4000/api/assets/${asset.id}/select`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ selected: true })
            });
          } catch {
            console.error("Error selecting asset");
          }
        }
      }
    }
  };



  // Cleanup problematic assets
  const cleanupProblematicAssets = async () => {
    const problematicIds = ['ewGZ9wnW7x0PGZiwZEvL', 'uCjOaf9wYA45Oa1jgsP4'];
    
    try {
      console.log('Cleaning up problematic assets:', problematicIds);
      const result = await forceDeleteAssets(problematicIds);
      
      if (result.success) {
        console.log('Force delete results:', result.results);
        
        // Also remove from localStorage
        const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
        const filteredAssets = localAssets.filter(asset => !problematicIds.includes(asset.id));
        localStorage.setItem('denr_assets', JSON.stringify(filteredAssets));
        setAssets(filteredAssets);
        
        showNotification('Problematic assets cleaned up successfully!', 'success');
      }
    } catch (error) {
      console.error('Error cleaning up assets:', error);
    }
  };

  // Delete asset
  const deleteAsset = async (id) => {
    showConfirmDialog(
      "Are you sure you want to delete this asset? This action cannot be undone.",
      async () => {
        try {
          let success = false;
          
          if (isProduction) {
            // Production mode - more aggressive deletion approach
            console.log('Deleting from Firebase:', id);
            setIsDeleting(true); // Prevent real-time listener interference
            
            // First, try to delete from Firebase with retries
            let firebaseResult = await deleteAssetFromFirebase(id);
            
            // If Firebase fails due to network issues, try again up to 3 times
            if (!firebaseResult.success) {
              console.log('Firebase delete failed, retrying...', id);
              for (let attempt = 1; attempt <= 3; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait 1s, 2s, 3s
                firebaseResult = await deleteAssetFromFirebase(id);
                if (firebaseResult.success) {
                  console.log(`Firebase delete successful on attempt ${attempt}:`, id);
                  break;
                }
              }
            }
            
            // Always delete from localStorage regardless of Firebase status
            const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
            const updatedAssets = localAssets.filter(asset => asset.id !== id);
            localStorage.setItem('denr_assets', JSON.stringify(updatedAssets));
            
            // Update UI immediately
            setAssets(updatedAssets);
            
            // Force remove from selected assets if present
            setSelectedAssets(prev => prev.filter(selectedId => selectedId !== id));
            
            if (firebaseResult.success) {
              console.log('Firebase delete successful for:', id);
              showNotification("Asset deleted successfully!", "success");
              
              // Wait a bit longer before re-enabling real-time listener
              setTimeout(() => {
                setIsDeleting(false);
                console.log('Re-enabling real-time listener after successful deletion');
              }, 3000);
            } else {
              console.log('Firebase delete failed but localStorage deletion completed for:', id);
              showNotification("Asset deleted locally. Cloud sync may be delayed due to connection issues.", "warning");
              
              // Re-enable real-time listener after warning
              setTimeout(() => {
                setIsDeleting(false);
                console.log('Re-enabling real-time listener after failed deletion');
              }, 2000);
            }
          } else {
            // Development mode - use local server
            const response = await fetch(`http://localhost:4000/api/assets/${id}`, {
              method: "DELETE"
            });
            success = response.ok;
            
            if (success) {
              showNotification("Asset deleted successfully!", "success");
              fetchAssets();
            } else {
              showNotification("Failed to delete asset. Please check your connection.", "error");
            }
          }
        } catch (error) {
          console.error("Error deleting asset:", error);
          showNotification("Error deleting asset. Please try again.", "error");
        } finally {
          // Always reset deletion state
          setIsDeleting(false);
        }
      }
    );
  };

  // Toggle asset status between Serviceable and Unserviceable (with confirmation)
  const toggleAssetStatus = async (asset) => {
    const currentStatus = asset.status || 'Active';
    const newStatus = currentStatus === 'Serviceable' ? 'Unserviceable' : 'Serviceable';
    
    showConfirmDialog(
      `Are you sure you want to change the status from "${currentStatus}" to "${newStatus}"?`,
      async () => {
        try {
          let success = false;
          
          if (isProduction) {
            // Production mode - update in Firebase
            const updatedAsset = { ...asset, status: newStatus };
            const result = await updateAsset(asset.id, updatedAsset);
            success = result.success;
          } else {
            // Development mode - use local server
            const response = await fetch(`http://localhost:4000/api/assets/${asset.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...asset, status: newStatus })
            });
            success = response.ok;
          }
          
          if (success) {
            showNotification(`Asset status changed to ${newStatus}!`, "success");
            fetchAssets();
          } else {
            showNotification("Failed to update asset status. Please try again.", "error");
          }
        } catch (error) {
          console.error("Error updating asset status:", error);
          showNotification("Error updating asset status. Please try again.", "error");
        }
      }
    );
  };

  // Toggle asset status immediately without confirmation
  const toggleAssetStatusImmediate = async (asset) => {
    const currentStatus = asset.status || 'Active';
    const newStatus = currentStatus === 'Serviceable' ? 'Unserviceable' : 'Serviceable';
    
    showNotification(`Asset status changed to ${newStatus}!`, "success");
    
    // DIRECT DOM MANIPULATION - Force the status to change immediately
    setTimeout(() => {
      // Find all table cells containing status
      const statusCells = document.querySelectorAll('td');
      statusCells.forEach(cell => {
        if (cell.textContent && cell.textContent.includes(currentStatus)) {
          // Check if this cell is in the same row as our asset
          const row = cell.closest('tr');
          if (row) {
            const propertyNumberCell = row.querySelector('td:nth-child(2)');
            if (propertyNumberCell && propertyNumberCell.textContent.includes(asset.propertyNumber)) {
              // Found the correct row, update the status
              cell.textContent = newStatus;
            }
          }
        }
      });
    }, 100);
    
    // Update React state (this might not work but let's try)
    const updatedAssets = assets.map(a => 
      a.id === asset.id ? { ...a, status: newStatus } : a
    );
    setAssets([...updatedAssets]);
    
    // Update localStorage
    const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
    const updatedLocalAssets = localAssets.map(a => 
      a.id === asset.id ? { ...a, status: newStatus } : a
    );
    localStorage.setItem('denr_assets', JSON.stringify(updatedLocalAssets));
    
    // Force re-render by changing a dummy state
    setTimeout(() => {
      setAssets([...updatedAssets]);
    }, 200);
    
    // Handle Firebase in background
    try {
      if (isProduction) {
        const updatedAsset = {
          id: asset.id,
          propertyNumber: asset.propertyNumber || '',
          entityName: asset.entityName || '',
          location: asset.location || '',
          office: asset.office || '',
          accountableOfficer: asset.accountableOfficer || '',
          status: newStatus,
          dateAcquired: asset.dateAcquired || '',
          originalCost: Number(asset.originalCost) || 0,
          current_value: Number(asset.current_value) || 0,
          usefulLife: Number(asset.usefulLife) || 5,
          depreciationRate: Number(asset.depreciationRate) || 0,
          depreciableAmount: Number(asset.depreciableAmount) || 0,
          annualDepreciation: Number(asset.annualDepreciation) || 0,
          accumulatedDepreciation: Number(asset.accumulatedDepreciation) || 0,
          netBookValue: Number(asset.netBookValue) || 0,
          remarks: asset.remarks || '',
          description: asset.description || '',
          ppeClass: asset.ppeClass || '',
          accountCode: asset.accountCode || '',
          quantity: Number(asset.quantity) || 1,
          unitCost: Number(asset.unitCost) || 0,
          totalCost: Number(asset.totalCost) || 0,
          residualValue: Number(asset.residualValue) || 0,
          reference: asset.reference || '',
          receipt: asset.receipt || '',
          fundCluster: asset.fundCluster || '',
          selected: false,
          created_at: asset.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await updateAsset(asset.id, updatedAsset);
      }
    } catch (error) {
      console.error("Firebase error:", error);
    }
  };



  // Delete all selected assets
  const deleteSelectedAssets = async () => {
    if (selectedAssets.length === 0) {
      showNotification("No assets selected to delete.", "warning");
      return;
    }

    showConfirmDialog(
      `Are you sure you want to delete ${selectedAssets.length} asset(s)? This action cannot be undone.`,
      async () => {
        let successCount = 0;
        
        if (isProduction) {
          // Production mode - delete from Firebase first, then localStorage
          let successCount = 0;
          let failedIds = [];
          
          // Delete from Firebase first
          for (const id of selectedAssets) {
            try {
              const firebaseResult = await deleteAssetFromFirebase(id);
              if (firebaseResult.success) {
                successCount++;
                console.log('Firebase delete successful for:', id);
              } else {
                failedIds.push(id);
                console.log('Firebase delete failed for:', id);
              }
            } catch (err) {
              failedIds.push(id);
              console.log('Firebase delete error for:', id, err);
            }
          }
          
          // Now delete from localStorage for successful Firebase deletions
          const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
          const updatedAssets = localAssets.filter(asset => !failedIds.includes(asset.id) && !selectedAssets.includes(asset.id) || failedIds.includes(asset.id));
          localStorage.setItem('denr_assets', JSON.stringify(updatedAssets));
          
          console.log('Deleted from localStorage:', successCount, 'assets');
          
          // Update UI immediately
          setAssets(updatedAssets);
          setSelectedAssets([]);
          
          if (successCount > 0) {
            showNotification(`Successfully deleted ${successCount} asset(s).${failedIds.length > 0 ? ` Failed to delete ${failedIds.length} asset(s).` : ''}`, successCount === selectedAssets.length ? "success" : "warning");
          } else {
            showNotification("Failed to delete selected assets. Please try again.", "error");
          }
          
        } else {
          // Development mode - use local server
          for (const id of selectedAssets) {
            try {
              const response = await fetch(`http://localhost:4000/api/assets/${id}`, { method: "DELETE" });
              if (response.ok) successCount++;
            } catch {
              console.error("Error deleting asset:", id);
            }
          }
          
          setSelectedAssets([]);
          fetchAssets();
          fetchAllData();
          
          if (successCount > 0) {
            showNotification(`Successfully deleted ${successCount} asset(s).`, "success");
          } else {
            showNotification("Failed to delete selected assets. Please try again.", "error");
          }
        }

      },

      () => {}

    );

  };



  // Create transfer

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    
    try {
      if (isProduction) {
        // Production mode - save to localStorage
        console.log('Creating transfer record in localStorage...');
        
        const newTransfer = {
          id: Date.now().toString(),
          ...transferForm,
          createdAt: new Date().toISOString()
        };
        
        const existingTransfers = JSON.parse(localStorage.getItem('denr_transfers') || '[]');
        const updatedTransfers = [...existingTransfers, newTransfer];
        localStorage.setItem('denr_transfers', JSON.stringify(updatedTransfers));
        
        setTransfers(updatedTransfers);
        showNotification("Transfer record created successfully!", "success");
        setShowTransferModal(false);
        setTransferForm({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });
        fetchAllData();
        
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transferForm)
        });
        
        if (response.ok) {
          showNotification("Transfer record created successfully!", "success");
          setShowTransferModal(false);
          setTransferForm({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });
          fetchAssets();
          fetchAllData();
        }
      }
    } catch {
      showNotification("Error creating transfer. Please try again.", "error");
    }
  };



  // Create disposal

  const handleCreateDisposal = async (e) => {
    e.preventDefault();
    
    try {
      if (isProduction) {
        // Production mode - save to localStorage
        console.log('Creating disposal record in localStorage...');
        
        const newDisposal = {
          id: Date.now().toString(),
          ...disposalForm,
          createdAt: new Date().toISOString()
        };
        
        const existingDisposals = JSON.parse(localStorage.getItem('denr_disposals') || '[]');
        const updatedDisposals = [...existingDisposals, newDisposal];
        localStorage.setItem('denr_disposals', JSON.stringify(updatedDisposals));
        
        setDisposals(updatedDisposals);
        showNotification("Disposal record created successfully!", "success");
        setShowDisposalModal(false);
        setDisposalForm({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });
        fetchAllData();
        
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/disposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(disposalForm)
        });
        
        if (response.ok) {
          showNotification("Disposal record created successfully!", "success");
          setShowDisposalModal(false);
          setDisposalForm({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });
          fetchAssets();
          fetchAllData();
        }
      }
    } catch {
      showNotification("Error creating disposal. Please try again.", "error");
    }
  };



  // Generate depreciation log
  const handleGenerateDepreciation = async () => {
    try {
      if (isProduction) {
        // Production mode - generate and save to localStorage
        console.log('Generating depreciation log to localStorage...');
        
        // Generate depreciation entries for all assets
        const depreciationEntries = assets.map(asset => ({
          id: Date.now().toString() + '-' + asset.id,
          assetId: asset.id,
          propertyNumber: asset.propertyNumber,
          description: asset.description,
          date: new Date().toISOString().split('T')[0],
          annualDepreciation: asset.annualDepreciation || 0,
          accumulatedDepreciation: asset.accumulatedDepreciation || 0,
          netBookValue: asset.netBookValue || 0,
          createdAt: new Date().toISOString()
        }));
        
        // Save to localStorage
        const existingLog = JSON.parse(localStorage.getItem('denr_depreciation_log') || '[]');
        const updatedLog = [...existingLog, ...depreciationEntries];
        localStorage.setItem('denr_depreciation_log', JSON.stringify(updatedLog));
        
        setDepreciationLog(updatedLog);
        showNotification("Depreciation log generated successfully!", "success");
        
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/depreciation-log/generate-all", { method: "POST" });
        
        if (response.ok) {
          showNotification("Depreciation log generated successfully!", "success");
          fetchAllData();
        }
      }
    } catch {
      showNotification("Error generating depreciation log. Please try again.", "error");
    }
  };



  // Generate COA Form for single asset
  const handleGenerateCOA = async (asset) => {
    try {
      if (isProduction) {
        // Production mode - generate yearly depreciation entries and save to localStorage
        console.log('Generating yearly depreciation entries for COA...');
        
        const acquisitionDate = new Date(asset.dateAcquired);
        const currentYear = new Date().getFullYear();
        const startYear = acquisitionDate.getFullYear();
        const yearsToGenerate = Math.max(1, currentYear - startYear + 1);
        
        const yearlyDepreciationEntries = [];
        let accumulatedDepreciation = 0;
        const annualDepreciation = asset.annualDepreciation || 0;
        const originalCost = asset.originalCost || asset.unitCost || 0;
        
        // Generate yearly depreciation from acquisition year to current year
        for (let year = startYear; year <= currentYear; year++) {
          accumulatedDepreciation += annualDepreciation;
          const endingBookValue = Math.max(0, originalCost - accumulatedDepreciation);
          
          const entry = {
            id: Date.now().toString() + '-' + asset.id + '-' + year,
            assetId: asset.id,
            propertyNumber: asset.propertyNumber,
            year: year,
            annualDepreciation: annualDepreciation,
            accumulatedDepreciation: accumulatedDepreciation,
            endingBookValue: endingBookValue,
            date: `${year}-12-31`,
            createdAt: new Date().toISOString()
          };
          
          yearlyDepreciationEntries.push(entry);
        }
        
        // Save to localStorage
        const existingLog = JSON.parse(localStorage.getItem('denr_depreciation_log') || '[]');
        
        // Remove existing entries for this asset to avoid duplicates
        const filteredLog = existingLog.filter(entry => entry.assetId !== asset.id);
        
        // Add new yearly entries
        const updatedLog = [...filteredLog, ...yearlyDepreciationEntries];
        localStorage.setItem('denr_depreciation_log', JSON.stringify(updatedLog));
        
        setDepreciationLog(updatedLog);
        console.log('Generated', yearlyDepreciationEntries.length, 'yearly depreciation entries');
        
      } else {
        // Development mode - use local server
        await fetch("http://localhost:4000/api/depreciation-log/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id })
        });
        
        fetchAllData();
      }
    } catch {
      // Ignore errors
    }
    setCoAsset(asset);

    setShowDownloadOptions(false);

    setShowCOAModal(true);

  };



  // Print function

  const handlePrint = () => {

    const printContent = printRef.current;

    const printWindow = window.open('', '', 'height=600,width=800');

    printWindow.document.write('<html><head><title>COA Property Card</title>');

    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #000;padding:8px;text-align:left} th{background:#f0f0f0}</style>');

    printWindow.document.write('</head><body>');

    printWindow.document.write(printContent.innerHTML);

    printWindow.document.write('</body></html>');

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {

      printWindow.print();

      printWindow.close();

    }, 250);

  };



  // Download using template - Appendix 70 format

  const downloadWithTemplate = async () => {

    if (!coAsset) return;

    

    try {

      const response = await fetch('/Appendix 70 - PPELC.xls');

      const arrayBuffer = await response.arrayBuffer();

      

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];

      

      const depData = depreciationLog.filter(d => d.assetId === coAsset.id).sort((a, b) => a.year - b.year);

      

      worksheet['A1'] = { t: 's', v: 'Appendix 70' };

      worksheet['A2'] = { t: 's', v: 'PROPERTY, PLANT AND EQUIPMENT LEDGER CARD' };

      worksheet['A3'] = { t: 's', v: 'Entity Name:' };

      worksheet['A4'] = { t: 's', v: 'Fund Cluster:' };

      worksheet['A5'] = { t: 's', v: 'Property, Plant and Equipment:' };

      worksheet['B6'] = { t: 's', v: 'Object Account Code:' };

      worksheet['C6'] = { t: 's', v: coAsset.accountCode || '' };

      worksheet['B7'] = { t: 's', v: 'Estimated Useful Life:' };

      worksheet['C7'] = { t: 's', v: coAsset.usefulLife || '' };

      worksheet['D7'] = { t: 's', v: 'Rate of Depreciation:' };

      

      const startRow = 9;

      worksheet[`A${startRow}`] = { t: 's', v: coAsset.dateAcquired || '' };

      worksheet[`B${startRow}`] = { t: 's', v: coAsset.propertyNumber || '' };

      worksheet[`C${startRow}`] = { t: 'n', v: parseFloat(coAsset.quantity) || 1 };

      worksheet[`D${startRow}`] = { t: 'n', v: parseFloat(coAsset.unitCost) || 0 };

      worksheet[`E${startRow}`] = { t: 'n', v: parseFloat(coAsset.totalCost) || parseFloat(coAsset.unitCost) || 0 };

      worksheet[`F${startRow}`] = { t: 'n', v: 0 };

      worksheet[`I${startRow}`] = { t: 'n', v: parseFloat(coAsset.totalCost) || parseFloat(coAsset.unitCost) || 0 };

      

      let row = startRow + 1;

      depData.forEach((d) => {

        worksheet[`A${row}`] = { t: 's', v: `Depreciation ${d.year}` };

        worksheet[`B${row}`] = { t: 's', v: d.year.toString() };

        worksheet[`F${row}`] = { t: 'n', v: parseFloat(d.accumulatedDepreciation) || 0 };

        worksheet[`I${row}`] = { t: 'n', v: parseFloat(d.endingBookValue) || 0 };

        row++;

      });

      

      const excelBuffer = XLSX.write(workbook, { bookType: 'xls', type: 'array' });

      const blob = new Blob([excelBuffer], { type: 'application/vnd.ms-excel' });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;

      a.download = `PPELC_${coAsset.propertyNumber || 'export'}.xls`;

      a.click();

    } catch (err) {

      console.error("Error with template:", err);

      showNotification("Template file not found. Downloading with default format instead.", "warning");

      exportToCSV();

    }

    setShowDownloadOptions(false);

  };



  // Export to CSV

  const exportToCSV = () => {

    if (!coAsset) return;

    const data = depreciationLog.filter(d => d.assetId === coAsset.id);

    let csv = 'Property Number,Date Acquired,Description,PPE Class,Office,Account Code,Quantity,Unit Cost\n';

    csv += `${coAsset.propertyNumber || ''},${coAsset.dateAcquired || ''},${coAsset.description || ''},${coAsset.ppeClass || ''},${coAsset.office || ''},${coAsset.accountCode || ''},${coAsset.quantity || 1},${coAsset.unitCost || 0}\n\n`;

    csv += 'Year,Beginning Value,Depreciation Expense,Accumulated Depreciation,Ending Book Value\n';

    data.forEach(d => {

      csv += `${d.year},${d.beginningBookValue},${d.depreciationExpense},${d.accumulatedDepreciation},${d.endingBookValue}\n`;

    });

    const blob = new Blob([csv], { type: 'text/csv' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `COA_Property_Card_${coAsset.propertyNumber || 'export'}.csv`;

    a.click();

    setShowDownloadOptions(false);

  };



  const exportToWord = async () => {

    if (!coAsset) return;

    const depData = depreciationLog.filter(d => d.assetId === coAsset.id).sort((a, b) => a.year - b.year);

    const html = generateCOAHTML(coAsset, depData);

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `COA_${coAsset.propertyNumber || 'Property_Card'}.doc`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);

    setShowDownloadOptions(false);

  };



  const exportToPDF = () => {

    if (!coAsset || !printRef.current) return;

    

    const printContent = printRef.current.innerHTML;

    const printWindow = window.open('', '_blank');

    

    if (!printWindow) {

      showNotification("Please allow popups to download the PDF", "warning");

      return;

    }

    

    const htmlContent = `

      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="utf-8">

        <title>COA Property Card - ${coAsset.propertyNumber || 'export'}</title>

        <style>

          * { box-sizing: border-box; margin: 0; padding: 0; }

          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; padding: 10px; }

          table { border-collapse: collapse; width: 100%; }

          td, th { border: 1px solid #000; padding: 2px 4px; font-size: 9pt; }

          .text-center { text-align: center; }

          .text-right { text-align: right; }

          .font-bold { font-weight: bold; }

          .border { border: 1px solid #000; }

          .bg-gray-200 { background-color: #e5e7eb; }

          .p-1 { padding: 4px; }

          .p-2 { padding: 8px; }

          .mb-2 { margin-bottom: 8px; }

          .grid { display: grid; }

          .grid-cols-2 { grid-template-columns: 1fr 1fr; }

          .gap-4 { gap: 16px; }

          .inline-block { display: inline-block; }

          .border-b { border-bottom: 1px solid #000; }

          @page { size: landscape; margin: 0.5in; }

          @media print {

            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          }

        </style>

      </head>

      <body>

        ${printContent}

      </body>

      </html>

    `;

    

    printWindow.document.open();

    printWindow.document.write(htmlContent);

    printWindow.document.close();

    

    printWindow.onload = () => {

      printWindow.focus();

      setTimeout(() => {

        printWindow.print();

      }, 500);

    };

    

    setShowDownloadOptions(false);

  };

  // Import file handler
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');
    const isPDF = fileName.endsWith('.pdf');
    const isWord = fileName.endsWith('.doc') || fileName.endsWith('.docx');
    
    if (!isExcel && !isCSV && !isPDF && !isWord) {
      showNotification("Please upload Excel (.xlsx, .xls), CSV, PDF, or Word files.", "error");
      return;
    }

    try {
      let importedAssets = [];
      
      if (isPDF) {
        showNotification("PDF files are accepted but require manual data entry.", "info");
        showNotification("Please convert your PDF to Excel format for automatic import, or add assets manually.", "warning");
        return;
      } else if (isWord) {
        showNotification("Word import is now supported! Processing your Word file.", "info");
        try {
          console.log("Processing Word file:", file.name, file.size);
          
          const arrayBuffer = await file.arrayBuffer();
          const textDecoder = new TextDecoder('utf-8');
          const wordText = textDecoder.decode(arrayBuffer);
          
          console.log("Word raw text extracted (first 200 chars):", wordText.substring(0, 200) + "...");
          
          importedAssets = parseWordDataToAssets(wordText);
          console.log("Parsed assets:", importedAssets);
          
          if (importedAssets.length === 0) {
            showNotification("No asset data found in Word document. The document might use complex formatting.", "warning");
            return;
          }
          
          showNotification(`Found ${importedAssets.length} asset(s) in Word document.`, "success");
        } catch (err) {
          console.error("Word parsing error:", err);
          showNotification(`Word parsing failed: ${err.message}. Try converting to Excel format for best results.`, "error");
          return;
        }
      } else if (isExcel) {
        showNotification("Processing Excel file...", "info");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        console.log("Excel data loaded:", jsonData.length, "rows");
        
        importedAssets = (jsonData || []).map((row, index) => {
          const getVal = (keys) => {
            for (const key of keys) {
              if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
            }
            return null;
          };

          const getNum = (keys) => {
            for (const key of keys) {
              const val = row[key];
              if (val !== undefined && val !== null && val !== "") {
                const strVal = String(val).replace(/,/g, '').trim();
                const num = parseFloat(strVal);
                if (!isNaN(num)) return num;
              }
            }
            return null;
          };

          const getStr = (keys) => {
            for (const key of keys) {
              const val = row[key];
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                return String(val).trim();
              }
            }
            return null;
          };

          // Map columns from user's Excel format
          const propertyNo = getStr(['Property No.', 'Property No', 'Property Number', 'propertyNumber', 'Property #', 'propertyNo', 'Property Number']);
          const description = getStr(['Property Description', 'Description', 'description', 'Item Description', 'PropertyDesc', 'Property, Plant and Equipment']);
          const ppeClass = getStr(['PPE Class', 'ppeClass', 'Class', 'Asset Type']);
          const accountCode = getStr(['Account Code', 'accountCode', 'Acct Code', 'AccountCode']);
          const quantity = getNum(['Quantity', 'quantity', 'Qty', 'QTY']) || 1;
          const office = getStr(['Office', 'office', 'Location', 'Office Name', 'OfficeLocation', 'Assign Office', 'Place', 'Site', 'Department', 'Unit', 'Branch', 'Station']);
          
          // Cost fields - handle both "Unit Cost" and "Cost" columns
          const unitCost = getNum(['Unit Cost', 'unitCost', 'UnitCost', 'Cost', 'cost', 'UnitPrice', 'Purchase Cost', 'Acquisition Cost']) || 0;
          const residualValue = getNum(['Residual Value', 'residualValue', 'ResidualValue', 'Salvage Value', 'salvageValue']) || 0;
          let usefulLife = getNum(['Useful Life (Years)', 'Useful Life', 'usefulLife', 'Life', 'UsefulLife', 'Years', 'Estimated Useful Life']) || 5;
          
          // Fix useful life based on account code (Land should have no useful life)
          if (accountCode === '10601010' || accountCode === '10602020' || accountCode === '10699010' || accountCode === '10699030') {
            usefulLife = ''; // Land and Construction in Progress have no useful life
          } else if (accountCode === '10602990') {
            usefulLife = usefulLife || 20; // Other Land Improvements: 20 years
          } else if (accountCode === '10603040') {
            usefulLife = usefulLife || 15; // Water Supply Systems: 15 years
          } else if (accountCode === '10603050') {
            usefulLife = usefulLife || 20; // Power Supply Systems: 20 years
          } else if (accountCode === '10604010') {
            usefulLife = usefulLife || 30; // Buildings: 30 years
          } else if (accountCode === '10604990') {
            usefulLife = usefulLife || 20; // Other Structures: 20 years
          } else if (accountCode === '10605020' || accountCode === '10605030' || accountCode === '10605070' || accountCode === '10605090') {
            usefulLife = usefulLife || 5; // Office/ICT/Communication/Disaster Equipment: 5 years
          } else if (accountCode === '10605140') {
            usefulLife = usefulLife || 7; // Technical and Scientific Equipment: 7 years
          } else if (accountCode === '10606010') {
            usefulLife = usefulLife || 7; // Motor Vehicles: 7 years
          } else if (accountCode === '10607010') {
            usefulLife = usefulLife || 10; // Furniture and Fixtures: 10 years
          }
          
          const depreciableAmount = getNum(['Depreciable Amount', 'depreciableAmount', 'DepreciableAmount']) || 0;
          const accumulatedDepreciation = getNum(['Accumulated Depreciation', 'Accumulated Depreciation', 'accumulatedDepreciation', 'AccumulatedDepreciation', 'Accum Depr', 'Accumulated', 'Accum Dep', 'Accumulated Dep', 'Accum. Dep.', 'Accumulated']) || 0;
          const netBookValue = getNum(['Net Book Value', 'netBookValue', 'NetBookValue', 'Book Value', 'Current Value']) || 0;
          const annualDepreciation = getNum(['Annual Depreciation', 'annualDepreciation', 'AnnualDepreciation']) || 0;
          const remarks = getStr(['REM ARKS', 'Remarks', 'remarks', 'REMARKS', 'Notes', 'notes']) || "";
          
          // Date fields
          const dateAcquired = getVal(['Date Acquired', 'Date Acq', 'dateAcquired', 'DateAcquired', 'Date', 'Acquisition Date', 'Purchase Date']);
          
          // Handle date - can be a year like "2012" or full date
          let processedDate = dateAcquired;
          if (processedDate) {
            if (processedDate instanceof Date) {
              const year = processedDate.getFullYear();
              const month = String(processedDate.getMonth() + 1).padStart(2, '0');
              const day = String(processedDate.getDate()).padStart(2, '0');
              processedDate = `${year}-${month}-${day}`;
            } else if (typeof processedDate === 'number') {
              if (processedDate >= 1900 && processedDate <= 2100) {
                processedDate = processedDate.toString();
              } else {
                const excelDate = new Date((processedDate - 25569) * 86400 * 1000);
                const year = excelDate.getFullYear();
                const month = String(excelDate.getMonth() + 1).padStart(2, '0');
                const day = String(excelDate.getDate()).padStart(2, '0');
                processedDate = `${year}-${month}-${day}`;
              }
            } else if (typeof processedDate === 'string') {
              if (/^\d{4}$/.test(processedDate.trim())) {
                processedDate = processedDate.trim();
              } else {
                const dateObj = new Date(processedDate);
                if (!isNaN(dateObj.getTime())) {
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  processedDate = `${year}-${month}-${day}`;
                } else {
                  const match = processedDate.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
                  if (match) {
                    const months = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
                    const month = months[match[1]];
                    const day = parseInt(match[2]);
                    const year = parseInt(match[3]);
                    processedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  }
                }
              }
            }
          }

          // Preserve original data from Excel - no defaults or calculations
          return {
            entityName: getStr(['Entity Name', 'entityName', 'Entity']) || "DENR - PENRO",
            fundCluster: getStr(['Fund Cluster', 'fundCluster', 'Fund']) || "Regular Agency Fund",
            propertyNumber: propertyNo || `IMP-${Date.now()}-${index}`,
            office: office || "Main Office",
            ppeClass: ppeClass || "",
            description: description || "",
            accountCode: accountCode || "",
            usefulLife: usefulLife || 5,
            dateAcquired: processedDate || new Date().toISOString().split('T')[0],
            reference: getStr(['Reference', 'reference', 'Ref']) || "",
            receipt: getStr(['Receipt', 'receipt']) || "",
            quantity: quantity || 1,
            unitCost: unitCost || 0,
            totalCost: (unitCost || 0) * (quantity || 1),
            residualValue: residualValue || 0,
            depreciableAmount: depreciableAmount || 0,
            annualDepreciation: annualDepreciation || 0,
            accumulatedDepreciation: accumulatedDepreciation || 0,
            netBookValue: netBookValue || unitCost || 0,
            remarks: remarks || ""
          };
        });
      } else if (isCSV) {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          showNotification("CSV file is empty.", "warning");
          return;
        }

        const headers = (lines[0] || '').split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = (lines[i] || '').split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, idx) => { row[header] = values[idx] || ""; });
          
          const getVal = (keys) => {
            for (const key of keys) {
              if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
            }
            return null;
          };

          const getNum = (keys) => {
            for (const key of keys) {
              const val = row[key];
              if (val !== undefined && val !== null && val !== "") {
                const strVal = String(val).replace(/,/g, '').trim();
                const num = parseFloat(strVal);
                if (!isNaN(num)) return num;
              }
            }
            return null;
          };

          const getStr = (keys) => {
            for (const key of keys) {
              const val = row[key];
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                return String(val).trim();
              }
            }
            return null;
          };

          importedAssets.push({
            entityName: getStr(['Entity Name', 'entityName']) || "DENR - PENRO",
            fundCluster: getStr(['Fund Cluster', 'fundCluster']) || "Regular Agency Fund",
            propertyNumber: getStr(['Property No.', 'Property No', 'Property Number', 'propertyNumber']) || `IMP-${Date.now()}-${i}`,
            office: getStr(['Office', 'office']) || "",
            ppeClass: getStr(['PPE Class', 'ppeClass']) || "",
            description: getStr(['Description', 'description']) || "",
            accountCode: getStr(['Account Code', 'accountCode']) || "",
            usefulLife: getNum(['Useful Life', 'usefulLife']) || 5,
            dateAcquired: getVal(['Date Acquired', 'dateAcquired']) || new Date().toISOString().split('T')[0],
            reference: getStr(['Reference', 'reference']) || "",
            receipt: getStr(['Receipt', 'receipt']) || "",
            quantity: getNum(['Quantity', 'quantity']) || 1,
            unitCost: getNum(['Unit Cost', 'unitCost']) || 0,
            totalCost: getNum(['Total Cost', 'totalCost']) || 0,
            residualValue: getNum(['Residual Value', 'residualValue']) || 0,
            depreciableAmount: getNum(['Depreciable Amount', 'depreciableAmount']) || 0,
            annualDepreciation: getNum(['Annual Depreciation', 'annualDepreciation']) || 0,
            accumulatedDepreciation: getNum(['Accumulated Depreciation', 'accumulatedDepreciation']) || 0,
            netBookValue: getNum(['Net Book Value', 'netBookValue']) || 0,
            remarks: getStr(['Remarks', 'remarks']) || ""
          });
        }
      }

      // Don't filter out rows - try to import all with defaults for missing data
      const validAssets = importedAssets.filter(a => {
        // Only skip completely empty rows
        return Object.values(a).some(v => v && String(v).trim() !== "");
      });

      if (validAssets.length === 0) {
        showNotification("No valid data found. The Excel file appears to be empty.", "warning");
        return;
      }

      showNotification(`Saving ${validAssets.length} asset(s) to database...`, "info");
      
      let successCount = 0;
      let errorMessages = [];
      
      // Process assets in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < validAssets.length; i += batchSize) {
        const batch = validAssets.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          const asset = batch[j];
          
          // Generate property number if not provided
          const finalPropertyNumber = (asset.propertyNumber && asset.propertyNumber.trim()) 
            ? asset.propertyNumber.trim() 
            : `IMP-${Date.now()}-${i + j}`;
          
          // Use description or generate a placeholder
          const finalDescription = (asset.description && asset.description.trim()) 
            ? asset.description.trim() 
            : `Imported Asset ${i + j}`;
          
          const totalCost = (parseFloat(asset.unitCost) || 0) * (parseInt(asset.quantity) || 1);
          const residualValue = totalCost * 0.05;
          const depreciableAmount = totalCost - residualValue;
          const annualDepreciation = asset.annualDepreciation || 0;
          const accumulatedDepreciation = asset.accumulatedDepreciation || 0;
          const netBookValue = asset.netBookValue || (totalCost - accumulatedDepreciation);
          
          const assetData = {
            entityName: asset.entityName || "DENR - PENRO",
            fundCluster: asset.fundCluster || "Regular Agency Fund",
            propertyNumber: finalPropertyNumber,
            office: asset.office || "Main Office",
            ppeClass: asset.ppeClass || "",
            description: finalDescription,
            accountCode: asset.accountCode || "",
            usefulLife: parseInt(asset.usefulLife) || 5,
            dateAcquired: asset.dateAcquired || new Date().toISOString().split('T')[0],
            reference: asset.reference || "",
            receipt: asset.receipt || "",
            quantity: parseInt(asset.quantity) || 1,
            unitCost: parseFloat(asset.unitCost) || 0,
            totalCost: totalCost,
            residualValue: residualValue,
            depreciableAmount: depreciableAmount,
            annualDepreciation: annualDepreciation,
            accumulatedDepreciation: accumulatedDepreciation,
            netBookValue: netBookValue,
            remarks: asset.remarks || ""
          };

          try {
            if (isProduction) {
              // Production mode - save to localStorage first (fast), Firebase in background
              const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
              const newAsset = {
                ...assetData,
                id: Date.now().toString() + '-' + i + '-' + j,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              localAssets.push(newAsset);
              localStorage.setItem('denr_assets', JSON.stringify(localAssets));
              
              console.log('Saved to localStorage:', finalPropertyNumber);
              successCount++;
              
              // Try Firebase in background (non-blocking)
              saveAsset(assetData).then(firebaseResult => {
                if (firebaseResult.success) {
                  console.log('Firebase save successful for:', finalPropertyNumber);
                } else {
                  console.log('Firebase save failed for:', finalPropertyNumber);
                }
              }).catch(err => {
                console.log('Firebase save error for:', finalPropertyNumber, err);
              });
              
            } else {
              // Development mode - use local server
              const response = await fetch("http://localhost:4000/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(assetData)
              });
              
              if (response.ok) {
                successCount++;
              } else {
                const errorData = await response.json();
                errorMessages.push(`${finalPropertyNumber}: ${errorData.message || 'Unknown error'}`);
              }
            }
          } catch (err) {
            console.error("Network error:", err);
            // Always try localStorage as backup
            if (isProduction) {
              const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
              const newAsset = {
                ...assetData,
                id: Date.now().toString() + '-' + i + '-' + j,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              localAssets.push(newAsset);
              localStorage.setItem('denr_assets', JSON.stringify(localAssets));
              
              console.log('Saved to localStorage as backup:', finalPropertyNumber);
              successCount++;
            } else {
              errorMessages.push(`${finalPropertyNumber}: Network error - check connection`);
            }
          }
        }
        
        // Show progress for large imports
        if (validAssets.length > 10) {
          const progress = Math.min((i + batchSize) / validAssets.length * 100, 100);
          showNotification(`Import progress: ${Math.round(progress)}% (${successCount} saved)`, "info");
        }
      }

      if (successCount > 0) {
        showNotification(`Successfully imported ${successCount} asset(s)!`, "success");
        fetchAssets();
        
        // Create asset history records for imported assets
        if (isProduction) {
          console.log('Creating asset history records for imported assets...');
          
          const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
          const existingHistory = JSON.parse(localStorage.getItem('denr_asset_history') || '[]');
          
          // Get the most recently imported assets (last successCount assets)
          const importedAssetIds = localAssets.slice(-successCount).map(asset => asset.id);
          
          const historyEntries = importedAssetIds.map(assetId => {
            const asset = localAssets.find(a => a.id === assetId);
            return {
              id: Date.now().toString() + '-' + assetId,
              assetId: assetId,
              propertyNumber: asset.propertyNumber,
              action: 'Imported',
              description: `Asset imported from Excel file`,
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString(),
              details: {
                entityName: asset.entityName,
                office: asset.office,
                description: asset.description,
                unitCost: asset.unitCost,
                quantity: asset.quantity,
                totalCost: asset.totalCost
              }
            };
          });
          
          const updatedHistory = [...existingHistory, ...historyEntries];
          localStorage.setItem('denr_asset_history', JSON.stringify(updatedHistory));
          
          console.log('Created', historyEntries.length, 'asset history records');
          setAssetHistory(updatedHistory);
        }
        
        // Don't call fetchAllData() to prevent automatic depreciation calculation that overwrites imported values
      } 
      
      if (errorMessages.length > 0) {
        const errorText = errorMessages.slice(0, 3).join(', ');
        const moreText = errorMessages.length > 3 ? ` and ${errorMessages.length - 3} more` : '';
        showNotification(`Import issues: ${errorText}${moreText}`, "warning");
      }
      
      if (successCount === 0 && errorMessages.length === 0) {
        showNotification("Failed to import. Check Excel file format and server.", "error");
      }
    } catch (err) {
      console.error("Error:", err);
      showNotification("Error: " + err.message, "error");
    }

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const [showAllAssets, setShowAllAssets] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Filter assets
  const filteredAssets = assets.filter(asset => 
    asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.ppeClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.propertyNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated assets

  const displayedAssets = showAllAssets ? filteredAssets : filteredAssets.slice(0, ITEMS_PER_PAGE);

  const hasMoreAssets = filteredAssets.length > ITEMS_PER_PAGE;



  useEffect(() => {

    fetchAssets();
    fetchAllData(); // Load asset records

    // Auto-delete specific problematic Firebase documents
    if (isProduction) {
      deleteSpecificAssets().then(result => {
        if (result.success) {
          console.log('Auto-deleted specific Firebase documents:', result.results);
          // Refresh assets after deletion
          setTimeout(() => {
            fetchAssets();
            fetchAllData(); // Refresh asset records too
          }, 1000);
        }
      }).catch(err => {
        console.log('Auto-delete failed:', err);
      });
    }

    // Don't call fetchAllData() on initial load to prevent overwriting imported depreciation values

  }, []);



  useEffect(() => {

    fetchAssets();

    // Don't call fetchAllData() on initial load to prevent overwriting imported depreciation values

  }, []);



  // Format currency

  const formatCurrency = (amount) => {

    if (amount === null || amount === undefined || amount === 0) {

      return "₱0.00";

    }

    return new Intl.NumberFormat('en-PH', {

      style: 'currency',

      currency: 'PHP',

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    }).format(amount);

  };



  useEffect(() => {

    if (assets.length > 0) {

      // Debug removed - assets are loading correctly

    }

  }, [assets]);



    // Disposals real-time listener - completely removed



  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // If it's just a year, return as-is
    if (/^\d{4}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }


    // Otherwise format full date

    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  };



  // Pagination helpers for Asset History modal

  const getPaginatedModalHistory = () => {

    const startIndex = (historyModalPage - 1) * historyModalPageSize;

    const endIndex = startIndex + historyModalPageSize;

    return assetHistory.slice(startIndex, endIndex);

  };



  const getTotalModalHistoryPages = () => {

    return Math.ceil(assetHistory.length / historyModalPageSize);

  };



  const loadMoreModalHistory = () => {

    if (historyModalPage < getTotalModalHistoryPages()) {

      setHistoryModalPage(prev => prev + 1);

    }

  };



  const showLessModalHistory = () => {

    if (historyModalPage > 1) {

      setHistoryModalPage(prev => prev - 1);

    }

  };



  const clearDepreciationLog = async () => {
    try {
      if (isProduction) {
        // Production mode - clear from localStorage
        console.log('Clearing depreciation log from localStorage...');
        localStorage.setItem('denr_depreciation_log', JSON.stringify([]));
        setDepreciationLog([]);
        showNotification(`Depreciation log cleared successfully!`, "success");
        fetchAllData(); // Refresh to update the count
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/depreciation-log/clear", {
          method: "POST"
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Depreciation log cleared:', result);
          showNotification(`Depreciation log cleared successfully!`, "success");
          fetchAllData(); // Refresh to update the count
        } else {
          const errorText = await response.text();
          console.error('Clear depreciation log error:', errorText);
          showNotification(`Failed to clear depreciation log: ${errorText}`, "error");
        }
      }
    } catch (error) {
      console.error('Error clearing depreciation log:', error);
      showNotification("Error clearing depreciation log. Please try again.", "error");
    }
  };



  const clearTransfers = async () => {
    try {
      if (isProduction) {
        // Production mode - clear from localStorage
        console.log('Clearing transfers from localStorage...');
        localStorage.setItem('denr_transfers', JSON.stringify([]));
        setTransfers([]);
        showNotification(`Transfer records cleared successfully!`, "success");
        fetchAllData(); // Refresh to update the count
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/transfers/clear", {
          method: "POST"
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Transfers cleared:', result);
          showNotification(`Transfer records cleared successfully!`, "success");
          fetchAllData(); // Refresh to update the count
        } else {
          const errorText = await response.text();
          console.error('Clear transfers error:', errorText);
          showNotification(`Failed to clear transfers: ${errorText}`, "error");
        }
      }
    } catch (error) {
      console.error('Error clearing transfers:', error);
      showNotification("Error clearing transfers. Please try again.", "error");
    }
  };



  const clearDisposals = async () => {
    try {
      if (isProduction) {
        // Production mode - clear from localStorage
        console.log('Clearing disposals from localStorage...');
        localStorage.setItem('denr_disposals', JSON.stringify([]));
        setDisposals([]);
        showNotification(`Disposal records cleared successfully!`, "success");
        fetchAllData(); // Refresh to update the count
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/disposals/clear", {
          method: "POST"
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Disposals cleared:', result);
          showNotification(`Disposal records cleared successfully!`, "success");
          fetchAllData(); // Refresh to update the count
        } else {
          const errorText = await response.text();
          console.error('Clear disposals error:', errorText);
          showNotification(`Failed to clear disposals: ${errorText}`, "error");
        }
      }
    } catch (error) {
      console.error('Error clearing disposals:', error);
      showNotification("Error clearing disposals. Please try again.", "error");
    }
  };



  const clearAssetHistory = async () => {
    try {
      if (isProduction) {
        // Production mode - clear from localStorage
        console.log('Clearing asset history from localStorage...');
        localStorage.setItem('denr_asset_history', JSON.stringify([]));
        setAssetHistory([]);
        showNotification(`Asset history cleared successfully!`, "success");
        fetchAllData(); // Refresh to update the count
        // Auto-refresh property list to show latest Accountable Officer changes
        setTimeout(() => {
          fetchAssets();
        }, 1000);
      } else {
        // Development mode - use local server
        const response = await fetch("http://localhost:4000/api/asset-history/clear", {
          method: "POST"
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Asset history cleared:', result);
          showNotification(`Asset history cleared successfully!`, "success");
          fetchAllData(); // Refresh to update the count
          // Auto-refresh property list to show latest Accountable Officer changes
          setTimeout(() => {
            fetchAssets();
          }, 1000);
        } else {
          const errorText = await response.text();
          console.error('Clear history error:', errorText);
          showNotification(`Failed to clear history: ${errorText}`, "error");
        }
      }
    } catch (error) {
      console.error('Error clearing asset history:', error);
      showNotification("Error clearing asset history. Please try again.", "error");
    }
  };



  const resetModalHistoryPage = () => {

    setHistoryModalPage(1);

  };



  // Pagination helpers for Depreciation Log modal

  const getPaginatedModalDepreciation = () => {

    const startIndex = (depreciationModalPage - 1) * depreciationModalPageSize;

    const endIndex = startIndex + depreciationModalPageSize;

    return depreciationLog.slice(startIndex, endIndex);

  };



  const getTotalModalDepreciationPages = () => {

    return Math.ceil(depreciationLog.length / depreciationModalPageSize);

  };



  const loadMoreModalDepreciation = () => {

    if (depreciationModalPage < getTotalModalDepreciationPages()) {

      setDepreciationModalPage(prev => prev + 1);

    }

  };



  const showLessModalDepreciation = () => {

    if (depreciationModalPage > 1) {

      setDepreciationModalPage(prev => prev - 1);

    }

  };



  const resetModalDepreciationPage = () => {

    setDepreciationModalPage(1);

  };



  // Pagination helpers for Transfer Records modal

  const getPaginatedModalTransfers = () => {

    const startIndex = (transferModalPage - 1) * transferModalPageSize;

    const endIndex = startIndex + transferModalPageSize;

    return transfers.slice(startIndex, endIndex);

  };



  const getTotalModalTransferPages = () => {

    return Math.ceil(transfers.length / transferModalPageSize);

  };



  const loadMoreModalTransfers = () => {

    if (transferModalPage < getTotalModalTransferPages()) {

      setTransferModalPage(prev => prev + 1);

    }

  };



  const showLessModalTransfers = () => {

    if (transferModalPage > 1) {

      setTransferModalPage(prev => prev - 1);

    }

  };



  const resetModalTransferPage = () => {

    setTransferModalPage(1);

  };



  // Pagination helpers for Disposal Records modal

  const getPaginatedModalDisposals = () => {

    const startIndex = (disposalModalPage - 1) * disposalModalPageSize;

    const endIndex = startIndex + disposalModalPageSize;

    return disposals.slice(startIndex, endIndex);

  };



  const getTotalModalDisposalPages = () => {

    return Math.ceil(disposals.length / disposalModalPageSize);

  };



  const loadMoreModalDisposals = () => {

    if (disposalModalPage < getTotalModalDisposalPages()) {

      setDisposalModalPage(prev => prev + 1);

    }

  };



  const showLessModalDisposals = () => {

    if (disposalModalPage > 1) {

      setDisposalModalPage(prev => prev - 1);

    }

  };



  const resetModalDisposalPage = () => {

    setDisposalModalPage(1);

  };



  return (

    <div className="scroll-smooth bg-gradient-to-br from-green-50 via-gray-50 to-green-100 min-h-screen">

      <NotificationContainer 

        notifications={notifications} 

        setNotifications={setNotifications} 

        confirmDialog={confirmDialog} 

        setConfirmDialog={setConfirmDialog} 

      />

      <Navbar />



      {/* Dashboard Section */}

      <section id="dashboard" className="pt-20 pb-12 px-4">

        <div className="container mx-auto">

          <div className="flex flex-col md:flex-row justify-between items-center mb-8">

            <div>

            </div>

            <div className="flex gap-3 mt-4 md:mt-0">

              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105">

                <ArrowUpTrayIcon className="w-5 h-5" />

                Import File

                <input 

                  type="file" 

                  accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"

                  onChange={handleImportFile}

                  className="hidden" 

                />

              </label>

              <button 

                onClick={() => setShowAddForm(true)}

                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"

              >

                <PlusIcon className="w-6 h-6" />

                Add New Property

              </button>

            </div>

          </div>

          

          <StatsCards assets={assets} loading={loading} />

          

          <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">

            <div className="relative">

              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />

              <input

                type="text"

                placeholder="Search properties by name, class, or number..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"

              />

            </div>

          </div>

          

          <div className="mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 flex justify-between items-center">

              <div>

                <h3 className="text-xl font-bold text-white">Property List</h3>

                <p className="text-green-100 text-sm">Manage your depreciated property</p>

              </div>

              <div className="flex gap-2 items-center">

                {selectedAssets.length > 0 && (

                  <>

                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">

                      {selectedAssets.length} selected

                    </span>

                    <button 

                      onClick={deleteSelectedAssets}

                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"

                    >

                      <TrashIcon className="w-4 h-4" />

                      Delete Selected

                    </button>

                  </>

                )

                }

                <button onClick={selectAllAssets} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-sm">

                  {selectedAssets.length === filteredAssets.length && filteredAssets.length > 0 ? "Deselect All" : "Select All"}

                </button>

              </div>

            </div>

            

            {loading ? (

              <div className="text-center py-12">

                <span className="loading loading-spinner loading-lg text-green-600"></span>

                <p className="mt-2 text-gray-500">Loading assets...</p>

              </div>

            ) : error ? (

              <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div></div>

            ) : filteredAssets.length === 0 ? (

              <div className="text-center py-12 text-gray-500">

                <p className="text-lg">No properties found.</p>

                <p className="mt-2">Click "Add New Property" to add your first asset.</p>

              </div>

            ) : (

              <>

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600 w-8">✓</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Property #</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Date Acq</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Office</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Description</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">PPE Class</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Accountable Officer</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Acct Code</th>

                        <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Life</th>

                        <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Status</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Unit Cost</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Total Cost</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Residual</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Depr Amt</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Annual Depr</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Accum Depr</th>

                        <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Net Book</th>

                        <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Remarks</th>

                        <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-100">

                      {(displayedAssets || []).map((asset) => (

                        <tr key={asset.id} className={`hover:bg-green-50 transition-colors ${selectedAssets.includes(asset.id) ? 'bg-green-50' : ''} ${asset.status === 'disposed' ? 'opacity-60 bg-red-50' : ''}`}>

                          <td className="px-2 py-3 text-center">

                            <button

                              onClick={() => toggleAssetSelection(asset.id)}

                              className={`w-6 h-6 rounded-md flex items-center justify-center ${selectedAssets.includes(asset.id) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}

                            >

                              {selectedAssets.includes(asset.id) && <CheckIcon className="w-4 h-4" />}

                            </button>

                          </td>

                          <td className="px-1 py-2 font-mono text-xs text-gray-700">{asset.propertyNumber || "N/A"}</td>

                          <td className="px-1 py-2 text-xs text-gray-700">{formatDate(asset.dateAcquired)}</td>

                          <td className="px-1 py-2 text-xs text-gray-700">{asset.office || "-"}</td>

                          <td className="px-1 py-2 text-xs text-gray-700" title={asset.description || "-"}>
                            <div className="max-w-[150px] truncate">
                              {asset.description || "-"}
                            </div>
                          </td>

                          <td className="px-1 py-2"><span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs font-medium">{asset.ppeClass || "-"}</span></td>

                          <td className="px-1 py-2 text-xs text-gray-700" title={asset.accountableOfficer || "-"}>
                            <div className="max-w-[120px] truncate">
                              {asset.accountableOfficer || "-"}
                            </div>
                          </td>

                          <td className="px-1 py-2 font-mono text-xs text-gray-600">{asset.accountCode || "-"}</td>

                          <td className="px-1 py-2 text-center text-xs text-gray-700">

                            {(asset.ppeClass && asset.ppeClass.includes('Construction in Progress')) ? '-' : (asset.usefulLife || "-")}

                          </td>

                          <td className="px-1 py-2 text-center">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${asset.status === 'unserviceable' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {asset.status === 'unserviceable' ? 'Unserviceable' : 'Serviceable'}
                            </span>
                          </td>

                          <td className="px-1 py-2 text-right text-xs text-gray-800">{formatCurrency(asset.unitCost)}</td>

                          <td className="px-1 py-2 text-right text-xs font-semibold text-gray-800">{formatCurrency(asset.totalCost)}</td>

                          <td className="px-1 py-2 text-right text-xs text-gray-600">{formatCurrency(asset.residualValue)}</td>

                          <td className="px-1 py-2 text-right text-xs text-gray-600">{formatCurrency(asset.depreciableAmount)}</td>

                          <td className="px-1 py-2 text-right text-xs text-blue-600">{formatCurrency(asset.annualDepreciation)}</td>

                          <td className="px-1 py-2 text-right text-xs text-orange-600 font-medium">{formatCurrency(asset.accumulatedDepreciation)}</td>

                          <td className="px-1 py-2 text-right text-xs font-bold text-green-600">

                            {formatCurrency(

                              // For Construction in Progress assets, show Total Cost as Net Book Value

                              (asset.ppeClass && asset.ppeClass.includes('Construction in Progress')) 

                                ? asset.totalCost 

                                : asset.netBookValue

                            )}

                          </td>

                          <td className="px-1 py-2 text-xs text-gray-600" title={asset.remarks || "-"}>
                            <div className="max-w-[120px] truncate">
                              {asset.remarks || "-"}
                            </div>
                          </td>

                          <td className="px-1 py-2">

                            <div className="grid grid-cols-2 gap-0.5 justify-center max-w-[80px]">

                              <button onClick={() => { setEditingAsset(asset); setShowAddForm(true); }} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Edit">

                                <PencilIcon className="w-3 h-3" />

                              </button>

                              <button onClick={() => deleteAsset(asset.id)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Delete">

                                <TrashIcon className="w-3 h-3" />

                              </button>

                              <button onClick={() => handleGenerateCOA(asset)} className="p-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200" title="Generate COA Form">

                                <DocumentChartBarIcon className="w-3 h-3" />

                              </button>

                              <button onClick={() => toggleAssetStatusImmediate(asset)} className="p-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200" title="Toggle Status (Serviceable/Unserviceable)">

                                <ArrowsRightLeftIcon className="w-3 h-3" />

                              </button>

                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

                

                {/* Pagination Button */}

                {hasMoreAssets && (

                  <div className="p-4 text-center border-t border-gray-200">

                    <button

                      onClick={() => setShowAllAssets(!showAllAssets)}

                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"

                    >

                      {showAllAssets ? (

                        <>

                          <ArrowUpTrayIcon className="w-4 h-4" />

                          Show Less ({ITEMS_PER_PAGE})

                        </>

                      ) : (

                        <>

                          <ArrowDownTrayIcon className="w-4 h-4" />

                          See More ({filteredAssets.length - ITEMS_PER_PAGE} more)

                        </>

                      )}

                    </button>

                  </div>

                )}

              </>

            )}

          </div>

        </div>

      </section>



      {/* Records Section */}

      <section id="records" className="pt-20 pb-12 px-4 bg-white">

        <div className="container mx-auto">

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl shadow-2xl p-8 border border-gray-200">

            <div className="text-center mb-8">

              <h2 className="text-3xl font-bold text-gray-800">Asset Records</h2>

              <p className="text-gray-500 mt-2">Comprehensive asset management and tracking</p>

            </div>

            

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Asset History */}

              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-blue-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { resetModalHistoryPage(); setShowHistoryModal(true); fetchAllData(); }}>

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-blue-100 rounded-xl"><ClockIcon className="w-8 h-8 text-blue-600" /></div>

                  <div>

                    <h3 className="font-bold text-gray-800">Asset History</h3>

                    <p className="text-xs text-gray-500">{assetHistory.length} records</p>

                  </div>

                </div>

                <p className="text-sm text-gray-600">Track all modifications and lifecycle events of each asset.</p>

                <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">View History</button>

              </div>



              {/* Depreciation Log */}

              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-green-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { resetModalDepreciationPage(); setShowDepreciationModal(true); fetchAllData(); }}>

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-green-100 rounded-xl"><DocumentChartBarIcon className="w-8 h-8 text-green-600" /></div>

                  <div>

                    <h3 className="font-bold text-gray-800">Depreciation Log</h3>

                    <p className="text-xs text-gray-500">{depreciationLog.length} entries</p>

                  </div>

                </div>

                <p className="text-sm text-gray-600">View detailed depreciation calculations and annual adjustments.</p>

                <button className="mt-4 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium">View Log</button>

              </div>



              {/* Transfer Records */}

              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-purple-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { resetModalTransferPage(); setShowTransferModal(true); fetchAllData(); }}>

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-purple-100 rounded-xl"><ArrowsRightLeftIcon className="w-8 h-8 text-purple-600" /></div>

                  <div>

                    <h3 className="font-bold text-gray-800">Transfer Records</h3>

                    <p className="text-xs text-gray-500">{transfers.length} transfers</p>

                  </div>

                </div>

                <p className="text-sm text-gray-600">Track asset transfers between offices and departments.</p>

                <button className="mt-4 w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium">View Transfers</button>

              </div>



              {/* Disposal Records */}

              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-red-500 hover:shadow-xl transition-shadow cursor-pointer flex flex-col h-full" onClick={() => { resetModalDisposalPage(); setShowDisposalModal(true); fetchAllData(); }}>

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-red-100 rounded-xl"><ArchiveBoxIcon className="w-8 h-8 text-red-600" /></div>

                  <div>

                    <h3 className="font-bold text-gray-800">Disposal Records</h3>

                    <p className="text-xs text-gray-500">{disposals.length} disposed</p>

                  </div>

                </div>

                <p className="text-sm text-gray-600 mt-4 flex-grow">View all disposed, scrapped, or retired assets.</p>

                <button className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium">View Disposals</button>

              </div>

            </div>

          </div>

        </div>

      </section>



      {/* COA Forms Section */}

      <section id="coaforms" className="pt-20 pb-12 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100">

        <div className="container mx-auto">

          <div className="text-center mb-12">

            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-lg mb-4">

              <ClipboardDocumentListIcon className="w-8 h-8 text-white" />

            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">COA Forms & Reports</h2>

            <p className="text-gray-500 mt-3 text-lg">Generate official government forms and reports</p>

            {selectedAssets.length > 0 && (

              <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">

                <CheckIcon className="w-5 h-5" />

                <span className="font-semibold">{selectedAssets.length} assets selected</span>

              </div>

            )}

            <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-green-600 mx-auto mt-4 rounded-full"></div>

          </div>

          

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ClipboardDocumentListIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Schedule of PPE</h3><p className="text-green-200 text-xs">COA Form No. I-A-1</p></div>

                </div>

                <p className="text-green-100 text-sm mb-6">Property, Plant and Equipment - Balance Sheet</p>

                <button className="w-full py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50">Generate Report</button>

              </div>

            </div>



            <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ClipboardDocumentIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Property Card</h3><p className="text-teal-200 text-xs">COA Form No. I-A-2</p></div>

                </div>

                <p className="text-teal-100 text-sm mb-6">Detailed record of each property item</p>

                <button className="w-full py-3 bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50">Generate Report</button>

              </div>

            </div>



            <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ChartBarIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Depreciation Schedule</h3><p className="text-cyan-200 text-xs">Annual Report</p></div>

                </div>

                <p className="text-cyan-100 text-sm mb-6">Accumulated depreciation per asset</p>

                <button className="w-full py-3 bg-white text-cyan-700 font-semibold rounded-xl hover:bg-cyan-50">Generate Report</button>

              </div>

            </div>



            <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ArchiveBoxIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Inventory Report</h3><p className="text-amber-200 text-xs">Physical Count</p></div>

                </div>

                <p className="text-amber-100 text-sm mb-6">Summary of all countable properties</p>

                <button className="w-full py-3 bg-white text-amber-700 font-semibold rounded-xl hover:bg-amber-50">Generate Report</button>

              </div>

            </div>



            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ArrowDownTrayIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Acquisition Report</h3><p className="text-blue-200 text-xs">New Acquisitions</p></div>

                </div>

                <p className="text-blue-100 text-sm mb-6">List of newly acquired properties</p>

                <button className="w-full py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50">Generate Report</button>

              </div>

            </div>



            <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">

              <div className="p-8">

                <div className="flex items-center gap-4 mb-4">

                  <div className="p-3 bg-white/20 rounded-xl"><ArrowUpTrayIcon className="w-10 h-10 text-white" /></div>

                  <div><h3 className="text-xl font-bold text-white">Disposal Report</h3><p className="text-red-200 text-xs">Transfer / Disposal</p></div>

                </div>

                <p className="text-red-100 text-sm mb-6">Disposed or transferred properties</p>

                <button className="w-full py-3 bg-white text-red-700 font-semibold rounded-xl hover:bg-red-50">Generate Report</button>

              </div>

            </div>

          </div>

        </div>

      </section>



      {/* ==================== MODALS ==================== */}



      {/* Asset History Modal */}

      {showHistoryModal && (

        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>

          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">

              <div>

                <h3 className="text-xl font-bold text-white">Asset History</h3>

                <p className="text-blue-100 text-sm">Track all modifications and lifecycle events of each asset</p>

              </div>

              <div className="flex gap-2">

                <button onClick={clearAssetHistory} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">

                  Clear Logs

                </button>

                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/20 rounded-lg">

                  <XMarkIcon className="w-6 h-6 text-white" />

                </button>

              </div>

            </div>

            <div className="p-6 overflow-auto max-h-[70vh]">

              {assetHistory.length === 0 ? (

                <p className="text-center text-gray-500 py-8">No history records found.</p>

              ) : (

                <>

                  <div className="mb-4 flex justify-between items-center">

                    <p className="text-sm text-gray-600">

                      Showing {((historyModalPage - 1) * historyModalPageSize) + 1} to {Math.min(historyModalPage * historyModalPageSize, assetHistory.length)} of {assetHistory.length} records

                    </p>

                  </div>

                  

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Field</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Old Value</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">New Value</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {(getPaginatedModalHistory() || []).map((h, i) => (

                        <tr key={i} className="hover:bg-gray-50">

                          <td className="px-4 py-3 text-xs text-gray-600">{formatDate(h.changeDate)}</td>

                          <td className="px-4 py-3 text-xs font-mono text-gray-700">{h.propertyNumber || h.assetId}</td>

                          <td className="px-4 py-3 text-xs text-gray-700 capitalize">{h.fieldChanged}</td>

                          <td className="px-4 py-3 text-xs text-gray-500">{h.oldValue || '-'}</td>

                          <td className="px-4 py-3 text-xs text-green-600">{h.newValue || '-'}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                  

                  {historyModalPage < getTotalModalHistoryPages() ? (

                    <div className="mt-4 flex justify-center gap-3">

                      {historyModalPage > 1 && (

                        <button

                          onClick={showLessModalHistory}

                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                        >

                          Show Less ({Math.max((historyModalPage - 1) * historyModalPageSize, 10)} records)

                        </button>

                      )}

                      <button

                        onClick={loadMoreModalHistory}

                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"

                      >

                        Load 10 More Records ({Math.min(historyModalPage * historyModalPageSize + 10, assetHistory.length)} of {assetHistory.length})

                      </button>

                    </div>

                  ) : historyModalPage > 1 ? (

                    <div className="mt-4 text-center">

                      <button

                        onClick={showLessModalHistory}

                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                      >

                        Show Less ({Math.max((historyModalPage - 1) * historyModalPageSize, 10)} records)

                      </button>

                    </div>

                  ) : null}

                </>

              )}

            </div>

          </div>

        </div>

      )}



      {/* Depreciation Log Modal */}

      {showDepreciationModal && (

        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDepreciationModal(false)}>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <DocumentChartBarIcon className="w-7 h-7 text-white" />

                <div><h2 className="text-xl font-bold text-white">Depreciation Log</h2><p className="text-green-200 text-xs">Yearly depreciation calculations</p></div>

              </div>

              <div className="flex gap-2">

                <button onClick={clearDepreciationLog} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">

                  Clear Logs

                </button>

                <button onClick={() => setShowDepreciationModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>

              </div>

            </div>

            <div className="p-6 overflow-auto max-h-[70vh]">

              {depreciationLog.length === 0 ? (

                <p className="text-center text-gray-500 py-8">No depreciation records found.</p>

              ) : (

                <>

                  <div className="mb-4 flex justify-between items-center">

                    <p className="text-sm text-gray-600">

                      Showing {((depreciationModalPage - 1) * depreciationModalPageSize) + 1} to {Math.min(depreciationModalPage * depreciationModalPageSize, depreciationLog.length)} of {depreciationLog.length} entries

                    </p>

                  </div>

                  

                  <table className="w-full">

                    <thead className="bg-gray-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Year</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Beginning Value</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Depreciation</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Accumulated</th>

                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ending Value</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {(getPaginatedModalDepreciation() || []).map((d, i) => (

                        <tr key={i} className="hover:bg-gray-50">

                          <td className="px-4 py-3 text-xs font-bold text-gray-700">{d.year}</td>

                          <td className="px-4 py-3 text-xs font-mono text-gray-700">{d.propertyNumber || d.assetId}</td>

                          <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(d.beginningBookValue)}</td>

                          <td className="px-4 py-3 text-xs text-red-600">-{formatCurrency(d.depreciationExpense)}</td>

                          <td className="px-4 py-3 text-xs text-orange-600">{formatCurrency(d.accumulatedDepreciation)}</td>

                          <td className="px-4 py-3 text-xs font-bold text-green-600">{formatCurrency(d.endingBookValue)}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                  

                  {depreciationModalPage < getTotalModalDepreciationPages() ? (

                    <div className="mt-4 flex justify-center gap-3">

                      {depreciationModalPage > 1 && (

                        <button

                          onClick={showLessModalDepreciation}

                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                        >

                          Show Less ({Math.max((depreciationModalPage - 1) * depreciationModalPageSize, 10)} entries)

                        </button>

                      )}

                      <button

                        onClick={loadMoreModalDepreciation}

                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"

                      >

                        Load 10 More Entries ({Math.min(depreciationModalPage * depreciationModalPageSize + 10, depreciationLog.length)} of {depreciationLog.length})

                      </button>

                    </div>

                  ) : depreciationModalPage > 1 ? (

                    <div className="mt-4 text-center">

                      <button

                        onClick={showLessModalDepreciation}

                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                      >

                        Show Less ({Math.max((depreciationModalPage - 1) * depreciationModalPageSize, 10)} entries)

                      </button>

                    </div>

                  ) : null}

                </>

              )}

            </div>

          </div>

        </div>

      )}



      {/* Transfer Records Modal */}

      {showTransferModal && (

        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTransferModal(false)}>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <ArrowsRightLeftIcon className="w-7 h-7 text-white" />

                <div><h2 className="text-xl font-bold text-white">Transfer Records</h2><p className="text-purple-200 text-xs">Asset movements between offices</p></div>

              </div>

              <div className="flex gap-2">

                <button onClick={clearTransfers} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">

                  Clear Logs

                </button>

                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>

              </div>

            </div>

            <div className="p-6">

              <div className="bg-purple-50 rounded-xl p-4 mb-6">

                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Create New Transfer</h4>

                <form onSubmit={handleCreateTransfer} className="grid grid-cols-1 md:grid-cols-3 gap-3">

                  <select required value={transferForm.assetId} onChange={e => setTransferForm({...transferForm, assetId: e.target.value})} className="border rounded-lg px-3 py-2 text-sm">

                    <option value="">Select Asset</option>

                    {(assets || []).filter(a => a.status === 'Active').map(a => <option key={a.id} value={a.id}>{a.propertyNumber} - {a.description}</option>)}

                  </select>

                  <input required placeholder="From Office" value={transferForm.fromOffice} onChange={e => setTransferForm({...transferForm, fromOffice: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <input required placeholder="To Office" value={transferForm.toOffice} onChange={e => setTransferForm({...transferForm, toOffice: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <input required type="date" value={transferForm.transferDate} onChange={e => setTransferForm({...transferForm, transferDate: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <input required placeholder="Reason" value={transferForm.transferReason} onChange={e => setTransferForm({...transferForm, transferReason: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <div className="flex gap-2">

                    <input required placeholder="Transferred By" value={transferForm.transferredBy} onChange={e => setTransferForm({...transferForm, transferredBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm flex-1" />

                    <input required placeholder="Received By" value={transferForm.receivedBy} onChange={e => setTransferForm({...transferForm, receivedBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm flex-1" />

                  </div>

                  <button type="submit" className="md:col-span-3 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium">Create Transfer</button>

                </form>

              </div>

              <div className="overflow-auto max-h-[40vh]">

                {transfers.length === 0 ? (

                  <p className="text-center text-gray-500 py-8">No transfer records found.</p>

                ) : (

                  <>

                    <div className="mb-4 flex justify-between items-center">

                      <p className="text-sm text-gray-600">

                        Showing {((transferModalPage - 1) * transferModalPageSize) + 1} to {Math.min(transferModalPage * transferModalPageSize, transfers.length)} of {transfers.length} transfers

                      </p>

                    </div>

                    

                    <table className="w-full">

                      <thead className="bg-gray-50">

                        <tr>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">From</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">To</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">By</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y">

                        {(getPaginatedModalTransfers() || []).map((t, i) => (

                          <tr key={i} className="hover:bg-gray-50">

                            <td className="px-4 py-3 text-xs text-gray-600">{formatDate(t.transferDate)}</td>

                            <td className="px-4 py-3 text-xs font-mono text-gray-700">{t.propertyNumber || t.assetId}</td>

                            <td className="px-4 py-3 text-xs text-red-600">{t.fromOffice || '-'}</td>

                            <td className="px-4 py-3 text-xs text-green-600">{t.toOffice}</td>

                            <td className="px-4 py-3 text-xs text-gray-600">{t.transferReason}</td>

                            <td className="px-4 py-3 text-xs text-gray-500">{t.transferredBy} → {t.receivedBy}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                    

                    {transferModalPage < getTotalModalTransferPages() ? (

                    <div className="mt-4 flex justify-center gap-3">

                      {transferModalPage > 1 && (

                        <button

                          onClick={showLessModalTransfers}

                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                        >

                          Show Less ({Math.max((transferModalPage - 1) * transferModalPageSize, 10)} transfers)

                        </button>

                      )}

                      <button

                        onClick={loadMoreModalTransfers}

                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"

                      >

                        Load 10 More Transfers ({Math.min(transferModalPage * transferModalPageSize + 10, transfers.length)} of {transfers.length})

                      </button>

                    </div>

                  ) : transferModalPage > 1 ? (

                    <div className="mt-4 text-center">

                      <button

                        onClick={showLessModalTransfers}

                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                      >

                        Show Less ({Math.max((transferModalPage - 1) * transferModalPageSize, 10)} transfers)

                      </button>

                    </div>

                  ) : null}  

                  </>

                )}

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Disposal Records Modal */}

      {showDisposalModal && (

        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDisposalModal(false)}>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <ArchiveBoxIcon className="w-7 h-7 text-white" />

                <div><h2 className="text-xl font-bold text-white">Disposal Records</h2><p className="text-red-200 text-xs">Disposed, scrapped, or retired assets</p></div>

              </div>

              <div className="flex gap-2">

                <button onClick={clearDisposals} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">

                  Clear Logs

                </button>

                <button onClick={() => setShowDisposalModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>

              </div>

            </div>

            <div className="p-6">

              <div className="bg-red-50 rounded-xl p-4 mb-6">

                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Create New Disposal</h4>

                <form onSubmit={handleCreateDisposal} className="grid grid-cols-1 md:grid-cols-3 gap-3">

                  <select required value={disposalForm.assetId} onChange={e => {

                    const asset = assets.find(a => a.id == e.target.value);

                    setDisposalForm({...disposalForm, assetId: e.target.value, bookValueAtDisposal: asset?.netBookValue || 0});

                  }} className="border rounded-lg px-3 py-2 text-sm">

                    <option value="">Select Asset</option>

                    {(assets || []).filter(a => a.status === 'Active').map(a => <option key={a.id} value={a.id}>{a.propertyNumber} - {a.description} (₱{a.netBookValue?.toLocaleString()})</option>)}

                  </select>

                  <input required type="date" value={disposalForm.disposalDate} onChange={e => setDisposalForm({...disposalForm, disposalDate: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <select required value={disposalForm.disposalMethod} onChange={e => setDisposalForm({...disposalForm, disposalMethod: e.target.value})} className="border rounded-lg px-3 py-2 text-sm">

                    <option value="">Method</option>

                    <option value="Sold">Sold</option>

                    <option value="Scrapped">Scrapped</option>

                    <option value="Donated">Donated</option>

                    <option value="Transferred">Transferred</option>

                    <option value="Other">Other</option>

                  </select>

                  <input required placeholder="Reason" value={disposalForm.disposalReason} onChange={e => setDisposalForm({...disposalForm, disposalReason: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <input type="number" placeholder="Proceeds (₱)" value={disposalForm.proceeds} onChange={e => setDisposalForm({...disposalForm, proceeds: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <input required placeholder="Approved By" value={disposalForm.approvedBy} onChange={e => setDisposalForm({...disposalForm, approvedBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />

                  <button type="submit" className="md:col-span-3 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium">Create Disposal</button>

                </form>

              </div>

              <div className="overflow-auto max-h-[40vh]">

                {disposals.length === 0 ? (

                  <p className="text-center text-gray-500 py-8">No disposal records found.</p>

                ) : (

                  <>

                    <div className="mb-4 flex justify-between items-center">

                      <p className="text-sm text-gray-600">

                        Showing {((disposalModalPage - 1) * disposalModalPageSize) + 1} to {Math.min(disposalModalPage * disposalModalPageSize, disposals.length)} of {disposals.length} disposals

                      </p>

                    </div>

                    

                    <table className="w-full">

                      <thead className="bg-gray-50">

                        <tr>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Method</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Book Value</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proceeds</th>

                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Approved By</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y">

                        {(getPaginatedModalDisposals() || []).map((d, i) => (

                          <tr key={i} className="hover:bg-gray-50">

                            <td className="px-4 py-3 text-xs text-gray-600">{formatDate(d.disposalDate)}</td>

                            <td className="px-4 py-3 text-xs font-mono text-gray-700">{d.propertyNumber || d.assetId}</td>

                            <td className="px-4 py-3 text-xs"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">{d.disposalMethod}</span></td>

                            <td className="px-4 py-3 text-xs text-gray-600">{d.disposalReason}</td>

                            <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(d.bookValueAtDisposal)}</td>

                            <td className="px-4 py-3 text-xs text-green-600">{formatCurrency(d.proceeds)}</td>

                            <td className="px-4 py-3 text-xs text-gray-500">{d.approvedBy}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                    

                    {disposalModalPage < getTotalModalDisposalPages() ? (

                    <div className="mt-4 flex justify-center gap-3">

                      {disposalModalPage > 1 && (

                        <button

                          onClick={showLessModalDisposals}

                          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                        >

                          Show Less ({Math.max((disposalModalPage - 1) * disposalModalPageSize, 10)} disposals)

                        </button>

                      )}

                      <button

                        onClick={loadMoreModalDisposals}

                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"

                      >

                        Load 10 More Disposals ({Math.min(disposalModalPage * disposalModalPageSize + 10, disposals.length)} of {disposals.length})

                      </button>

                    </div>

                  ) : disposalModalPage > 1 ? (

                    <div className="mt-4 text-center">

                      <button

                        onClick={showLessModalDisposals}

                        className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"

                      >

                        Show Less ({Math.max((disposalModalPage - 1) * disposalModalPageSize, 10)} disposals)

                      </button>

                    </div>

                  ) : null}  

                  </>

                )}

              </div>

            </div>

          </div>

        </div>

      )}



      {/* COA Form Modal */}

      {showCOAModal && coAsset && (

        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCOAModal(false)}>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex justify-between items-center">

              <div className="flex items-center gap-3">

                <DocumentChartBarIcon className="w-7 h-7 text-white" />

                <div><h2 className="text-xl font-bold text-white">COA Form</h2><p className="text-amber-200 text-xs">Property Form No. I-A-2</p></div>

              </div>

              <button onClick={() => setShowCOAModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>

            </div>

            <div className="p-6 overflow-auto max-h-[70vh]">

              <div className="mb-4 flex flex-wrap gap-2">

                <div className="relative">

                  <button 

                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}

                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"

                  >

                    <ArrowDownTrayIcon className="w-4 h-4" />

                    Download

                  </button>

                  

                  {showDownloadOptions && (

                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">

                      <button 

                        onClick={async () => {

                          const depData = depreciationLog.filter(d => d.assetId === coAsset.id);

                          await downloadCOAFile(coAsset, depData);

                          setShowDownloadOptions(false);

                        }}

                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 font-semibold"

                      >

                        Excel

                      </button>

                      <button 

                        onClick={() => {

                          exportToPDF();

                        }}

                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 font-semibold"

                      >

                        PDF

                      </button>

                      <button 

                        onClick={() => {

                          exportToWord();

                          setShowDownloadOptions(false);

                        }}

                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"

                      >

                        Word

                      </button>

                    </div>

                  )}

                </div>

                

                <button 

                  onClick={handlePrint} 

                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg ml-auto"

                >

                  <ArrowUpTrayIcon className="w-4 h-4" />

                  Print

                </button>

              </div>

              

              <div ref={printRef} className="border-2 border-gray-800 p-4 text-xs">

                <div className="flex mb-3">

                  <div className="w-16"></div>

                  <div className="text-center flex-1">

                    <h3 className="font-bold text-sm">PROPERTY, PLANT AND EQUIPMENT LEDGER CARD</h3>

                    <p className="text-[10px]">(COA Form No. I-A-2)</p>

                  </div>

                  <div className="w-16">

                    <p className="text-[10px] -rotate-90 origin-center mt-8 w-20">Appendix 70</p>

                  </div>

                </div>

                

                <div className="grid grid-cols-2 gap-4 mb-3">

                  <div><span className="font-bold">Entity Name:</span> <span className="border-b border-gray-400 inline-block min-w-[200px]">{coAsset.entityName || 'DENR - Provincial Environment and Natural Resources Office (PENRO)'}</span></div>

                  <div><span className="font-bold">Fund Cluster:</span> <span className="border-b border-gray-400 inline-block min-w-[100px]">{coAsset.fundCluster || 'Regular Agency Fund'}</span></div>

                </div>

                

                <div className="border border-gray-800 mb-3 p-4">

                  <div className="mb-3"><span className="font-bold">Property, Plant and Equipment:</span></div>

                  <div className="ml-4"><span className="font-bold">Description:</span> {coAsset.description}</div>

                </div>

                

                <div className="border border-gray-800 mb-3 p-3 grid grid-cols-2 gap-x-4 gap-y-2">

                  <div className="col-span-2"><span className="font-bold">Object Account Code:</span> {coAsset.accountCode}</div>

                  <div><span className="font-bold">Estimated Useful Life:</span> {(coAsset.ppeClass && (coAsset.ppeClass.includes('Construction in Progress') || coAsset.ppeClass === 'Land')) ? '0 years' : (coAsset.usefulLife ? `${coAsset.usefulLife} years` : '-')}</div>

                  <div><span className="font-bold">Rate of Depreciation:</span> {coAsset.ppeClass && (coAsset.ppeClass.includes('Construction in Progress') || coAsset.ppeClass === 'Land' || coAsset.ppeClass === 'Land Improvements, Reforestation Projects') ? '0%' : (coAsset.depreciationRate ? `${coAsset.depreciationRate}%` : '-')}</div>

                </div>

                

                <table className="w-full text-[10px] border-collapse border border-gray-800">

                  <thead className="bg-gray-200">

                    <tr>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Date</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Reference</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" colSpan={3}>Receipt</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Accumulated Depreciation</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Accumulated Impairment Losses</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Issues/ Transfers/ Adjustments</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" rowSpan={2}>Adjusted Cost</th>

                      <th className="border border-gray-800 px-3 py-3 text-center" colSpan={2}>Repair History</th>

                    </tr>

                    <tr>

                      <th className="border border-gray-800 px-3 py-2 text-center">Qty.</th>

                      <th className="border border-gray-800 px-3 py-2 text-center">Unit Cost</th>

                      <th className="border border-gray-800 px-3 py-2 text-center">Total Cost</th>

                      <th className="border border-gray-800 px-3 py-2 text-center">Nature of Repair</th>

                      <th className="border border-gray-800 px-3 py-2 text-center">Amount</th>

                    </tr>

                  </thead>

                  <tbody>

                    <tr>

                      <td className="border border-gray-800 px-3 py-3">{coAsset.dateAcquired ? new Date(coAsset.dateAcquired).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</td>

                      <td className="border border-gray-800 px-3 py-3">{coAsset.propertyNumber}</td>

                      <td className="border border-gray-800 px-3 py-3 text-center">{coAsset.quantity || 1}</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">{formatCurrency(coAsset.unitCost)}</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">{formatCurrency(coAsset.totalCost || coAsset.unitCost)}</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">-</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">-</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">-</td>

                      <td className="border border-gray-800 px-3 py-3 text-right">{formatCurrency(coAsset.totalCost || coAsset.unitCost)}</td>

                      <td className="border border-gray-800 px-3 py-3"></td>

                      <td className="border border-gray-800 px-3 py-3"></td>

                    </tr>

                    {(depreciationLog || []).filter(d => d.assetId === coAsset.id).sort((a, b) => a.year - b.year).map((d, i) => (

                      <tr key={i}>

                        <td className="border border-gray-800 px-3 py-3">{d.year}</td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                        <td className="border border-gray-800 px-3 py-3 text-right">{formatCurrency(d.accumulatedDepreciation)}</td>

                        <td className="border border-gray-800 px-3 py-3 text-right">-</td>

                        <td className="border border-gray-800 px-3 py-3 text-right">-</td>

                        <td className="border border-gray-800 px-3 py-3 text-right">{formatCurrency(d.endingBookValue)}</td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                        <td className="border border-gray-800 px-3 py-3"></td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Add/Edit Property Slide-in Panel */}

      {showAddForm && (

        <div className="fixed inset-0 z-50">

          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => { setShowAddForm(false); setEditingAsset(null); }}></div>

          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">

            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-5 flex items-center justify-between sticky top-0 z-10">

              <div><h2 className="text-xl font-bold">{editingAsset ? "Edit Property" : "Add New Property"}</h2><p className="text-green-100 text-xs">Property, Plant & Equipment Entry</p></div>

              <button onClick={() => { setShowAddForm(false); setEditingAsset(null); }} className="p-2 hover:bg-white/20 rounded-lg"><ArrowLeftIcon className="w-6 h-6" /></button>

            </div>

            <div className="p-6">

              <AssetForm 
                asset={editingAsset} 
                onAssetSaved={() => { fetchAssets(); fetchAllData(); setShowAddForm(false); setEditingAsset(null); }} 
                onCancel={() => { setShowAddForm(false); setEditingAsset(null); }}
                onLocalUpdate={(assetId) => {
                  setRecentLocalUpdates(prev => new Set([...prev, assetId]));
                  console.log('Tracking local update for asset:', assetId);
                }}
              />

            </div>

          </div>

        </div>

      )}

    </div>

  );

}





