// d:\Projects\ChatApp\frontend\src\lib\cryptoUtils.js

const DB_NAME = "aether-e2ee-db";
const STORE_NAME = "key-store";
const PRIVATE_KEY_ID = "private-key";

// Initialize IndexedDB database and object store
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Store the private key (CryptoKey) in IndexedDB
export const storePrivateKey = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(key, PRIVATE_KEY_ID);
    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

// Retrieve the private key (CryptoKey) from IndexedDB
export const getPrivateKey = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(PRIVATE_KEY_ID);
    request.onsuccess = () => resolve(request.result || null);
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
    console.error("Failed to decrypt message:", error);
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
    console.error("Failed to decrypt group key:", error);
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
    console.error("Failed to decrypt file:", error);
    throw error;
  }
};
