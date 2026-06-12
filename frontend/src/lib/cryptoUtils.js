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
      // Version 1
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      // Version 2
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

// Store the private key (CryptoKey) in IndexedDB and cache it in sessionStorage
export const storePrivateKey = async (key) => {
  try {
    const jwk = await window.crypto.subtle.exportKey("jwk", key);
    sessionStorage.setItem("aether-private-key-jwk", JSON.stringify(jwk));
  } catch (err) {
    console.error("[E2EE] Failed to cache private key in sessionStorage:", err);
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(key, PRIVATE_KEY_ID);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Retrieve the private key (CryptoKey) from IndexedDB or fallback to sessionStorage cache
export const getPrivateKey = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(PRIVATE_KEY_ID);
    request.onsuccess = async () => {
      let key = request.result || null;
      if (!key) {
        const cachedJwkStr = sessionStorage.getItem("aether-private-key-jwk");
        if (cachedJwkStr) {
          try {
            console.log("[E2EE] Private key missing from IndexedDB. Restoring from sessionStorage cache...");
            const jwk = JSON.parse(cachedJwkStr);
            key = await window.crypto.subtle.importKey(
              "jwk",
              jwk,
              {
                name: "ECDH",
                namedCurve: "P-256"
              },
              true,
              ["deriveKey", "deriveBits"]
            );
            // Restore back to IndexedDB silently
            await storePrivateKey(key);
          } catch (err) {
            console.error("[E2EE] Failed to restore private key from sessionStorage:", err);
          }
        }
      }
      resolve(key);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

// Clear the private key from IndexedDB (e.g. on logout)
export const clearPrivateKey = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(PRIVATE_KEY_ID);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const generateE2EEKeyPair = async () => {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true, // must be extractable to export the public key
      ["deriveKey", "deriveBits"]
    );

    // Export public key to JWK format for transmitting to server
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    // Save the private key securely in IndexedDB
    await storePrivateKey(keyPair.privateKey);

    return publicKeyJwk;
  } catch (error) {
    console.error("Failed to generate E2EE key pair:", error);
    throw error;
  }
};

// Import a JWK public key and derive a shared AES-GCM 256-bit symmetric key
export const deriveSharedKey = async (myPrivateKey, partnerPublicKeyJwk) => {
  try {
    const partnerPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      partnerPublicKeyJwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true, // public key can be extractable
      []
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: partnerPublicKey
      },
      myPrivateKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false, // derived key is non-extractable (securely held in browser memory)
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Failed to derive shared E2EE key:", error);
    throw error;
  }
};

// Encrypt plain text using a derived shared key (returns Base64 strings for ciphertext and IV)
export const encryptMessage = async (plainText, sharedKey) => {
  try {
    const enc = new TextEncoder();
    const encodedMessage = enc.encode(plainText);

    // AES-GCM requires a 12-byte initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sharedKey,
      encodedMessage
    );

    // Convert array buffers to Base64 strings
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return { ciphertext: ciphertextBase64, iv: ivBase64 };
  } catch (error) {
    console.error("Failed to encrypt message:", error);
    throw error;
  }
};

// Decrypt ciphertext using derived shared key and IV
export const decryptMessage = async (ciphertextBase64, ivBase64, sharedKey) => {
  try {
    // Convert Base64 back to Uint8Array buffers
    const ciphertext = new Uint8Array(
      atob(ciphertextBase64).split("").map((c) => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(ivBase64).split("").map((c) => c.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sharedKey,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    throw error;
  }
};

// Generate a random AES-GCM 256-bit symmetric key and export it as JWK
export const generateGroupKey = async () => {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true, // must be extractable to export and share
      ["encrypt", "decrypt"]
    );
    const keyJwk = await window.crypto.subtle.exportKey("jwk", key);
    return keyJwk;
  } catch (error) {
    console.error("Failed to generate group key:", error);
    throw error;
  }
};

// Encrypt a group key JWK using a derived P2P shared key
export const encryptGroupKey = async (groupKeyJwk, sharedKey) => {
  try {
    const enc = new TextEncoder();
    const encodedMessage = enc.encode(JSON.stringify(groupKeyJwk));

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sharedKey,
      encodedMessage
    );

    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return { encryptedKey: ciphertextBase64, iv: ivBase64 };
  } catch (error) {
    console.error("Failed to encrypt group key:", error);
    throw error;
  }
};

