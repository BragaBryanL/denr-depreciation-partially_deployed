import { useState, useEffect, useRef, useCallback } from "react";
import { ppeClassesData, officesData, fundClusters, calculateDepreciation } from "./data/ppeClasses";
import { showNotification } from "./utils/notificationHelpers";
import { saveAsset, updateAsset, deleteAsset as deleteAssetFromFirebase, addAssetHistory } from "./firebase";
import { CalculatorIcon, CalendarIcon, DocumentTextIcon, BuildingOfficeIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export default function AssetForm({ asset = null, onAssetSaved, onCancel, onLocalUpdate }) {
  // State declarations - all at the top
  const [localNotification, setLocalNotification] = useState(null);
  const [errors, setErrors] = useState({});
  const [firstErrorRef, setFirstErrorRef] = useState(null);
  
  // Form fields
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
  
  // Auto-calculated fields
  const [accountCode, setAccountCode] = useState("");
  const [usefulLife, setUsefulLife] = useState("");
  const [rateOfDepreciation, setRateOfDepreciation] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [residualValue, setResidualValue] = useState("");
  const [depreciableAmount, setDepreciableAmount] = useState("");
  const [annualDepreciation, setAnnualDepreciation] = useState("");
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState("0");
  const [netBookValue, setNetBookValue] = useState("");
  const [remarks, setRemarks] = useState("");
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Constants - declare after state
  const ppeOptions = Object.keys(ppeClassesData);
  const isProduction = import.meta.env.PROD || !window.location.hostname.includes('localhost');

  // Helper functions
  const showLocalNotification = useCallback((message, field = null) => {
    setLocalNotification(message);
    if (field) {
      setFirstErrorRef(field);
      setTimeout(() => {
        const element = document.getElementById(field);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }, 100);
    }
    setTimeout(() => setLocalNotification(null), 4000);
  }, []);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Generate property number in format: 0000-00-00-0000-00 (manual function available)
  const generatePropertyNumber = useCallback(() => {
    const currentYear = new Date().getFullYear().toString();
    const ppeCode = ppeClass && ppeClassesData[ppeClass] ? ppeClassesData[ppeClass].accountCode.substring(0, 2) : "00";
    const glCode = accountCode ? accountCode.substring(2, 6) : "0000";
    const serialNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const locationCode = office ? office.substring(0, 2).toUpperCase() : "00";
    
    return `${currentYear}-${ppeCode}-${glCode}-${serialNumber}-${locationCode}`;
  }, [ppeClass, accountCode, office]);

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

  // Handle PPE Class selection
  const handlePPEClassChange = useCallback((e) => {
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
  }, [unitCost, quantity, usefulLife]);

  // Handle cost change
  const handleCostChange = useCallback((e) => {
    const value = e.target.value;
    setUnitCost(value);
    setErrors(prev => ({ ...prev, unitCost: null }));
    recalculateDepreciation(value, quantity, usefulLife);
  }, [quantity, usefulLife]);

  const handleQuantityChange = useCallback((e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(value);
    recalculateDepreciation(unitCost, value, usefulLife);
  }, [unitCost, usefulLife]);

  // Calculate years since acquisition
  const calculateYearsUsed = useCallback((acquisitionDate) => {
    if (!acquisitionDate) return 0;
    const acquired = new Date(acquisitionDate);
    const now = new Date();
    const years = (now - acquired) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, years);
  }, []);

  // Handle Useful Life manual input change
  const handleUsefulLifeChange = useCallback((e) => {
    const value = e.target.value;
    setUsefulLife(value);
    
    if (value === "0") {
      setRateOfDepreciation("0");
      recalculateDepreciation(unitCost, quantity, "0", dateAcquired);
    } else if (value && parseInt(value) > 0) {
      const rate = (100 / parseInt(value)).toFixed(2);
      setRateOfDepreciation(rate);
      recalculateDepreciation(unitCost, quantity, value, dateAcquired);
    } else if (value === "") {
      setRateOfDepreciation("");
      recalculateDepreciation(unitCost, quantity, "", dateAcquired);
    }
  }, [unitCost, quantity, dateAcquired]);

  // Handle Rate of Depreciation manual input change
  const handleRateChange = useCallback((e) => {
    const value = e.target.value;
    setRateOfDepreciation(value);
    
    if (value && parseFloat(value) > 0 && unitCost) {
      const years = Math.round(100 / parseFloat(value));
      setUsefulLife(years.toString());
      recalculateDepreciation(unitCost, quantity, years.toString(), dateAcquired);
    } else if (value === "") {
      setUsefulLife("");
      recalculateDepreciation(unitCost, quantity, "", dateAcquired);
    }
  }, [unitCost, quantity, dateAcquired]);

  // Automatic depreciation calculations
  const recalculateDepreciation = useCallback((cost, qty = quantity, life = usefulLife, dateAcq = dateAcquired) => {
    const total = (parseFloat(cost) || 0) * qty;
    setTotalCost(total.toFixed(2));

    if (cost && life === "0") {
      setResidualValue("0.00");
      setDepreciableAmount("0.00");
      setAnnualDepreciation("0.00");
      setAccumulatedDepreciation("0.00");
      setNetBookValue(total.toFixed(2));
    } else if (cost && life && parseInt(life) > 0) {
      const yearsUsed = calculateYearsUsed(dateAcq);
      const depreciation = calculateDepreciation(total, parseInt(life), yearsUsed);
      setResidualValue(depreciation.residualValue.toFixed(2));
      setDepreciableAmount(depreciation.depreciableAmount.toFixed(2));
      setAnnualDepreciation(depreciation.annualDepreciation.toFixed(2));
      setAccumulatedDepreciation(depreciation.accumulatedDepreciation.toFixed(2));
      setNetBookValue(depreciation.netBookValue.toFixed(2));
    } else {
      setResidualValue("0.00");
      setDepreciableAmount("0.00");
      setAnnualDepreciation("0.00");
      setAccumulatedDepreciation("0.00");
      setNetBookValue(total.toFixed(2));
    }
  }, [quantity, usefulLife, dateAcquired, calculateYearsUsed]);

  // Update calculations when useful life or date acquired changes
  useEffect(() => {
    if (unitCost && usefulLife) {
      recalculateDepreciation(unitCost, quantity, usefulLife, dateAcquired);
    }
  }, [usefulLife, dateAcquired, quantity, recalculateDepreciation, unitCost]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setFirstErrorRef(null);

    // Validation
    const newErrors = {};
    let firstErrorField = null;

    if (!entityName) {
      newErrors.entityName = "Please select an Entity Name";
      if (!firstErrorField) firstErrorField = "entityName";
    }
    if (!fundCluster || fundCluster === "Choose Fund Cluster") {
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
        console.log('Production mode - trying Firebase first for cross-device sync...');
        
        try {
          if (asset && asset.id) {
            result = await updateAsset(asset.id, assetData);
          } else {
            result = await saveAsset(assetData);
          }

          if (result.success) {
            console.log('Firebase operation successful');
            showNotification("Asset saved successfully!", "success");
            
            if (onAssetSaved) {
              onAssetSaved();
            }
          } else {
            console.log('Firebase operation failed, using localStorage fallback');
          }
        } catch (error) {
          console.log('Firebase error, using localStorage fallback:', error);
        }

        // Always save to localStorage as backup
        const localAssets = JSON.parse(localStorage.getItem('denr_assets') || '[]');
        const newAsset = {
          ...assetData,
          id: asset?.id || Date.now().toString(),
          createdAt: asset?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (asset && asset.id) {
          const index = localAssets.findIndex(a => a.id === asset.id);
          if (index !== -1) {
            localAssets[index] = newAsset;
          } else {
            localAssets.push(newAsset);
          }
        } else {
          localAssets.push(newAsset);
        }

        localStorage.setItem('denr_assets', JSON.stringify(localAssets));
        
        // Track this as a recent local update to prevent real-time listener overwriting
        if (onLocalUpdate && newAsset.id) {
          onLocalUpdate(newAsset.id);
        }
        
        if (!result?.success) {
          showNotification("Asset saved locally!", "success");
          if (onAssetSaved) {
            onAssetSaved();
          }
        }
      } else {
        // Development mode
        const response = await fetch("http://localhost:4000/api/assets", {
          method: asset && asset.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetData)
        });
        
        if (response.ok) {
          showNotification("Asset saved successfully!", "success");
          if (onAssetSaved) {
            onAssetSaved();
          }
        } else {
          showNotification("Failed to save asset. Please try again.", "error");
        }
      }
    } catch (error) {
      console.error("Error saving asset:", error);
      showNotification("Error saving asset. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [entityName, fundCluster, propertyNumber, office, ppeClass, accountableOfficer, description, accountCode, usefulLife, rateOfDepreciation, dateAcquired, quantity, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation, accumulatedDepreciation, netBookValue, remarks, asset, isProduction, onAssetSaved, showLocalNotification]);

  // Reset form
  const resetForm = useCallback(() => {
    setEntityName("DENR - PENRO");
    setFundCluster("Choose Fund Cluster");
    setPropertyNumber("");
    setOffice("");
    setPpeClass("");
    setAccountableOfficer("");
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
  }, []);

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center gap-3">
            <BuildingOfficeIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Basic Information</h3>
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
                <input
                  id="propertyNumber"
                  type="text"
                  value={propertyNumber}
                  onChange={(e) => {
                    // Auto-format with dashes: 0000-00-00-0000-00
                    let value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numbers
                    
                    // Auto-add dashes at correct positions
                    if (value.length > 4) {
                      value = value.slice(0, 4) + '-' + value.slice(4);
                    }
                    if (value.length > 7) {
                      value = value.slice(0, 7) + '-' + value.slice(7);
                    }
                    if (value.length > 10) {
                      value = value.slice(0, 10) + '-' + value.slice(10);
                    }
                    if (value.length > 15) {
                      value = value.slice(0, 15); // Limit to 15 chars (0000-00-00-0000-00)
                    }
                    
                    setPropertyNumber(value);
                    setErrors(prev => ({ ...prev, propertyNumber: null }));
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 font-mono ${errors.propertyNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                  placeholder="0000-00-00-0000-00"
                  maxLength="15"
                />
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

        {/* Section 2: Property Details */}
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
            </div>
          </div>
        </div>

        {/* Section 3: Acquisition Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Acquisition Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit Cost (PHP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    id="unitCost"
                    type="text"
                    value={unitCost}
                    onChange={handleCostChange}
                    className={`w-full pl-12 pr-3 py-3 border-2 rounded-xl focus:outline-none transition-colors bg-gray-50 font-mono ${errors.unitCost ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Cost (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    type="text"
                    value={totalCost}
                    readOnly
                    className="w-full pl-12 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Depreciation Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Depreciation Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Code
                </label>
                <input
                  type="text"
                  value={accountCode}
                  readOnly
                  className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Useful Life (Years)
                </label>
                <input
                  type="text"
                  value={usefulLife}
                  onChange={handleUsefulLifeChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50 font-mono"
                  placeholder="Auto-filled"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rate of Depreciation (%)
                </label>
                <input
                  type="text"
                  value={rateOfDepreciation}
                  onChange={handleRateChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50 font-mono"
                  placeholder="Auto-calculated"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Residual Value (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    type="text"
                    value={residualValue}
                    readOnly
                    className="w-full pl-12 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Depreciable Amount (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    type="text"
                    value={depreciableAmount}
                    readOnly
                    className="w-full pl-12 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Annual Depreciation (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    type="text"
                    value={annualDepreciation}
                    readOnly
                    className="w-full pl-12 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Accumulated Depreciation (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">PHP</span>
                  <input
                    type="text"
                    value={accumulatedDepreciation}
                    readOnly
                    className="w-full pl-12 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Net Book Value (PHP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold">PHP</span>
                  <input
                    type="text"
                    value={netBookValue}
                    readOnly
                    className="w-full pl-12 pr-3 py-4 bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-600 rounded-xl text-white font-bold text-lg"
                  />
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
