// DENR_PENRO PPE Classes Lookup Data
// Maps PPE Class to Account Code and Useful Life (Years)

export const ppeClassesData = {
  "Land": {
    accountCode: "10601010",
    usefulLife: null, // Land is not depreciated
    rateOfDepreciation: 0
  },
  "Land Improvements, Reforestation Projects": {
    accountCode: "10602020",
    usefulLife: null, // No specific useful life
    rateOfDepreciation: null
  },
  "Other Land Improvements": {
    accountCode: "10602990",
    usefulLife: 20,
    rateOfDepreciation: 5.00 // 100% / 20 years
  },
  "Water Supply Systems": {
    accountCode: "10603040",
    usefulLife: 15,
    rateOfDepreciation: 6.67 // 100% / 15 years
  },
  "Power Supply Systems": {
    accountCode: "10603050",
    usefulLife: 20,
    rateOfDepreciation: 5.00 // 100% / 20 years
  },
  "Buildings": {
    accountCode: "10604010",
    usefulLife: 30,
    rateOfDepreciation: 3.33 // 100% / 30 years
  },
  "Other Structures": {
    accountCode: "10604990",
    usefulLife: 20,
    rateOfDepreciation: 5.00 // 100% / 20 years
  },
  "Office Equipment": {
    accountCode: "10605020",
    usefulLife: 5,
    rateOfDepreciation: 20.00 // 100% / 5 years
  },
  "Information and Communication Technology Equipment": {
    accountCode: "10605030",
    usefulLife: 5,
    rateOfDepreciation: 20.00 // 100% / 5 years
  },
  "Communication Equipment": {
    accountCode: "10605070",
    usefulLife: 5,
    rateOfDepreciation: 20.00 // 100% / 5 years
  },
  "Technical and Scientific Equipment": {
    accountCode: "10605140",
    usefulLife: 7,
    rateOfDepreciation: 14.29 // 100% / 7 years
  },
  "Motor Vehicles": {
    accountCode: "10606010",
    usefulLife: 7,
    rateOfDepreciation: 14.29 // 100% / 7 years
  },
  "Furniture and Fixtures": {
    accountCode: "10607010",
    usefulLife: 10,
    rateOfDepreciation: 10.00 // 100% / 10 years
  },
  "Construction in Progress - Land Improvements": {
    accountCode: "10699010",
    usefulLife: null, // No depreciation until completion
    rateOfDepreciation: null
  },
  "Construction in Progress - Buildings and Other Structures": {
    accountCode: "10699030",
    usefulLife: null, // No depreciation until completion
    rateOfDepreciation: null
  },
  "Disaster Response and Rescue Equipment": {
    accountCode: "10605090",
    usefulLife: 5,
    rateOfDepreciation: 20.00 // 100% / 5 years
  }
};

// Offices/Places dropdown data
export const officesData = [
  "PENRO",
  "Initao",
  "Gingoog",
  "Balatukan",
  "BALATUKAN",
  "Mimbilisan",
  "ILPLS",
  "INREMP"
];

// Fund Cluster options
export const fundClusters = [
  "Regular Agency Fund",
  "Foreign Assisted Projects Fund",
  "Special Account - Locally Funded/Domestic Grants Fund",
  "Special Account - Foreign Assisted/Foreign Grants Fund",
  "Internally Generated Funds",
  "Business Related Funds",
  "Trust Receipts"
];

// Get all PPE class names for dropdown
export const getPPEClassOptions = () => Object.keys(ppeClassesData);

// Get account code and useful life for a PPE class
export const getPPEClassDetails = (ppeClass) => {
  return ppeClassesData[ppeClass] || null;
};

// Calculate depreciation values
export const calculateDepreciation = (cost, usefulLife, yearsUsed = 0) => {
  if (!cost || !usefulLife || usefulLife <= 0) {
    return {
      residualValue: 0,
      depreciableAmount: 0,
      annualDepreciation: 0,
      accumulatedDepreciation: 0,
      netBookValue: cost || 0,
      rateOfDepreciation: 0
    };
  }

  // Standard residual value is 5% of cost for government assets
  const residualValue = cost * 0.05;
  const depreciableAmount = cost - residualValue;
  const annualDepreciation = depreciableAmount / usefulLife;
  const accumulatedDepreciation = annualDepreciation * yearsUsed;
  // Net Book Value should not go below residual value
  const netBookValue = Math.max(residualValue, cost - accumulatedDepreciation);
  const rateOfDepreciation = (100 / usefulLife).toFixed(2);

  return {
    residualValue,
    depreciableAmount,
    annualDepreciation,
    accumulatedDepreciation,
    netBookValue,
    rateOfDepreciation: parseFloat(rateOfDepreciation)
  };
};
