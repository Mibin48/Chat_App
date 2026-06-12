// d:\Projects\ChatApp\frontend\src\lib\cryptoUtils.js

const DB_NAME = "aether-e2ee-db";
const STORE_NAME = "key-store";
const PRIVATE_KEY_ID = "private-key";

const STORE_CHATS = "chats-cache";
const STORE_MESSAGES = "messages-cache";
const STORE_QUEUE = "outgoing-queue";

// Initialize IndexedDB database and object store (version 2)
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS);
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Store the private key (dummy) in IndexedDB
export const storePrivateKey = async (key) => {
  return true;
};

// Retrieve the private key (dummy)
export const getPrivateKey = async () => {
  return { type: "private", value: "dummy" };
};

// Clear the private key
export const clearPrivateKey = async () => {
  return true;
};

// Generate a dummy JWK representation for E2EE keys
export const generateE2EEKeyPair = async () => {
  return { kty: "oct", k: "dummy-key" };
};

// Derive dummy shared key
export const deriveSharedKey = async (myPrivateKey, partnerPublicKeyJwk) => {
  return "dummy-shared-key";
};

// Base64 encode helper (handles Unicode characters properly)
const encodeBase64 = (str) => {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
  } catch (err) {
    return btoa(str);
  }
};

// Base64 decode helper (handles Unicode characters properly)
const decodeBase64 = (str) => {
  try {
    return decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (err) {
    return atob(str);
  }
};

// Encrypt plain text using simplified Base64-scrambling (returns Base64 string under ciphertext)
export const encryptMessage = async (plainText, sharedKey) => {
  if (plainText === undefined || plainText === null) {
    return { ciphertext: "", iv: "simple-iv" };
  }
  const ciphertext = "enc:" + encodeBase64(plainText);
  return { ciphertext, iv: "simple-iv" };
};

// Decrypt ciphertext using simplified Base64-scrambling
export const decryptMessage = async (ciphertextBase64, ivBase64, sharedKey) => {
  if (!ciphertextBase64) return "";
  if (ciphertextBase64.startsWith("enc:")) {
    return decodeBase64(ciphertextBase64.substring(4));
  }
  // Return as-is if unencrypted or legacy message
  return ciphertextBase64;
};

// Generate dummy group key JWK
export const generateGroupKey = async () => {
  return { kty: "oct", k: "dummy-group-key" };
};

// Encrypt group key JWK (pass-through dummy)
export const encryptGroupKey = async (groupKeyJwk, sharedKey) => {
  return { encryptedKey: "dummy-encrypted-group-key", iv: "simple-iv" };
};

// Decrypt group key JWK (pass-through dummy)
export const decryptGroupKey = async (encryptedKeyBase64, ivBase64, sharedKey) => {
  return { kty: "oct", k: "dummy-group-key" };
};

// Import dummy group key
export const importGroupKey = async (groupKeyJwk) => {
  return "dummy-group-key";
};

// Store group key in IndexedDB (dummy)
export const storeGroupKey = async (groupId, keyJwk) => {
  return true;
};

// Retrieve group key (dummy)
export const getGroupKeyFromStore = async (groupId) => {
  return { kty: "oct", k: "dummy-group-key" };
};

// Clear group keys (dummy)
export const clearGroupKeys = async () => {
  return true;
};

// Convert ArrayBuffer to Base64 (pass-through helper)
export const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

// Encrypt file client-side (pass-through)
export const encryptFile = async (dataUri, key) => {
  return { encryptedDataUri: dataUri, iv: "simple-iv" };
};

// Decrypt file client-side (pass-through)
export const decryptFile = async (encryptedUrl, mediaIvBase64, key) => {
  const response = await fetch(encryptedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.statusText}`);
  }
  return await response.arrayBuffer();
};

// Derive dummy key from password
export const deriveKeyFromPassword = async (password, saltBase64) => {
  return "dummy-kek";
};

// Encrypt private key with password (dummy)
export const encryptPrivateKeyWithPassword = async (privateKey, password) => {
  return {
    encryptedPrivateKey: "dummy-encrypted-private-key",
    privateKeyIv: "dummy-iv",
    passwordSalt: "dummy-salt"
  };
};

// Decrypt private key with password (dummy)
export const decryptPrivateKeyWithPassword = async (encryptedPrivateKeyBase64, ivBase64, saltBase64, password) => {
  return { type: "private", value: "dummy" };
};

// Chats cache helper: stores both chats and groups together or separately in IndexedDB
export const cacheChatsLocal = async (chats, groups) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHATS, "readwrite");
      const store = transaction.objectStore(STORE_CHATS);
      store.put(chats, "chats");
      store.put(groups, "groups");
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to cache chats locally:", err);
  }
};

export const getCachedChats = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHATS, "readonly");
      const store = transaction.objectStore(STORE_CHATS);
      const chatsReq = store.get("chats");
      const groupsReq = store.get("groups");
      
      transaction.oncomplete = () => {
        resolve({
          chats: chatsReq.result || [],
          groups: groupsReq.result || []
        });
      };
      transaction.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to read cached chats:", err);
    return { chats: [], groups: [] };
  }
};

// Messages cache helper: caches messages array for a given chatId/groupId
export const cacheMessagesLocal = async (chatId, messages) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MESSAGES, "readwrite");
      const store = transaction.objectStore(STORE_MESSAGES);
      const recentMessages = messages.slice(-50);
      const request = store.put(recentMessages, chatId);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to cache messages locally:", err);
  }
};

export const getCachedMessages = async (chatId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MESSAGES, "readonly");
      const store = transaction.objectStore(STORE_MESSAGES);
      const request = store.get(chatId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to read cached messages:", err);
    return [];
  }
};

// Outgoing Queue Helpers for offline synchronization
export const enqueueOfflineMessage = async (msg) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_QUEUE, "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.put(msg, msg.queueId);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to enqueue offline message:", err);
  }
};

export const getOfflineQueue = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_QUEUE, "readonly");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to fetch offline queue:", err);
    return [];
  }
};

export const updateQueueItem = async (queueId, updates) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_QUEUE, "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const getReq = store.get(queueId);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) {
          resolve(false);
          return;
        }
        const updatedItem = { ...item, ...updates };
        const putReq = store.put(updatedItem, queueId);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = (e) => reject(e.target.error);
      };
      getReq.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to update queue item:", err);
    return false;
  }
};

export const dequeueOfflineMessage = async (queueId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_QUEUE, "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.delete(queueId);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to dequeue offline message:", err);
  }
};
