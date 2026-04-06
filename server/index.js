import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
app.use(express.json());

// Test route at the very beginning
app.get("/api/first-test", (req, res) => {
  console.log('First test endpoint reached!');
  res.json({ success: true, message: "First test working!" });
});

// Open SQLite database
const dbPromise = open({
  filename: "../assets.db",
  driver: sqlite3.Database,
});

// Store original imported values to use as baseline - using property numbers as keys
let originalAssetValues = new Map();
let originalValuesStored = false; // Flag to prevent re-storing

// Set original values from current database (works for all assets) - using property numbers
const setOriginalValues = async () => {
  // Only store original values once
  if (originalValuesStored) {
    console.log('Original values already stored, skipping...');
    return;
  }
  
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets");
  
  // Store current database values as original baseline for all assets using property numbers
  for (const asset of assets) {
    originalAssetValues.set(asset.propertyNumber, {
      originalAnnualDepreciation: asset.annualDepreciation || 0,
      originalAccumulatedDepreciation: asset.accumulatedDepreciation || 0,
      originalNetBookValue: asset.netBookValue || 0
    });
  }
  
  originalValuesStored = true; // Set flag to prevent re-storing
  console.log('Original values stored for', originalAssetValues.size, 'assets using property numbers as keys (FINAL)');
};

// Helper function to apply monthly depreciation (extracted for reuse)
async function applyMonthlyDepreciation(targetDate) {
  const db = await dbPromise;
  
  try {
    const assets = await db.all("SELECT * FROM assets WHERE status = 'active'");
    console.log('Found assets for depreciation:', assets.length);
    
    // Store original values if not already stored
    if (originalAssetValues.size === 0) {
      await setOriginalValues();
    }
    
    let updatedCount = 0;
    const currentDate = targetDate ? new Date(targetDate) : new Date();
    console.log('Current date for calculation:', currentDate.toISOString());
    
    for (const asset of assets) {
      const acquisitionDate = new Date(asset.dateAcquired);
      const usefulLife = asset.usefulLife || 5;
      const totalCost = asset.totalCost || 0;
      const residualValue = asset.residualValue || 0;
      
      // Calculate months elapsed since acquisition
      const monthsElapsed = Math.max(0, 
        (currentDate.getFullYear() - acquisitionDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - acquisitionDate.getMonth())
      );
      
      // Calculate monthly depreciation
      const annualDepreciation = (totalCost - residualValue) / usefulLife;
      const monthlyDepreciation = annualDepreciation / 12;
      
      // Calculate accumulated depreciation (capped at depreciable amount)
      const depreciableAmount = totalCost - residualValue;
      const accumulatedDepreciation = Math.min(monthsElapsed * monthlyDepreciation, depreciableAmount);
      
      // Calculate net book value
      const netBookValue = Math.max(residualValue, totalCost - accumulatedDepreciation);
      
      // Update asset in database
      await db.run(
        "UPDATE assets SET accumulatedDepreciation = ?, netBookValue = ?, annualDepreciation = ? WHERE id = ?",
        [accumulatedDepreciation, netBookValue, annualDepreciation, asset.id]
      );
      
      updatedCount++;
    }
    
    console.log(`Monthly depreciation applied to ${updatedCount} assets`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error applying monthly depreciation:', error);
    return { success: false, error: error.message };
  }
}

// Create tables if not exists
(async () => {
  const db = await dbPromise;
  
  // Create assets table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityName TEXT,
      fundCluster TEXT,
      propertyNumber TEXT,
      propertyType TEXT,
      office TEXT,
      ppeClass TEXT,
      description TEXT,
      accountCode TEXT,
      usefulLife INTEGER,
      rateOfDepreciation REAL,
      dateAcquired TEXT,
      reference TEXT,
      receipt TEXT,
      quantity INTEGER DEFAULT 1,
      unitCost REAL,
      totalCost REAL,
      residualValue REAL,
      depreciableAmount REAL,
      annualDepreciation REAL,
      accumulatedDepreciation REAL DEFAULT 0,
      accumulatedImpairmentLosses REAL DEFAULT 0,
      issuesTransfersAdjustments REAL DEFAULT 0,
      adjustedCost REAL,
      netBookValue REAL,
      remarks TEXT,
      selected INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get list of existing columns in the assets table
  const tableInfo = await db.all("PRAGMA table_info(assets)");
  const existingColumns = tableInfo.map(col => col.name);
  
  // Add all missing columns if they don't exist
  const columnsToAdd = [
    { name: "entityName", sql: "ALTER TABLE assets ADD COLUMN entityName TEXT" },
    { name: "fundCluster", sql: "ALTER TABLE assets ADD COLUMN fundCluster TEXT" },
    { name: "propertyNumber", sql: "ALTER TABLE assets ADD COLUMN propertyNumber TEXT" },
    { name: "propertyType", sql: "ALTER TABLE assets ADD COLUMN propertyType TEXT" },
    { name: "office", sql: "ALTER TABLE assets ADD COLUMN office TEXT" },
    { name: "ppeClass", sql: "ALTER TABLE assets ADD COLUMN ppeClass TEXT" },
    { name: "description", sql: "ALTER TABLE assets ADD COLUMN description TEXT" },
    { name: "accountCode", sql: "ALTER TABLE assets ADD COLUMN accountCode TEXT" },
    { name: "usefulLife", sql: "ALTER TABLE assets ADD COLUMN usefulLife INTEGER" },
    { name: "rateOfDepreciation", sql: "ALTER TABLE assets ADD COLUMN rateOfDepreciation REAL" },
    { name: "dateAcquired", sql: "ALTER TABLE assets ADD COLUMN dateAcquired TEXT" },
    { name: "reference", sql: "ALTER TABLE assets ADD COLUMN reference TEXT" },
    { name: "receipt", sql: "ALTER TABLE assets ADD COLUMN receipt TEXT" },
    { name: "quantity", sql: "ALTER TABLE assets ADD COLUMN quantity INTEGER DEFAULT 1" },
    { name: "unitCost", sql: "ALTER TABLE assets ADD COLUMN unitCost REAL" },
    { name: "totalCost", sql: "ALTER TABLE assets ADD COLUMN totalCost REAL" },
    { name: "residualValue", sql: "ALTER TABLE assets ADD COLUMN residualValue REAL" },
    { name: "depreciableAmount", sql: "ALTER TABLE assets ADD COLUMN depreciableAmount REAL" },
    { name: "annualDepreciation", sql: "ALTER TABLE assets ADD COLUMN annualDepreciation REAL" },
    { name: "accumulatedDepreciation", sql: "ALTER TABLE assets ADD COLUMN accumulatedDepreciation REAL DEFAULT 0" },
    { name: "accumulatedImpairmentLosses", sql: "ALTER TABLE assets ADD COLUMN accumulatedImpairmentLosses REAL DEFAULT 0" },
    { name: "issuesTransfersAdjustments", sql: "ALTER TABLE assets ADD COLUMN issuesTransfersAdjustments REAL DEFAULT 0" },
    { name: "adjustedCost", sql: "ALTER TABLE assets ADD COLUMN adjustedCost REAL" },
    { name: "netBookValue", sql: "ALTER TABLE assets ADD COLUMN netBookValue REAL" },
    { name: "remarks", sql: "ALTER TABLE assets ADD COLUMN remarks TEXT" },
    { name: "selected", sql: "ALTER TABLE assets ADD COLUMN selected INTEGER DEFAULT 0" },
    { name: "status", sql: "ALTER TABLE assets ADD COLUMN status TEXT DEFAULT 'active'" },
    { name: "createdAt", sql: "ALTER TABLE assets ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", sql: "ALTER TABLE assets ADD COLUMN updatedAt TEXT DEFAULT CURRENT_TIMESTAMP" }
  ];
  
  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      try {
        await db.exec(col.sql);
      } catch {
        // Column may already exist, ignore error
      }
    }
  }
  
  // Asset History - tracks all modifications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      fieldChanged TEXT,
      oldValue TEXT,
      newValue TEXT,
      changedBy TEXT,
      changeDate TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Transfer Records - tracks asset movements between offices
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      fromOffice TEXT,
      toOffice TEXT,
      transferDate TEXT,
      transferReason TEXT,
      transferredBy TEXT,
      receivedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Disposal Records - tracks disposed/scrapped/retired assets
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_disposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      disposalDate TEXT,
      disposalMethod TEXT,
      disposalReason TEXT,
      proceeds REAL,
      bookValueAtDisposal REAL,
      approvedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Depreciation Log - yearly depreciation records
  await db.exec(`
    CREATE TABLE IF NOT EXISTS depreciation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      year INTEGER,
      beginningBookValue REAL,
      depreciationExpense REAL,
      accumulatedDepreciation REAL,
      endingBookValue REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Repair History
  await db.exec(`
    CREATE TABLE IF NOT EXISTS repair_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      repairDate TEXT,
      natureOfRepair TEXT,
      amount REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  console.log("Database initialized successfully");
})().catch(error => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});