// Decrypt a group key JWK using a derived P2P shared key
export const decryptGroupKey = async (encryptedKeyBase64, ivBase64, sharedKey) => {
  try {
    const ciphertext = new Uint8Array(
      atob(encryptedKeyBase64).split("").map((c) => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(ivBase64).split("").map((c) => c.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      sharedKey,
      ciphertext
    );

    const dec = new TextDecoder();
    const jwkStr = dec.decode(decryptedBuffer);
    return JSON.parse(jwkStr);
  } catch (error) {
    throw error;
  }
};

// Import a group key JWK into a CryptoKey object
export const importGroupKey = async (groupKeyJwk) => {
  try {
    return await window.crypto.subtle.importKey(
      "jwk",
      groupKeyJwk,
      {
        name: "AES-GCM",
        length: 256
      },
      false, // non-extractable after import
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Failed to import group key:", error);
    throw error;
  }
};

// Store group key JWK in IndexedDB
export const storeGroupKey = async (groupId, keyJwk) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(keyJwk, `group-key-${groupId}`);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Retrieve group key JWK from IndexedDB
export const getGroupKeyFromStore = async (groupId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`group-key-${groupId}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Clear all group keys from IndexedDB (e.g. on logout)
export const clearGroupKeys = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (typeof cursor.key === "string" && cursor.key.startsWith("group-key-")) {
          store.delete(cursor.key);
        }
        cursor.continue();
      } else {
        resolve(true);
      }
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

// Helper to convert ArrayBuffer to Base64 in chunks to prevent call stack overflow
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

// Encrypt file client-side (AES-GCM 256)
export const encryptFile = async (dataUri, key) => {
  try {
    const parts = dataUri.split(",");
    const base64Content = parts[1];
    const binaryString = atob(base64Content);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      arrayBuffer
    );

    const ciphertextBase64 = bufferToBase64(ciphertextBuffer);
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedDataUri = `data:application/octet-stream;base64,${ciphertextBase64}`;

    return { encryptedDataUri, iv: ivBase64 };
  } catch (error) {
    console.error("Failed to encrypt file:", error);
    throw error;
  }
};

// Decrypt file client-side (AES-GCM 256)
export const decryptFile = async (encryptedUrl, mediaIvBase64, key) => {
  try {
    const response = await fetch(encryptedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted media: ${response.statusText}`);
    }
    const ciphertextBuffer = await response.arrayBuffer();

    const iv = new Uint8Array(
      atob(mediaIvBase64).split("").map((c) => c.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertextBuffer
    );

    return decryptedBuffer;
  } catch (error) {
    throw error;
  }
};

// Helper to derive a KEK (Key Encryption Key) from a password and salt using PBKDF2
export const deriveKeyFromPassword = async (password, saltBase64) => {
  try {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);
    const saltBytes = new Uint8Array(
      atob(saltBase64).split("").map((c) => c.charCodeAt(0))
    );

    // Import the password bytes as a raw key
    const rawKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBytes,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Derive the AES-GCM 256-bit key using PBKDF2 with 600,000 iterations and SHA-256
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 600000,
        hash: "SHA-256"
      },
      rawKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false, // non-extractable KEK
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("Failed to derive KEK from password:", error);
    throw error;
  }
};

// Encrypt the private key (CryptoKey) with the user's password
export const encryptPrivateKeyWithPassword = async (privateKey, password) => {
  try {
    // 1. Export the private key to JWK
    const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
    const jwkString = JSON.stringify(jwk);

    // 2. Generate a random 16-byte salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = btoa(String.fromCharCode(...salt));

    // 3. Derive the KEK
    const kek = await deriveKeyFromPassword(password, saltBase64);

    // 4. Encrypt the JWK string
    const enc = new TextEncoder();
    const encodedJwk = enc.encode(jwkString);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      kek,
      encodedJwk
    );

    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      encryptedPrivateKey: ciphertextBase64,
      privateKeyIv: ivBase64,
      passwordSalt: saltBase64
    };
  } catch (error) {
    console.error("Failed to encrypt private key with password:", error);
    throw error;
  }
};

// Decrypt the private key using the password, salt, and IV, and store it in IndexedDB
export const decryptPrivateKeyWithPassword = async (encryptedPrivateKeyBase64, ivBase64, saltBase64, password) => {
  try {
    // 1. Derive the KEK using the password and salt
    const kek = await deriveKeyFromPassword(password, saltBase64);

    // 2. Decrypt the ciphertext
    const ciphertext = new Uint8Array(
      atob(encryptedPrivateKeyBase64).split("").map((c) => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(ivBase64).split("").map((c) => c.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      kek,
      ciphertext
    );

    const dec = new TextDecoder();
    const jwkString = dec.decode(decryptedBuffer);
    const jwk = JSON.parse(jwkString);

    // 3. Import the JWK back as a private CryptoKey
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true, // must be extractable so we can derive keys
      ["deriveKey", "deriveBits"]
    );

    // 4. Save the private key securely in IndexedDB
    await storePrivateKey(privateKey);

    return privateKey;
  } catch (error) {
    throw error;
  }
};

// Chats cache helper: stores both chats and groups together or separately
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
      // Limit cache to last 50 messages to keep db lightweight
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

// Outgoing Queue Helpers
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
