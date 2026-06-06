import React, { useState, useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { decryptFile } from '../lib/cryptoUtils';

export default function DecryptedMedia({ msg, type, fallbackUrl, children }) {
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const getChatEncryptionKey = userChatStore((state) => state.getChatEncryptionKey);

  useEffect(() => {
    let active = true;
    let localUrl = null;

    const performDecryption = async () => {
      if (!msg.isEncrypted || !msg.mediaIv) {
        // Not encrypted, use fallback directly
        return;
      }

      setIsLoading(true);
      setIsError(false);

      try {
        const key = await getChatEncryptionKey(msg.groupId);
        if (!key) {
          throw new Error("E2EE key not available");
        }

        const urlToFetch = fallbackUrl || msg.image || msg.fileUrl || msg.audioUrl;
        if (!urlToFetch) {
          throw new Error("No media URL found in message");
        }

        const decryptedBuffer = await decryptFile(urlToFetch, msg.mediaIv, key);
        if (!active) return;

        // Determine mime type
        let mimeType = msg.fileType;
        if (!mimeType) {
          if (type === 'image') mimeType = 'image/png';
          else if (type === 'audio') mimeType = 'audio/webm';
          else if (type === 'video') mimeType = 'video/mp4';
          else mimeType = 'application/octet-stream';
        }

        const blob = new Blob([decryptedBuffer], { type: mimeType });
        localUrl = URL.createObjectURL(blob);
        
        if (active) {
          setDecryptedUrl(localUrl);
        }
      } catch (err) {
        console.error("Failed to decrypt media file client-side:", err);
        if (active) {
          setIsError(true);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    performDecryption();

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [msg._id, msg.isEncrypted, msg.mediaIv, msg.groupId, fallbackUrl, type]);

  // Clean up previous decryptedUrl when it changes
  useEffect(() => {
    return () => {
      if (decryptedUrl) {
        URL.revokeObjectURL(decryptedUrl);
      }
    };
  }, [decryptedUrl]);

  const resolvedUrl = msg.isEncrypted ? decryptedUrl : fallbackUrl;

  return children(resolvedUrl, isLoading, isError);
}