// Helper function to log asset history
const logAssetHistory = async (assetId, fieldChanged, oldValue, newValue) => {
  const db = await dbPromise;
  await db.run(
    "INSERT INTO asset_history (assetId, fieldChanged, oldValue, newValue, changeDate) VALUES (?, ?, ?, ?, ?)",
    [assetId, fieldChanged, oldValue, newValue, new Date().toISOString()]
  );
};

// API route to save asset - FIXED: Allow import with minimal fields
app.post("/api/assets", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "No data provided" });
  }

  const {
    entityName,
    fundCluster,
    propertyNumber,
    propertyType,
    office,
    ppeClass,
    description,
    accountCode,
    usefulLife,
    rateOfDepreciation,
    dateAcquired,
    reference,
    receipt,
    quantity,
    unitCost,
    totalCost,
    residualValue,
    depreciableAmount,
    annualDepreciation,
    accumulatedDepreciation,
    accumulatedImpairmentLosses,
    issuesTransfersAdjustments,
    adjustedCost,
    netBookValue,
    remarks
  } = req.body;

  // FIXED: Only require propertyNumber and description, use defaults for office
  if (!propertyNumber || !description) {
    return res.status(400).json({ success: false, message: "Missing required fields: propertyNumber and description are required" });
  }

  const db = await dbPromise;
  const now = new Date().toISOString();
  
  // Use default values for optional fields
  const finalOffice = office || "Main Office";
  
  const result = await db.run(
    `INSERT INTO assets (
      entityName, fundCluster, propertyNumber, propertyType, office, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation, accumulatedImpairmentLosses, issuesTransfersAdjustments,
      adjustedCost, netBookValue, remarks, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityName, fundCluster, propertyNumber, propertyType, finalOffice, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity || 1, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation, accumulatedImpairmentLosses || 0, issuesTransfersAdjustments || 0,
      adjustedCost, netBookValue, remarks, now, now
    ]
  );
  
  await logAssetHistory(result.lastID, 'Created', null, `Asset created: ${propertyNumber}`);
  
  res.json({ success: true, message: "Asset saved successfully" });
});

// API route to fetch all assets
app.get("/api/assets", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets ORDER BY id DESC");
  res.json(assets);
});

// Test endpoint - right after assets route
app.get("/api/simple-test", (req, res) => {
  console.log('Simple test endpoint reached!');
  res.json({ success: true, message: "Simple test working!" });
});

// API route to fetch active assets only
app.get("/api/assets/active", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE status = 'active' ORDER BY id DESC");
  res.json(assets);
});

// API route to fetch single asset
app.get("/api/assets/:id", async (req, res) => {
  const db = await dbPromise;
  const asset = await db.get("SELECT * FROM assets WHERE id = ?", [req.params.id]);
  res.json(asset);
});

// API route to delete asset
app.delete("/api/assets/:id", async (req, res) => {
  const db = await dbPromise;
  const asset = await db.get("SELECT propertyNumber FROM assets WHERE id = ?", [req.params.id]);
  await logAssetHistory(req.params.id, 'Deleted', `Asset: ${asset?.propertyNumber}`, null);
  await db.run("DELETE FROM assets WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: "Asset deleted successfully" });
});

// API route to clear all selections
app.put("/api/assets/clear-selections", async (req, res) => {
  console.log('Clear selections request received - ROUTE HIT!');
  try {
    const db = await dbPromise;
    
    // Simple update without column check
    const result = await db.run("UPDATE assets SET selected = 0");
    console.log('Clear selections completed - affected rows:', result.changes);
    res.json({ success: true, message: "All selections cleared", affectedRows: result.changes });
  } catch (error) {
    console.error('Error clearing selections:', error);
    res.status(500).json({ success: false, message: "Failed to clear selections", error: error.message });
  }
});

// Test route to verify path matching
app.put("/api/assets/test-path", (req, res) => {
  console.log('Test path route hit!');
  res.json({ success: true, message: "Path matching works!" });
});

// API route to toggle asset selection
app.put("/api/assets/:id/select", async (req, res) => {
  const db = await dbPromise;
  const { selected } = req.body;
  await db.run("UPDATE assets SET selected = ? WHERE id = ?", [selected ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

// API route to get selected assets
app.get("/api/assets/selected", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE selected = 1 ORDER BY id DESC");
  res.json(assets);
});

// Simple GET test endpoint
app.get("/api/test-get", async (req, res) => {
  console.log('GET test endpoint reached!');
  res.json({ success: true, message: "GET test endpoint working" });
});

// Test endpoint to verify server is working
app.put("/api/test", async (req, res) => {
  console.log('Test endpoint reached!');
  res.json({ success: true, message: "Test endpoint working" });
});

// Test endpoint to manually trigger monthly depreciation
app.post("/api/test-monthly-depreciation", async (req, res) => {
  console.log('Manual monthly depreciation test triggered');
  try {
    const { targetDate } = req.body;
    console.log('Testing with targetDate:', targetDate);
    const result = await applyMonthlyDepreciation(targetDate);
    console.log('Manual test result:', result);
    res.json(result);
  } catch (error) {
    console.error('Manual test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test PUT route before clear-selections
app.put("/api/test-put", (req, res) => {
  console.log('Test PUT endpoint reached!');
  res.json({ success: true, message: "PUT routing works!" });
});

// API route to get dashboard statistics
app.get("/api/stats", async (req, res) => {
  const db = await dbPromise;
  
  const totalAssets = await db.get("SELECT COUNT(*) as count FROM assets WHERE status = 'active'");
  const totalCost = await db.get("SELECT COALESCE(SUM(totalCost), 0) as total FROM assets WHERE status = 'active'");
  const totalDepreciation = await db.get("SELECT COALESCE(SUM(accumulatedDepreciation), 0) as total FROM assets WHERE status = 'active'");
  const assetsByClass = await db.all(`
    SELECT ppeClass, COUNT(*) as count, SUM(totalCost) as totalCost 
    FROM assets WHERE status = 'active' GROUP BY ppeClass
  `);
  
  res.json({
    totalAssets: totalAssets.count,
    totalCost: totalCost.total,
    totalDepreciation: totalDepreciation.total,
    assetsByClass
  });
});

// ==================== ASSET HISTORY API ====================

app.get("/api/history", async (req, res) => {
  const db = await dbPromise;
  const history = await db.all(`
    SELECT ah.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription
    FROM asset_history ah
    LEFT JOIN assets a ON ah.assetId = a.id
    ORDER BY ah.changeDate DESC
  `);
  res.json(history);
});

app.get("/api/history/:assetId", async (req, res) => {
  const db = await dbPromise;
  const history = await db.all(
    "SELECT * FROM asset_history WHERE assetId = ? ORDER BY changeDate DESC",
    [req.params.assetId]
  );
  res.json(history);
});

// ==================== TRANSFER RECORDS API ====================

app.get("/api/transfers", async (req, res) => {
  const db = await dbPromise;
  const transfers = await db.all(`
    SELECT at.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.office, '') as currentOffice
    FROM asset_transfers at
    LEFT JOIN assets a ON at.assetId = a.id
    ORDER BY at.transferDate DESC
  `);
  res.json(transfers);
});

app.post("/api/transfers", async (req, res) => {
  const { assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy } = req.body;
  const db = await dbPromise;
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO asset_transfers (assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy, now]
  );
  
  await db.run("UPDATE assets SET office = ?, updatedAt = ? WHERE id = ?", [toOffice, now, assetId]);
  
  await logAssetHistory(assetId, 'Transfer', fromOffice, toOffice);
  
  res.json({ success: true, message: "Transfer record created successfully" });
});

// ==================== DISPOSAL RECORDS API ====================

app.get("/api/disposals", async (req, res) => {
  const db = await dbPromise;
  const disposals = await db.all(`
    SELECT ad.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.totalCost, 0) as totalCost, COALESCE(a.netBookValue, 0) as netBookValue
    FROM asset_disposals ad
    LEFT JOIN assets a ON ad.assetId = a.id
    ORDER BY ad.disposalDate DESC
  `);
  res.json(disposals);
});

app.post("/api/disposals", async (req, res) => {
  const { assetId, disposalDate, disposalMethod, disposalReason, proceeds, bookValueAtDisposal, approvedBy } = req.body;
  const db = await dbPromise;
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO asset_disposals (assetId, disposalDate, disposalMethod, disposalReason, proceeds, bookValueAtDisposal, approvedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assetId, disposalDate, disposalMethod, disposalReason, proceeds || 0, bookValueAtDisposal, approvedBy, now]
  );
  
  await db.run("UPDATE assets SET status = 'disposed', updatedAt = ? WHERE id = ?", [now, assetId]);
  
  await logAssetHistory(assetId, 'Disposed', 'active', `Disposed via ${disposalMethod}`);
  
  res.json({ success: true, message: "Disposal record created successfully" });
});

// ==================== DEPRECIATION LOG API ====================

app.get("/api/depreciation-log", async (req, res) => {
  const db = await dbPromise;
  const log = await db.all(`
    SELECT dl.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.usefulLife, 0) as usefulLife, COALESCE(a.totalCost, 0) as totalCost, COALESCE(a.residualValue, 0) as residualValue
    FROM depreciation_log dl
    LEFT JOIN assets a ON dl.assetId = a.id
    ORDER BY dl.year DESC, dl.assetId
  `);
  res.json(log);
});

app.get("/api/depreciation-log/:assetId", async (req, res) => {
  const db = await dbPromise;
  const log = await db.all(
    "SELECT * FROM depreciation_log WHERE assetId = ? ORDER BY year DESC",
    [req.params.assetId]
  );
  res.json(log);
});

app.post("/api/depreciation-log/generate", async (req, res) => {
  const { assetId } = req.body;
  const db = await dbPromise;
  
  const asset = await db.get("SELECT * FROM assets WHERE id = ?", [assetId]);
  if (!asset) {
    return res.status(404).json({ success: false, message: "Asset not found" });
  }
  
  const acquisitionYear = new Date(asset.dateAcquired).getFullYear();
  const currentYear = new Date().getFullYear();
  const usefulLife = asset.usefulLife; // Don't default to 5 if null
  const residualValue = asset.residualValue || 0;
  const totalCost = asset.totalCost || 0;
  
  // If no useful life, asset should not be depreciated (like land)
  if (!usefulLife) {
    return [{
      year: acquisitionYear,
      beginningBookValue: totalCost,
      depreciationExpense: 0,
      accumulatedDepreciation: 0,
      endingBookValue: totalCost
    }];
  }
  
  const depreciableAmount = totalCost - residualValue;
  const annualDepreciation = depreciableAmount / usefulLife;
  
  const lastDepreciationYear = acquisitionYear + usefulLife - 1;
  const yearsToDepreciate = Math.min(currentYear, lastDepreciationYear);
  
  let bookValue = totalCost;
  let accumulated = 0;
  
  for (let year = acquisitionYear; year <= yearsToDepreciate; year++) {
    const beginningBookValue = bookValue;
    const depreciation = annualDepreciation;
    accumulated += depreciation;
    bookValue = Math.max(residualValue, bookValue - depreciation);
    
    const existing = await db.get("SELECT id FROM depreciation_log WHERE assetId = ? AND year = ?", [assetId, year]);
    
    if (existing) {
      await db.run(
        `UPDATE depreciation_log SET beginningBookValue = ?, depreciationExpense = ?, accumulatedDepreciation = ?, endingBookValue = ? WHERE id = ?`,
        [beginningBookValue, depreciation, accumulated, bookValue, existing.id]
      );
    } else {
      await db.run(
        `INSERT INTO depreciation_log (assetId, year, beginningBookValue, depreciationExpense, accumulatedDepreciation, endingBookValue) VALUES (?, ?, ?, ?, ?, ?)`,
        [assetId, year, beginningBookValue, depreciation, accumulated, bookValue]
      );
    }
  }
  
  const finalNetBookValue = Math.max(residualValue, totalCost - accumulated);
  await db.run(
    "UPDATE assets SET accumulatedDepreciation = ?, netBookValue = ?, annualDepreciation = ? WHERE id = ?",
    [accumulated, finalNetBookValue, annualDepreciation, assetId]
  );
  
  res.json({ success: true, message: "Depreciation log generated successfully" });
});

app.post("/api/depreciation-log/generate-all", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE status = 'active'");
  
  for (const asset of assets) {
    const acquisitionYear = new Date(asset.dateAcquired).getFullYear();
    const currentYear = new Date().getFullYear();
    const usefulLife = asset.usefulLife; // Don't default to 5 if null
    const residualValue = asset.residualValue || 0;
    const totalCost = asset.totalCost || 0;
    
    // If no useful life, asset should not be depreciated (like land)
    if (!usefulLife) {
      continue; // Skip depreciation for non-depreciable assets
    }
    
    const depreciableAmount = totalCost - residualValue;
    const annualDepreciation = depreciableAmount / usefulLife;
    
    const lastDepreciationYear = acquisitionYear + usefulLife - 1;
    const yearsToDepreciate = Math.min(currentYear, lastDepreciationYear);
    
    let bookValue = totalCost;
    let accumulated = 0;
    
    for (let year = acquisitionYear; year <= yearsToDepreciate; year++) {
      const beginningBookValue = bookValue;
      const depreciation = annualDepreciation;
      accumulated += depreciation;
      bookValue = Math.max(residualValue, bookValue - depreciation);
      
      const existing = await db.get("SELECT id FROM depreciation_log WHERE assetId = ? AND year = ?", [asset.id, year]);
      
      if (existing) {
        await db.run(
          `UPDATE depreciation_log SET beginningBookValue = ?, depreciationExpense = ?, accumulatedDepreciation = ?, endingBookValue = ? WHERE id = ?`,
          [beginningBookValue, depreciation, accumulated, bookValue, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO depreciation_log (assetId, year, beginningBookValue, depreciationExpense, accumulatedDepreciation, endingBookValue) VALUES (?, ?, ?, ?, ?, ?)`,
          [asset.id, year, beginningBookValue, depreciation, accumulated, bookValue]
        );
      }
    }
    
    const finalNetBookValue = Math.max(residualValue, totalCost - accumulated);
    await db.run(
      "UPDATE assets SET accumulatedDepreciation = ?, netBookValue = ?, annualDepreciation = ? WHERE id = ?",
      [accumulated, finalNetBookValue, annualDepreciation, asset.id]
    );
  }
  
  res.json({ success: true, message: "Depreciation log generated for all assets" });
});

