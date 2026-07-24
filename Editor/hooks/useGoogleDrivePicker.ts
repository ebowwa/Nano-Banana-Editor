import { useState, useCallback, useEffect } from 'react';

// These are expected to be in the environment, provided by the platform.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.API_KEY;
const IS_CONFIGURED = !!CLIENT_ID && !!API_KEY;

// Type definitions for Google APIs (gapi/gis) to avoid TypeScript errors.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleDrivePickerOptions {
  onVideoSelect: (file: File) => void;
}

export const useGoogleDrivePicker = ({ onVideoSelect }: GoogleDrivePickerOptions) => {
  const [isGapiLoaded, setGapiLoaded] = useState(false);
  const [isGisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Effect to load the Google API and Identity Services scripts.
  useEffect(() => {
    if (!IS_CONFIGURED) {
      console.warn("Google Drive Picker is not configured. Missing GOOGLE_CLIENT_ID or API_KEY.");
      return;
    }

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => window.gapi.load('client:picker', () => setGapiLoaded(true));
    gapiScript.onerror = () => setError("Failed to load Google API script.");
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => setGisLoaded(true);
    gisScript.onerror = () => setError("Failed to load Google Identity script.");
    document.body.appendChild(gisScript);

    // Cleanup function to remove scripts when the component unmounts.
    return () => {
      document.body.removeChild(gapiScript);
      document.body.removeChild(gisScript);
    };
  }, []);

  const createPicker = useCallback(async (accessToken: string) => {
    if (!API_KEY) {
      // This should not happen due to the IS_CONFIGURED check, but as a safeguard.
      setError("Google API Key is not configured.");
      console.error("Google API Key is missing. Please set process.env.API_KEY");
      return;
    }
    const view = new window.google.picker.View(window.google.picker.ViewId.VIDEO);
    const picker = new window.google.picker.PickerBuilder()
      .setApiKey(API_KEY)
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback(async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          const fileId = doc.id;
          const fileName = doc.name;
          const mimeType = doc.mimeType;

          try {
            // Fetch the file content using the Drive API
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!response.ok) {
              throw new Error(`Google Drive API responded with status ${response.status}`);
            }
            
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: mimeType });
            onVideoSelect(file);
          } catch(downloadError) {
             setError('Failed to download video from Google Drive.');
             console.error('Drive download error:', downloadError);
          }
        }
      })
      .build();
    picker.setVisible(true);
  }, [onVideoSelect]);

  // Effect to initialize the OAuth token client once scripts are loaded.
  useEffect(() => {
    if (!IS_CONFIGURED || !isGapiLoaded || !isGisLoaded || tokenClient) {
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            createPicker(tokenResponse.access_token);
          } else {
            setError("Failed to get authorization token.");
          }
        },
      });
      setTokenClient(client);
    } catch (e) {
      setError("Failed to initialize Google authentication.");
      console.error(e);
    }
  }, [isGapiLoaded, isGisLoaded, tokenClient, createPicker]);
  
  const openPicker = useCallback(() => {
    setError(null);
    if (!IS_CONFIGURED) {
        setError("Google API credentials are not configured. Cannot open picker.");
        return;
    }
    if (tokenClient) {
      // Prompt the user to select an account and grant access.
      // The callback will then create and show the picker.
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      setError("Google Picker is not ready. Please try again in a moment.");
    }
  }, [tokenClient]);

  const isReady = IS_CONFIGURED && isGapiLoaded && isGisLoaded && !!tokenClient;

  return { openPicker, error, isReady, isConfigured: IS_CONFIGURED };
};