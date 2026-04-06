import { calculateDepreciation } from '../data/ppeClasses.js';

// Calculate years since acquisition with proper partial year handling
export const calculateYearsUsed = (acquisitionDate) => {
  if (!acquisitionDate) return 0;
  const acquired = new Date(acquisitionDate);
  const now = new Date();
  const years = (now - acquired) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, years);
};

// Fix depreciation calculations for an asset
export const fixAssetDepreciation = (asset) => {
  if (!asset.dateAcquired || !asset.usefulLife || asset.usefulLife <= 0) {
    return asset; // Return unchanged if can't calculate
  }

  const yearsUsed = calculateYearsUsed(asset.dateAcquired);
  const depreciation = calculateDepreciation(
    asset.totalCost || 0,
    asset.usefulLife,
    yearsUsed
  );

  return {
    ...asset,
    annualDepreciation: depreciation.annualDepreciation,
    accumulatedDepreciation: depreciation.accumulatedDepreciation,
    netBookValue: depreciation.netBookValue,
    residualValue: depreciation.residualValue,
    depreciableAmount: depreciation.depreciableAmount,
    rateOfDepreciation: depreciation.rateOfDepreciation
  };
};

// API call to update asset with correct depreciation
export const updateAssetDepreciation = async (assetId) => {
  try {
    const response = await fetch(`http://localhost:4000/api/assets/${assetId}`);
    const asset = await response.json();
    
    const fixedAsset = fixAssetDepreciation(asset);
    
    const updateResponse = await fetch(`http://localhost:4000/api/assets/${assetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fixedAsset)
    });
    
    return updateResponse.ok;
  } catch (error) {
    console.error('Error updating asset depreciation:', error);
    return false;
  }
};