// ==================== MONTHLY AUTO-CALCULATION ====================

// Schedule monthly auto-calculation on 1st of each month (Philippine timezone UTC+8)
const scheduleMonthlyCalculation = () => {
  // Get current time in Philippine timezone
  const now = new Date();
  const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
  const philippineHour = philippineTime.getHours();
  const philippineDate = philippineTime.getDate();
  const currentMonth = philippineTime.getMonth();
  const currentYear = philippineTime.getFullYear();
  
  // Run at 2:00 AM Philippine time on 1st of each month
  const isFirstOfMonth = philippineDate === 1 && philippineHour >= 2;
  
  if (isFirstOfMonth) {
    console.log('🗓️ Running monthly auto-calculation for', philippineTime.toISOString());
    console.log('🇵🇭 Date:', philippineTime.toLocaleDateString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
    
    // Trigger depreciation calculation with current date
    applyMonthlyDepreciation(null); // null = use current date
    
    // Schedule next run (next month, 2:00 AM PH time)
    const nextMonth = new Date(currentYear, currentMonth + 1, 1, 2, 0, 0);
    const nextMonthPH = new Date(nextMonth.getTime() + (8 * 60 * 60 * 1000));
    console.log('⏰ Next auto-calculation scheduled for:', nextMonthPH.toISOString());
    console.log('🇵🇭 Next date (PH):', nextMonthPH.toLocaleDateString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }
  
  // Check every hour to schedule next run
  setTimeout(scheduleMonthlyCalculation, 60 * 60 * 1000); // Check every hour
};

// Start the scheduler
scheduleMonthlyCalculation();

// Start server after database is ready
app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});

