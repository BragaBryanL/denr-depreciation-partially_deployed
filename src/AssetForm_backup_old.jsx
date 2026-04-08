import { useState, useEffect, useRef, useCallback } from "react";
import { ppeClassesData, officesData, fundClusters, calculateDepreciation } from "./data/ppeClasses";
import { showNotification } from "./utils/notificationHelpers";
import { saveAsset, updateAsset, deleteAsset as deleteAssetFromFirebase, addAssetHistory } from "./firebase";
import { CalculatorIcon, CalendarIcon, DocumentTextIcon, BuildingOfficeIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

// Production check - move outside component
const isProduction = import.meta.env.PROD || !window.location.hostname.includes('localhost');

export default function AssetForm({ asset = null, onAssetSaved, onCancel }) {
  // PPE options for dropdown - declare first
  const ppeOptions = Object.keys(ppeClassesData);
  
  // Local notification state for form validation alerts
  const [localNotification, setLocalNotification] = useState(null);
  const [errors, setErrors] = useState({});
  const firstErrorRef = useRef(null);

  // Show local notification helper for form validation
  const showLocalNotification = (message, field = null) => {
    setLocalNotification(message);
    if (field && firstErrorRef.current !== field) {
      firstErrorRef.current = field;
      setTimeout(() => {
        const element = document.getElementById(field);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }, 100);
    }
    setTimeout(() => setLocalNotification(null), 4000);
  };

  // Generate property number in format: 0000-00-00-0000-00
  const generatePropertyNumber = () => {
    const currentYear = new Date().getFullYear().toString();
    const ppeCode = ppeClass && ppeClassesData[ppeClass] ? ppeClassesData[ppeClass].accountCode.substring(0, 2) : "00";
    const glCode = accountCode ? accountCode.substring(2, 6) : "0000";
    const serialNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const locationCode = office ? office.substring(0, 2).toUpperCase() : "00";
    
    return `${currentYear}-${ppeCode}-${glCode}-${serialNumber}-${locationCode}`;
  };

  // Auto-generate property number when PPE class and office are selected
  useEffect(() => {
    if (ppeClass && office && !propertyNumber) {
      const generatedNumber = generatePropertyNumber();
      setPropertyNumber(generatedNumber);
    }
  }, [ppeClass, office]);

  // Manual Input Fields
  const [entityName, setEntityName] = useState("DENR - PENRO");
  const [fundCluster, setFundCluster] = useState("Choose Fund Cluster");
  const [propertyNumber, setPropertyNumber] = useState("");
  const [office, setOffice] = useState("");
  const [ppeClass, setPpeClass] = useState("");
  const [accountableOfficer, setAccountableOfficer] = useState("");
  const [description, setDescription] = useState("");
  const [dateAcquired, setDateAcquired] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState("");

  // Automatic/Editable Fields - Now editable for manual input
  const [accountCode, setAccountCode] = useState("");
  const [usefulLife, setUsefulLife] = useState("");
  const [rateOfDepreciation, setRateOfDepreciation] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [residualValue, setResidualValue] = useState("");
  const [depreciableAmount, setDepreciableAmount] = useState("");
  const [annualDepreciation, setAnnualDepreciation] = useState("");
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState("0");
  const [netBookValue, setNetBookValue] = useState("");

  // Additional Fields
  const [remarks, setRemarks] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Populate form when editing existing asset
  useEffect(() => {
    if (asset) {
      setEntityName(asset.entityName || "DENR - Provincial Environment and Natural Resources Office (PENRO)");
      setFundCluster(asset.fundCluster || "Choose Fund Cluster");
      setPropertyNumber(asset.propertyNumber || "");
      setOffice(asset.office || "");
      setPpeClass(asset.ppeClass || "");
      setAccountableOfficer(asset.accountableOfficer || "");
      setDescription(asset.description || "");
      setDateAcquired(asset.dateAcquired || "");
      setQuantity(asset.quantity || 1);
      setUnitCost(asset.unitCost?.toString() || "");
      setAccountCode(asset.accountCode || "");
      setUsefulLife(asset.usefulLife?.toString() || "");
      setRateOfDepreciation(asset.rateOfDepreciation?.toString() || "");
      setTotalCost(asset.totalCost?.toString() || "");
      setResidualValue(asset.residualValue?.toString() || "");
      setAccumulatedDepreciation(asset.accumulatedDepreciation?.toString() || "0");
      setNetBookValue(asset.netBookValue?.toString() || "");
      setRemarks(asset.remarks || "");
    }
  }, [asset]);

  // Handle PPE Class selection - Auto-fill Account Code, Useful Life, Rate
  const handlePPEClassChange = (e) => {
    const selected = e.target.value;
    setPpeClass(selected);
    setErrors(prev => ({ ...prev, ppeClass: null }));

    if (selected && ppeClassesData[selected]) {
      const data = ppeClassesData[selected];
      setAccountCode(data.accountCode);
      setUsefulLife(data.usefulLife?.toString() || "");
      setRateOfDepreciation(data.rateOfDepreciation?.toString() || "");
    } else {
      setAccountCode("");
      setUsefulLife("");
      setRateOfDepreciation("");
    }

    recalculateDepreciation(unitCost, quantity, usefulLife);
  };

  // Handle cost change - recalculate totals
  const handleCostChange = (e) => {
    const value = e.target.value;
    setUnitCost(value);
    setErrors(prev => ({ ...prev, unitCost: null }));
    recalculateDepreciation(value, quantity, usefulLife);
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(value);
    recalculateDepreciation(unitCost, value, usefulLife);
  };

  // Calculate years since acquisition
  const calculateYearsUsed = (acquisitionDate) => {
    if (!acquisitionDate) return 0;
    const acquired = new Date(acquisitionDate);
    const now = new Date();
    const years = (now - acquired) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, years);
  };

  // Handle Useful Life manual input change
  const handleUsefulLifeChange = (e) => {
    const value = e.target.value;
    setUsefulLife(value);
    
    // Allow 0 (for items like Land that don't depreciate), blank, or positive numbers
    if (value === "0") {
      // 0 years - no depreciation (e.g., Land)
      setRateOfDepreciation("0");
      recalculateDepreciation(unitCost, quantity, "0", dateAcquired);
    } else if (value && parseInt(value) > 0) {
      // Positive number - calculate rate
      const rate = (100 / parseInt(value)).toFixed(2);
      setRateOfDepreciation(rate);
      recalculateDepreciation(unitCost, quantity, value, dateAcquired);
    } else if (value === "") {
      // Blank - reset related fields
      setRateOfDepreciation("");
      recalculateDepreciation(unitCost, quantity, "", dateAcquired);
    }
  };

  // Handle Rate of Depreciation manual input change
  const handleRateChange = (e) => {
    const value = e.target.value;
    setRateOfDepreciation(value);
    
    // Only calculate if value is provided and greater than 0
    if (value && parseFloat(value) > 0 && unitCost) {
      const years = Math.round(100 / parseFloat(value));
      setUsefulLife(years.toString());
      recalculateDepreciation(unitCost, quantity, years.toString(), dateAcquired);
    } else if (value === "") {
      // Allow blank/empty rate - reset useful life
      setUsefulLife("");
      recalculateDepreciation(unitCost, quantity, "", dateAcquired);
    }
  };

  // Automatic depreciation calculations
  const recalculateDepreciation = useCallback((cost, qty = quantity, life = usefulLife, dateAcq = dateAcquired) => {
    const total = (parseFloat(cost) || 0) * qty;
    setTotalCost(total.toFixed(2));

    // Handle 0 useful life (no depreciation - e.g., Land)
    if (cost && life === "0") {
      // No depreciation - full value retained
      setResidualValue("0.00");
      setDepreciableAmount("0.00");
      setAnnualDepreciation("0.00");
      setAccumulatedDepreciation("0.00");
      setNetBookValue(total.toFixed(2));
    } else if (cost && life && parseInt(life) > 0) {
      // Normal depreciation calculation
      const yearsUsed = calculateYearsUsed(dateAcq);
      const depreciation = calculateDepreciation(total, parseInt(life), yearsUsed);
      setResidualValue(depreciation.residualValue.toFixed(2));
      setDepreciableAmount(depreciation.depreciableAmount.toFixed(2));
      setAnnualDepreciation(depreciation.annualDepreciation.toFixed(2));
      setAccumulatedDepreciation(depreciation.accumulatedDepreciation.toFixed(2));
      setNetBookValue(depreciation.netBookValue.toFixed(2));
    } else {
      // Blank or invalid - no depreciation calculated
      setResidualValue("0.00");
      setDepreciableAmount("0.00");
      setAnnualDepreciation("0.00");
      setAccumulatedDepreciation("0.00");
      setNetBookValue(total.toFixed(2));
    }
  }, [quantity, usefulLife, dateAcquired]);

  // Update calculations when useful life or date acquired changes
  useEffect(() => {
    if (unitCost && usefulLife) {
      recalculateDepreciation(unitCost, quantity, usefulLife, dateAcquired);
    }
  }, [usefulLife, dateAcquired, quantity, recalculateDepreciation, unitCost]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    firstErrorRef.current = null;

    // Custom validation - check required fields
    const newErrors = {};
    let firstErrorField = null;

    if (!entityName) {
      newErrors.entityName = "Please select an Entity Name";
      if (!firstErrorField) firstErrorField = "entityName";
    }
    if (!fundCluster) {
      newErrors.fundCluster = "Please select a Fund Cluster";
      if (!firstErrorField) firstErrorField = "fundCluster";
    }
    if (!propertyNumber) {
      newErrors.propertyNumber = "Please enter a Property Number";
      if (!firstErrorField) firstErrorField = "propertyNumber";
    }
    if (!office) {
      newErrors.office = "Please select an Office/Place";
      if (!firstErrorField) firstErrorField = "office";
    }
    if (!ppeClass) {
      newErrors.ppeClass = "Please select a PPE Class";
      if (!firstErrorField) firstErrorField = "ppeClass";
    }
    if (!description) {
      newErrors.description = "Please enter a Property Description";
      if (!firstErrorField) firstErrorField = "description";
    }
    if (!dateAcquired) {
      newErrors.dateAcquired = "Please select a Date Acquired";
      if (!firstErrorField) firstErrorField = "dateAcquired";
    }
    if (!unitCost || parseFloat(unitCost) <= 0) {
      newErrors.unitCost = "Please enter a valid Unit Cost";
      if (!firstErrorField) firstErrorField = "unitCost";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      
      // Show notification and scroll to first error
      const errorCount = Object.keys(newErrors).length;
      const fieldName = newErrors[firstErrorField];
      showLocalNotification(`Missing ${errorCount} required field(s). First: ${fieldName}`, firstErrorField);
      return;
    }

    setErrors({});

    const assetData = {
      entityName,
      fundCluster,
      propertyNumber,
      office,
      ppeClass,
      accountableOfficer,
      description,
      accountCode,
      usefulLife: usefulLife ? parseInt(usefulLife) : null,
      rateOfDepreciation: rateOfDepreciation ? parseFloat(rateOfDepreciation) : null,
      dateAcquired,
      quantity: parseInt(quantity),
      unitCost: parseFloat(unitCost),
      totalCost: parseFloat(totalCost),
      residualValue: parseFloat(residualValue),
      depreciableAmount: parseFloat(depreciableAmount),
      annualDepreciation: parseFloat(annualDepreciation),
      accumulatedDepreciation: parseFloat(accumulatedDepreciation),
      netBookValue: parseFloat(netBookValue),
      remarks
    };

    try {
      let result;
      
      if (isProduction) {
        // Production mode - try Firebase first for cross-device sync
        console.log('Production mode - trying Firebase first for cross-device sync...');
        
        try {
          if (asset && asset.id) {
            // Update existing asset in Firebase
            result = await updateAsset(asset.id, assetData);
          } else {
            // Add new asset to Firebase
            result = await saveAsset(assetData);
          }
          
          if (result.success) {
            console.log('Firebase save successful');
            // Don't modify assetData with Firebase ID - Firebase handles IDs automatically
          } else {
            console.log('Firebase save failed, will use localStorage only');
          }
        } catch (firebaseError) {
          console.log('Firebase save error, using localStorage only:', firebaseError);
        }
      }
      
      // Always save to localStorage (fast and reliable)
      console.log('Saving to localStorage...');
      const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
      const newAsset = {
        ...assetData,
        id: asset?.id || Date.now().toString(), // Use existing asset ID, don't create new one
        createdAt: asset?.createdAt || new Date().toISOString(), // Preserve original creation time
        updatedAt: new Date().toISOString()
      };
      
      if (asset && asset.id) {
        // Update existing asset
        const index = localAssets.findIndex(a => a.id === asset.id);
        if (index !== -1) {
          localAssets[index] = newAsset;
        } else {
          localAssets.push(newAsset);
        }
      } else {
        // Add new asset
        localAssets.push(newAsset);
      }
      
      localStorage.setItem('denr_assets', JSON.stringify(localAssets));
      
      // Try Firebase in background (non-blocking)
      if (isProduction) {
        console.log('Attempting Firebase save in background...');
        saveAsset(assetData).then(firebaseResult => {
          if (firebaseResult.success) {
            console.log('Firebase save successful');
            
            // Add to asset history
            const historyEntry = {
              assetId: firebaseResult.id || newAsset.id,
              action: asset && asset.id ? 'updated' : 'created',
              description: asset && asset.id ? 'Asset updated' : 'Asset created',
              timestamp: new Date().toISOString(),
              changes: asset && asset.id ? assetData : null
            };
            
            addAssetHistory(historyEntry).then(historyResult => {
              if (historyResult.success) {
                console.log('Asset history recorded');
              } else {
                console.log('Failed to record asset history');
              }
            });
          } else {
            console.log('Firebase save failed, using localStorage only');
          }
        }).catch(err => {
          console.log('Firebase save error:', err);
        });
      }
      
      // Immediate success since localStorage is fast
      setSuccessMessage(asset && asset.id ? "Asset updated successfully!" : "Asset saved successfully!");
      resetForm();
      if (onAssetSaved) {
        onAssetSaved();
      }
      
    } catch (error) {
      console.error("Error saving asset:", error);
      showNotification("Error saving asset. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEntityName("");
    setFundCluster("");
    setPropertyNumber("");
    setOffice("");
    setPpeClass("");
    setDescription("");
    setDateAcquired("");
    setQuantity(1);
    setUnitCost("");
    setAccountCode("");
    setUsefulLife("");
    setRateOfDepreciation("");
    setTotalCost("");
    setResidualValue("");
    setDepreciableAmount("");
    setAnnualDepreciation("");
    setAccumulatedDepreciation("0");
    setNetBookValue("");
    setRemarks("");
    setErrors({});
    setLocalNotification(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Local Notification Banner */}
      {localNotification && (
        <div className="mb-4 alert alert-danger d-flex align-items-center" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <span className="me-auto">{localNotification}</span>
          <button type="button" onClick={() => setLocalNotification(null)} className="btn-close ms-2" aria-label="Close"></button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Manual Inputs - Entity & Location */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center gap-3">
            <BuildingOfficeIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Entity & Location</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="entityName"
                  type="text"
                  value={entityName}
                  onChange={(e) => { setEntityName(e.target.value); setErrors(prev => ({ ...prev, entityName: null })); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.entityName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                />
                {errors.entityName && <p className="text-red-500 text-xs mt-1">{errors.entityName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fund Cluster <span className="text-red-500">*</span>
                </label>
                <select
                  id="fundCluster"
                  value={fundCluster}
                  onChange={(e) => { setFundCluster(e.target.value); setErrors(prev => ({ ...prev, fundCluster: null })); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.fundCluster ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                >
                  <option value="">Select Fund Cluster</option>
                  {fundClusters.map((cluster) => (
                    <option key={cluster} value={cluster}>{cluster}</option>
                  ))}
                </select>
                {errors.fundCluster && <p className="text-red-500 text-xs mt-1">{errors.fundCluster}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="propertyNumber"
                    type="text"
                    value={propertyNumber}
                    onChange={(e) => { setPropertyNumber(e.target.value); setErrors(prev => ({ ...prev, propertyNumber: null })); }}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 font-mono ${errors.propertyNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                    placeholder="Format: 0000-00-00-0000-00"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generatePropertyNumber();
                      setPropertyNumber(generated);
                      setErrors(prev => ({ ...prev, propertyNumber: null }));
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                    title="Generate property number"
                  >
                    Generate
                  </button>
                </div>
                {errors.propertyNumber && <p className="text-red-500 text-xs mt-1">{errors.propertyNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Office <span className="text-red-500">*</span>
                </label>
                <select
                  id="office"
                  value={office}
                  onChange={(e) => { setOffice(e.target.value); setErrors(prev => ({ ...prev, office: null })); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.office ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                >
                  <option value="">Select Office</option>
                  {officesData.map((office) => (
                    <option key={office} value={office}>{office}</option>
                  ))}
                </select>
                {errors.office && <p className="text-red-500 text-xs mt-1">{errors.office}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Manual Inputs - PPE Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Property Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PPE Class <span className="text-red-500">*</span>
                </label>
                <select
                  id="ppeClass"
                  value={ppeClass}
                  onChange={handlePPEClassChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.ppeClass ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                >
                  <option value="">Select PPE Class</option>
                  {ppeOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                {errors.ppeClass && <p className="text-red-500 text-xs mt-1">{errors.ppeClass}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Accountable Officer/End-User
                </label>
                <input
                  id="accountableOfficer"
                  type="text"
                  value={accountableOfficer}
                  onChange={(e) => setAccountableOfficer(e.target.value)}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 border-gray-200 focus:border-green-500"
                  placeholder="Enter name of accountable officer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Description <span className="text-red-500">*</span>
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: null })); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.description ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Manual Inputs - Acquisition */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Acquisition Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Acquired <span className="text-red-500">*</span>
                </label>
                <input
                  id="dateAcquired"
                  type="date"
                  value={dateAcquired}
                  onChange={(e) => { setDateAcquired(e.target.value); setErrors(prev => ({ ...prev, dateAcquired: null })); }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.dateAcquired ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                />
                {errors.dateAcquired && <p className="text-red-500 text-xs mt-1">{errors.dateAcquired}</p>}
              </div>

              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₱</span>
                  <input
                    id="unitCost"
                    type="number"
                    value={unitCost}
                    onChange={handleCostChange}
                    step="0.01"
                    min="0"
                    className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 ${errors.unitCost ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Automatic/Computed Values - Now Editable */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Depreciation Settings (Editable)</h3>
          </div>
          <div className="p-6">
            {/* PPE Classification Details - All Editable */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">PPE Classification</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account Code</label>
                  <input
                    type="text"
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-mono font-semibold focus:border-green-500 focus:outline-none"
                    placeholder="Auto-filled or enter manually"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Useful Life {!usefulLife && ppeClass && <span className="text-amber-600">(Manual needed)</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={usefulLife}
                      onChange={handleUsefulLifeChange}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold focus:border-green-500 focus:outline-none"
                      placeholder={ppeClass ? "Enter years (0 for no depreciation)" : "Select PPE class"}
                    />
                    {usefulLife && (
                      <span className="flex items-center text-green-800 font-semibold bg-green-100 px-3 rounded-xl">
                        yrs
                      </span>
                    )}
                  </div>
                  {!usefulLife && ppeClass && (
                    <p className="text-xs text-amber-600 mt-1">No predefined value. Enter manually.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Rate of Depreciation <span className="text-amber-600">(Adjust)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={rateOfDepreciation}
                      onChange={handleRateChange}
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold focus:border-green-500 focus:outline-none"
                      placeholder="Auto-calculated"
                    />
                    {rateOfDepreciation && (
                      <span className="flex items-center text-green-800 font-semibold bg-green-100 px-3 rounded-xl">
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Calculations - Read Only */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Cost & Depreciation (Auto-Calculated)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Total Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={totalCost}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Residual Value (5%)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={residualValue}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Depreciable Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={depreciableAmount}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Annual Depreciation</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={annualDepreciation}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Accumulated Depreciation</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={accumulatedDepreciation}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl text-orange-800 font-semibold"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Net Book Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold">₱</span>
                    <input
                      type="text"
                      value={netBookValue}
                      readOnly
                      className="w-full pl-7 pr-3 py-4 bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-600 rounded-xl text-white font-bold text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Remarks */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4 flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Remarks</h3>
          </div>
          <div className="p-6">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50 resize-none"
              placeholder="Additional notes or remarks..."
              rows="3"
            ></textarea>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 border-2 border-amber-300 text-amber-600 font-semibold rounded-xl hover:bg-amber-50 transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Save Asset
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
