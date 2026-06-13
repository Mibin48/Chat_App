import { precacheAndRoute } from 'workbox-precaching';

// Inject standard Vite-PWA precache routes
precacheAndRoute(self.__WB_MANIFEST || []);

const DB_NAME = "aether-e2ee-db";
const STORE_NAME = "key-store";
const PRIVATE_KEY_ID = "private-key";

// Local IndexedDB initializers inside the background Service Worker
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const getPrivateKeyFromDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(PRIVATE_KEY_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("[SW] Failed to fetch private key from IndexedDB:", err);
    return null;
  }
};

const getGroupKeyFromDB = async (groupId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(`group-key-${groupId}`);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error(`[SW] Failed to fetch group key for ${groupId} from IndexedDB:`, err);
    return null;
  }
};

// Web Crypto Decryption Sub-routines
const decodeBase64 = (str) => {
  try {
    const decoded = atob(str);
    try {
      return decodeURIComponent(decoded.split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (err) {
      return decoded;
    }
  } catch (err) {
    // If atob fails (e.g. invalid base64 characters), return the original string
    return str;
  }
};

const decrypt1on1Message = async (ciphertextBase64, ivBase64, senderPublicKeyJwk, myPrivateKey) => {
  if (ciphertextBase64 && ciphertextBase64.startsWith("enc:")) {
    return decodeBase64(ciphertextBase64.substring(4));
  }
  return "🔒 [Legacy Encrypted Message]";
};

const decryptGroupMessage = async (ciphertextBase64, ivBase64, groupKeyJwk) => {
  if (ciphertextBase64 && ciphertextBase64.startsWith("enc:")) {
    return decodeBase64(ciphertextBase64.substring(4));
  }
  return "🔒 [Legacy Encrypted Message]";
};

// Background push notification listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    console.error("[SW] Failed to parse push notification payload JSON:", err);
    return;
  }

  const { senderName, isEncrypted, ciphertext, iv, senderPublicKey, isGroup, groupId, groupName } = payload;

  const title = isGroup ? `${groupName} (${senderName})` : senderName;
  const tag = isGroup ? `group-${groupId}` : `direct-${senderName}`;

  const decryptPromise = (async () => {
    // 1. If not encrypted, show standard text
    if (!isEncrypted) {
      return ciphertext || "Sent an attachment";
    }

    try {
      // 2. Group Message Decryption
      if (isGroup) {
        const groupKeyJwk = await getGroupKeyFromDB(groupId);
        if (!groupKeyJwk) {
          throw new Error("Missing group key");
        }
        return await decryptGroupMessage(ciphertext, iv, groupKeyJwk);
      } 
      
      // 3. Direct Message Decryption
      else {
        const myPrivateKey = await getPrivateKeyFromDB();
        if (!myPrivateKey || !senderPublicKey) {
          throw new Error("Missing private key or sender public key");
        }
        return await decrypt1on1Message(ciphertext, iv, senderPublicKey, myPrivateKey);
      }
    } catch (decryptError) {
      console.warn("[SW] E2EE decryption failed or key missing. Applying fallback safety:", decryptError.message);
      // Decryption Fallback Safety: Show a generic notification instead of throwing/crashing
      return isGroup 
        ? "💬 New group message received. Open app to read." 
        : "💬 New message received. Open app to read.";
    }
  })();

  event.waitUntil(
    decryptPromise.then((bodyText) => {
      return self.registration.showNotification(title, {
        body: bodyText,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: tag,
        renotify: true,
        data: {
          url: '/',
          groupId: isGroup ? groupId : null
        }
      });
    })
  );
});

// Handle notification click to focus/open the application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Force the new service worker to activate immediately and take control of active clients
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