// API route to update asset - MOVED TO END TO PREVENT CONFLICTS
app.put("/api/assets/:id", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "No data provided" });
  }

  const {
    entityName,
    fundCluster,
    propertyNumber,
    propertyType,
    office,
    ppeClass,
    description,
    accountCode,
    usefulLife,
    rateOfDepreciation,
    dateAcquired,
    reference,
    receipt,
    quantity,
    unitCost,
    totalCost,
    residualValue,
    depreciableAmount,
    annualDepreciation,
    accumulatedDepreciation,
    accumulatedImpairmentLosses,
    issuesTransfersAdjustments,
    adjustedCost,
    netBookValue,
    remarks
  } = req.body;

  // FIXED: Allow update with minimal fields
  if (!propertyNumber || !description) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const db = await dbPromise;
  const now = new Date().toISOString();
  
  const oldAsset = await db.get("SELECT * FROM assets WHERE id = ?", [req.params.id]);
  
  await db.run(
    `UPDATE assets SET
      entityName = ?, fundCluster = ?, propertyNumber = ?, propertyType = ?, office = ?, ppeClass = ?,
      description = ?, accountCode = ?, usefulLife = ?, rateOfDepreciation = ?,
      dateAcquired = ?, reference = ?, receipt = ?, quantity = ?, unitCost = ?,
      totalCost = ?, residualValue = ?, depreciableAmount = ?, annualDepreciation = ?,
      accumulatedDepreciation = ?, accumulatedImpairmentLosses = ?, issuesTransfersAdjustments = ?,
      adjustedCost = ?, netBookValue = ?, remarks = ?, updatedAt = ?
    WHERE id = ?`,
    [
      entityName, fundCluster, propertyNumber, propertyType, office, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation, accumulatedImpairmentLosses, issuesTransfersAdjustments,
      adjustedCost, netBookValue, remarks, now, req.params.id
    ]
  );
  
  const fields = ['entityName', 'fundCluster', 'propertyNumber', 'propertyType', 'office', 'ppeClass', 'description', 'accountCode', 'usefulLife', 'dateAcquired', 'quantity', 'unitCost', 'totalCost', 'remarks'];
  for (const field of fields) {
    if (oldAsset && oldAsset[field] !== req.body[field]) {
      await logAssetHistory(req.params.id, field, oldAsset[field], req.body[field]);
    }
  }
  
  res.json({ success: true, message: "Asset updated successfully" });
});

