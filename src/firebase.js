import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration from your console
const firebaseConfig = {
  apiKey: "AIzaSyCbuplFmUdVtnzsbi-ogGRywIljAk3_x4U",
  authDomain: "denr-depreciation.firebaseapp.com",
  projectId: "denr-depreciation",
  storageBucket: "denr-depreciation.firebasestorage.app",
  messagingSenderId: "24820303212",
  appId: "1:24820303212:web:595080962686ff8f2e9f49",
  measurementId: "G-HM0TTX09SP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Firebase functions for asset management
export const saveAsset = async (assetData) => {
  try {
    console.log('Saving asset to Firebase:', assetData);
    const startTime = Date.now();
    
    const docRef = await addDoc(collection(db, 'assets'), {
      ...assetData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    const endTime = Date.now();
    console.log(`Firebase save took ${endTime - startTime}ms`);
    
    return { success: true, id: docRef.id, data: { id: docRef.id, ...assetData } };
  } catch (error) {
    console.error('Error saving asset to Firebase:', error);
    
    // Check if it's a permissions error
    if (error.code === 'permission-denied' || error.message.includes('permission-denied')) {
      return { success: false, error: 'Firebase permissions error. Please check Firestore security rules.' };
    }
    
    // Check if it's a network error
    if (error.code === 'unavailable' || error.message.includes('network')) {
      return { success: false, error: 'Network error. Please check your internet connection.' };
    }
    
    return { success: false, error: error.message || 'Failed to save asset' };
  }
};

export const getAssets = async () => {
  try {
    console.log('Fetching assets from Firebase...');
    const startTime = Date.now();
    
    const querySnapshot = await getDocs(collection(db, 'assets'));
    const assets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const endTime = Date.now();
    console.log(`Firebase fetch took ${endTime - startTime}ms for ${assets.length} assets`);
    
    return { success: true, data: assets };
  } catch (error) {
    console.error('Error fetching assets from Firebase:', error);
    return { success: false, error: error.message || 'Failed to fetch assets' };
  }
};

export const updateAsset = async (id, assetData) => {
  try {
    console.log('Updating asset in Firebase:', id, assetData);
    const startTime = Date.now();
    
    const docRef = doc(db, 'assets', id);
    await updateDoc(docRef, {
      ...assetData,
      updatedAt: new Date().toISOString()
    });
    
    const endTime = Date.now();
    console.log(`Firebase update took ${endTime - startTime}ms`);
    
    return { success: true, data: { id, ...assetData } };
  } catch (error) {
    console.error('Error updating asset in Firebase:', error);
    return { success: false, error: error.message || 'Failed to update asset' };
  }
};

export const deleteAsset = async (id) => {
  try {
    console.log('Deleting asset from Firebase:', id);
    const startTime = Date.now();
    
    await deleteDoc(doc(db, 'assets', id));
    
    const endTime = Date.now();
    console.log(`Firebase delete took ${endTime - startTime}ms`);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting asset from Firebase:', error);
    return { success: false, error: error.message || 'Failed to delete asset' };
  }
};

// Force delete specific problematic assets
export const forceDeleteAssets = async (assetIds) => {
  try {
    console.log('Force deleting assets:', assetIds);
    const results = [];
    
    for (const id of assetIds) {
      try {
        await deleteDoc(doc(db, 'assets', id));
        results.push({ id, success: true });
        console.log(`Force deleted asset: ${id}`);
      } catch (error) {
        results.push({ id, success: false, error: error.message });
        console.error(`Failed to force delete asset ${id}:`, error);
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Error in force delete:', error);
    return { success: false, error: error.message };
  }
};

// Direct delete for specific Firebase document IDs
export const deleteSpecificAssets = async () => {
  try {
    const specificIds = ['RRXCzrwW3neWZ3Fi8oY6', 'RMFo0o6VdJhVxJEssfGO'];
    console.log('Deleting specific Firebase documents:', specificIds);
    
    const results = [];
    for (const id of specificIds) {
      try {
        await deleteDoc(doc(db, 'assets', id));
        results.push({ id, success: true });
        console.log(`Successfully deleted Firebase document: ${id}`);
      } catch (error) {
        results.push({ id, success: false, error: error.message });
        console.error(`Failed to delete Firebase document ${id}:`, error);
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Error deleting specific assets:', error);
    return { success: false, error: error.message };
  }
};

export const getAssetHistory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'assetHistory'));
    const history = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: history };
  } catch (error) {
    console.error('Error fetching history:', error);
    return { success: false, error: error.message };
  }
};

export const addAssetHistory = async (historyEntry) => {
  try {
    await addDoc(collection(db, 'assetHistory'), {
      ...historyEntry,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding history:', error);
    return { success: false, error: error.message };
  }
};

// Get depreciation log
export const getDepreciationLog = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'depreciationLog'));
    const log = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: log };
  } catch (error) {
    console.error('Error fetching depreciation log:', error);
    return { success: false, error: error.message };
  }
};

// Get transfers
export const getTransfers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'transfers'));
    const transfers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: transfers };
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return { success: false, error: error.message };
  }
};

// Get disposals
export const getDisposals = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'disposals'));
    const disposals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: disposals };
  } catch (error) {
    console.error('Error fetching disposals:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listeners for cross-device synchronization
export const subscribeToAssets = (callback) => {
  const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const assets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(assets);
  }, (error) => {
    console.error('Real-time assets listener error:', error);
    callback(null, error);
  });
  
  return unsubscribe;
};

export const subscribeToAssetHistory = (callback) => {
  const q = query(collection(db, 'assetHistory'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(history);
  }, (error) => {
    console.error('Real-time history listener error:', error);
    callback(null, error);
  });
  
  return unsubscribe;
};

export const subscribeToDepreciationLog = (callback) => {
  const q = query(collection(db, 'depreciation_log'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const log = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(log);
  }, (error) => {
    console.error('Real-time depreciation listener error:', error);
    callback(null, error);
  });
  
  return unsubscribe;
};

export const subscribeToTransfers = (callback) => {
  const q = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const transfers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(transfers);
  }, (error) => {
    console.error('Real-time transfers listener error:', error);
    callback(null, error);
  });
  
  return unsubscribe;
};

export const subscribeToDisposals = (callback) => {
  const q = query(collection(db, 'disposals'), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const disposals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(disposals);
  }, (error) => {
    console.error('Real-time disposals listener error:', error);
    callback(null, error);
  });
  
  return unsubscribe;
};

export { app, db, auth };