app.post("/api/assets/monthly-depreciation", async (req, res) => {
  const db = await dbPromise;
  const { targetDate } = req.body;
  
  console.log('Monthly depreciation request received for targetDate:', targetDate);
  
  try {
    const assets = await db.all("SELECT * FROM assets WHERE status = 'active'");
    console.log('Found assets for depreciation:', assets.length);
    
    // Store original values if not already stored (general solution)
    if (originalAssetValues.size === 0) {
      await setOriginalValues();
    }
    
    let updatedCount = 0;
    const currentDate = targetDate ? new Date(targetDate) : new Date();
    console.log('Current date for calculation:', currentDate.toISOString());
    
    for (const asset of assets) {
      const acquisitionDate = new Date(asset.dateAcquired);
      
      // Calculate months elapsed - always from original baseline for consistent results
      const today = new Date();
      const isToday = currentDate.toDateString() === today.toDateString();
      
      let monthsElapsed;
      if (isToday) {
        // For Today: return to original values (0 months from baseline)
        monthsElapsed = 0;
      } else {
        // For all other dates: calculate from original acquisition date
        monthsElapsed = Math.max(0, 
          (currentDate.getFullYear() - acquisitionDate.getFullYear()) * 12 + 
          (currentDate.getMonth() - acquisitionDate.getMonth())
        );
      }
      
      // Calculate monthly depreciation (0 for assets with no useful life)
      const monthlyDepreciation = (asset.usefulLife && asset.usefulLife > 0) ? asset.annualDepreciation / 12 : 0;
      
      // Get original values for baseline - using property numbers as keys
      const originalValues = originalAssetValues.get(asset.propertyNumber) || {
        accumulatedDepreciation: asset.accumulatedDepreciation,
        netBookValue: asset.netBookValue
      };
      
      // Calculate what accumulated depreciation should be for the target date
      // For Today: return to original imported values (stored in originalAssetValues)
      // For other dates: calculate depreciation from original baseline
      const expectedAccumulatedDepreciation = isToday ? originalValues.accumulatedDepreciation : Math.min(
        originalValues.accumulatedDepreciation + (monthsElapsed * monthlyDepreciation),
        asset.totalCost - asset.residualValue // Don't exceed depreciable amount
      );
      
      console.log(`=== Asset ${asset.propertyNumber} ===`);
      console.log('PPE Class:', asset.ppeClass);
      console.log('Useful Life:', asset.usefulLife);
      console.log('Annual Depreciation:', asset.annualDepreciation);
      console.log('Acquisition date:', acquisitionDate.toISOString());
      console.log('Target date:', currentDate.toISOString());
      console.log('Is today?', isToday);
      console.log('Months elapsed:', monthsElapsed);
      console.log('Monthly depreciation:', monthlyDepreciation);
      console.log('Original accumulated:', originalValues.accumulatedDepreciation);
      console.log('Current accumulated:', asset.accumulatedDepreciation);
      console.log('Expected accumulated:', expectedAccumulatedDepreciation);
    }
    
    console.log(`Updated ${updatedCount} assets with monthly depreciation`);
    
    return {
      success: true,
      message: `Monthly depreciation applied successfully`,
      updatedCount: updatedCount
    };
  } catch (error) {
    console.error('Error applying monthly depreciation:', error);
    return {
      success: false,
      message: "Failed to apply monthly depreciation",
      error: error.message
    };
  }
});

app.post("/api/assets/monthly-depreciation", async (req, res) => {
  const db = await dbPromise;
  const { targetDate } = req.body;
  
  console.log('Monthly depreciation request received for targetDate:', targetDate);
  
  try {
    const assets = await db.all("SELECT * FROM assets WHERE status = 'active'");
    console.log('Found assets for depreciation:', assets.length);
    
    // Store original values if not already stored (general solution)
    if (originalAssetValues.size === 0) {
      await setOriginalValues();
    }
    
    let updatedCount = 0;
    const currentDate = targetDate ? new Date(targetDate) : new Date();
    console.log('Current date for calculation:', currentDate.toISOString());
    
    for (const asset of assets) {
      const acquisitionDate = new Date(asset.dateAcquired);
      
      // Calculate months elapsed - always from original baseline for consistent results
      const today = new Date();
      const isToday = currentDate.toDateString() === today.toDateString();
      
      let monthsElapsed;
      if (isToday) {
        // For Today: return to original values (0 months from baseline)
        monthsElapsed = 0;
      } else {
        // For all other dates: calculate from original acquisition date
        monthsElapsed = Math.max(0, 
          (currentDate.getFullYear() - acquisitionDate.getFullYear()) * 12 + 
          (currentDate.getMonth() - acquisitionDate.getMonth())
        );
      }
      
      // Calculate monthly depreciation (0 for assets with no useful life)
      const monthlyDepreciation = (asset.usefulLife && asset.usefulLife > 0) ? asset.annualDepreciation / 12 : 0;
      
      // Get original values for baseline - using property numbers as keys
      const originalValues = originalAssetValues.get(asset.propertyNumber) || {
        accumulatedDepreciation: asset.accumulatedDepreciation,
        netBookValue: asset.netBookValue
      };
      
      // Calculate what accumulated depreciation should be for the target date
      // For Today: return to original imported values (stored in originalAssetValues)
      // For other dates: calculate depreciation from original baseline
      const expectedAccumulatedDepreciation = isToday ? originalValues.accumulatedDepreciation : Math.min(
        originalValues.accumulatedDepreciation + (monthsElapsed * monthlyDepreciation),
        asset.totalCost - asset.residualValue // Don't exceed depreciable amount
      );
      
      console.log(`=== Asset ${asset.propertyNumber} ===`);
      console.log('PPE Class:', asset.ppeClass);
      console.log('Useful Life:', asset.usefulLife);
      console.log('Annual Depreciation:', asset.annualDepreciation);
      console.log('Acquisition date:', acquisitionDate.toISOString());
      console.log('Target date:', currentDate.toISOString());
      console.log('Is today?', isToday);
      console.log('Months elapsed:', monthsElapsed);
      console.log('Monthly depreciation:', monthlyDepreciation);
      console.log('Original accumulated:', originalValues.accumulatedDepreciation);
      console.log('Current accumulated:', asset.accumulatedDepreciation);
      console.log('Expected accumulated:', expectedAccumulatedDepreciation);
    }
    
    console.log(`Updated ${updatedCount} assets with monthly depreciation`);
    
    return {
      success: true,
      message: `Monthly depreciation applied successfully`,
      updatedCount: updatedCount
    };
  } catch (error) {
    console.error('Error applying monthly depreciation:', error);
    return {
      success: false,
      message: "Failed to apply monthly depreciation",
      error: error.message
    };
  }
});

app.get("/api/repairs", async (req, res) => {
  try {
    const db = await dbPromise;
    const repairs = await db.all(`
      SELECT rh.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription
      FROM repair_history rh
      LEFT JOIN assets a ON rh.assetId = a.id
      ORDER BY rh.repairDate DESC
    `);
    res.json(repairs);
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ success: false, message: "Failed to fetch repairs" });
  }
});

app.post("/api/repairs", async (req, res) => {
  try {
    const { assetId, repairDate, natureOfRepair, amount } = req.body;
    const db = await dbPromise;
    const now = new Date().toISOString();
    
    await db.run(
      "INSERT INTO repair_history (assetId, repairDate, natureOfRepair, amount, createdAt) VALUES (?, ?, ?, ?, ?)",
      [assetId, repairDate, natureOfRepair, amount, now]
    );
    
    await logAssetHistory(assetId, 'Repair', null, `${natureOfRepair} - ₱${amount}`);
    
    res.json({ success: true, message: "Repair record added successfully" });
  } catch (error) {
    console.error('Error adding repair record:', error);
    res.status(500).json({ success: false, message: "Failed to add repair record" });
  }
});

app.get("/api/repairs/:assetId", async (req, res) => {
  try {
    const db = await dbPromise;
    const repairs = await db.all(
      "SELECT * FROM repair_history WHERE assetId = ? ORDER BY repairDate DESC",
      [req.params.assetId]
    );
    res.json(repairs);
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ success: false, message: "Failed to fetch repairs" });
  }
});

// Fix depreciation calculations for all assets
app.post("/api/assets/fix-depreciation", async (req, res) => {
  const db = await dbPromise;
  
  try {
    // Get all assets that have depreciation data
    const assets = await db.all(
      "SELECT * FROM assets WHERE usefulLife > 0 AND dateAcquired IS NOT NULL AND totalCost IS NOT NULL"
    );
    
    let fixedCount = 0;
    
    for (const asset of assets) {
      // Calculate years used with proper partial year handling
      const acquired = new Date(asset.dateAcquired);
      const now = new Date();
      const yearsUsed = Math.max(0, (now - acquired) / (1000 * 60 * 60 * 24 * 365.25));
      
      // Calculate depreciation values
      const cost = asset.totalCost || 0;
      const usefulLife = asset.usefulLife || 0;
      
      if (cost > 0 && usefulLife > 0) {
        const residualValue = cost * 0.05;
        const depreciableAmount = cost - residualValue;
        const annualDepreciation = depreciableAmount / usefulLife;
        const accumulatedDepreciation = annualDepreciation * yearsUsed;
        const netBookValue = Math.max(residualValue, cost - accumulatedDepreciation);
        const rateOfDepreciation = parseFloat((100 / usefulLife).toFixed(2));
        
        // Update the asset with correct values
        await db.run(
          `UPDATE assets SET 
            residualValue = ?,
            depreciableAmount = ?,
            annualDepreciation = ?,
            accumulatedDepreciation = ?,
            netBookValue = ?,
            rateOfDepreciation = ?,
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            residualValue,
            depreciableAmount,
            annualDepreciation,
            accumulatedDepreciation,
            netBookValue,
            rateOfDepreciation,
            asset.id
          ]
        );
        
        fixedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Fixed depreciation for ${fixedCount} assets`,
      fixedCount 
    });
  } catch (error) {
    console.error('Error fixing depreciation:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fix depreciation" 
    });
  }
});

// Fix Construction in Progress assets useful life
app.post("/api/assets/fix-construction-useful-life", async (req, res) => {
  const db = await dbPromise;
  
  try {
    // Update all Construction in Progress assets to have 0 useful life
    await db.run(
      `UPDATE assets SET usefulLife = 0 WHERE ppeClass LIKE '%Construction in Progress%'`
    );
    
    // Update all Land assets to have 0 useful life
    await db.run(
      `UPDATE assets SET usefulLife = 0 WHERE ppeClass = 'Land' OR accountCode = '10601010'`
    );
    
    // Clear existing depreciation log for these assets
    await db.run(
      `DELETE FROM depreciation_log WHERE assetId IN (
        SELECT id FROM assets WHERE ppeClass LIKE '%Construction in Progress%' OR ppeClass = 'Land' OR accountCode = '10601010'
      )`
    );
    
    res.json({ 
      success: true, 
      message: "Fixed Construction in Progress and Land assets useful life and cleared depreciation log" 
    });
  } catch (error) {
    console.error('Error fixing assets:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fix assets" 
    });
  }
});

// ==================== TEST API ====================

app.get("/api/test-monthly-depreciation", async (req, res) => {
  const db = await dbPromise;
  
  try {
    const assets = await db.all("SELECT id, propertyNumber, ppeClass, usefulLife, annualDepreciation, accumulatedDepreciation, netBookValue FROM assets WHERE status = 'active' LIMIT 3");
    
    console.log('=== MONTHLY DEPRECIATION TEST ===');
    console.log('Current assets in database:');
    
    for (const asset of assets) {
      const acquisitionDate = new Date(asset.dateAcquired);
      const currentDate = new Date();
      const monthsElapsed = Math.max(0, 
        (currentDate.getFullYear() - acquisitionDate.getFullYear()) * 12 + 
        (currentDate.getMonth() - acquisitionDate.getMonth())
      );
      const monthlyDepreciation = asset.annualDepreciation / 12;
      const expectedAccumulatedDepreciation = Math.min(
        monthsElapsed * monthlyDepreciation,
        asset.totalCost - asset.residualValue
      );
      
      console.log(`Asset ${asset.propertyNumber}:`);
      console.log('  Acquisition:', acquisitionDate.toISOString());
      console.log('  Current Date:', currentDate.toISOString());
      console.log('  Months Elapsed:', monthsElapsed);
      console.log('  Monthly Depreciation:', monthlyDepreciation);
      console.log('  Current Accumulated:', asset.accumulatedDepreciation);
      console.log('  Expected Accumulated:', expectedAccumulatedDepreciation);
      console.log('  Should Update:', Math.abs(expectedAccumulatedDepreciation - asset.accumulatedDepreciation) > 0.01);
    }
    
    res.json({ 
      success: true, 
      message: "Test completed - check server console for asset values",
      assets: assets.map(a => ({
        id: a.id,
        propertyNumber: a.propertyNumber,
        currentAccumulated: a.accumulatedDepreciation,
        expectedAccumulated: Math.min(
          Math.max(0, (new Date().getFullYear() - new Date(a.dateAcquired).getFullYear()) * 12 + 
          (new Date().getMonth() - new Date(a.dateAcquired).getMonth())) * (a.annualDepreciation / 12),
          a.totalCost - a.residualValue
        )
      }))
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ success: false, message: "Test failed" });
  }
});

// ==================== CLEAR ASSET HISTORY API ====================

app.post("/api/asset-history/clear", async (req, res) => {
  const db = await dbPromise;
  
  try {
    console.log('Clear asset history request received');
    
    // Delete all asset history records
    const result = await db.run("DELETE FROM asset_history");
    
    console.log(`Cleared ${result.changes} asset history records`);
    
    res.json({ 
      success: true, 
      message: `Cleared ${result.changes} asset history records`,
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error clearing asset history:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to clear asset history" 
    });
  }
});

// ==================== CLEAR DEPRECIATION LOG API ====================

app.post("/api/depreciation-log/clear", async (req, res) => {
  const db = await dbPromise;
  
  try {
    console.log('Clear depreciation log request received');
    
    // Delete all depreciation log records
    const result = await db.run("DELETE FROM depreciation_log");
    
    console.log(`Cleared ${result.changes} depreciation log records`);
    
    res.json({ 
      success: true, 
      message: `Cleared ${result.changes} depreciation log records`,
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error clearing depreciation log:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to clear depreciation log" 
    });
  }
});

// ==================== CLEAR TRANSFERS API ====================

app.post("/api/transfers/clear", async (req, res) => {
  const db = await dbPromise;
  
  try {
    console.log('Clear transfers request received');
    
    // Delete all transfer records
    const result = await db.run("DELETE FROM asset_transfers");
    
    console.log(`Cleared ${result.changes} transfer records`);
    
    res.json({ 
      success: true, 
      message: `Cleared ${result.changes} transfer records`,
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error clearing transfers:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to clear transfers" 
    });
  }
});

// ==================== CLEAR DISPOSALS API ====================

app.post("/api/disposals/clear", async (req, res) => {
  const db = await dbPromise;
  
  try {
    console.log('Clear disposals request received');
    
    // Delete all disposal records
    const result = await db.run("DELETE FROM asset_disposals");
    
    console.log(`Cleared ${result.changes} disposal records`);
    
    res.json({ 
      success: true, 
      message: `Cleared ${result.changes} disposal records`,
      deletedCount: result.changes 
    });
  } catch (error) {
    console.error('Error clearing disposals:', error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to clear disposals" 
    });
  }
});

