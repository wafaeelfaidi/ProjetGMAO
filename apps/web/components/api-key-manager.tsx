"use client";

import { useState, useEffect } from "react";
import { setCohereApiKey, hasCohereApiKey, getCohereClient, restoreApiKey } from "~/lib/cohere/client";
import { hasStoredApiKey } from "~/lib/cohere/secure-storage";

interface ApiKeyManagerProps {
  onKeySet?: () => void;
}

export function ApiKeyManager({ onKeySet }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSet, setIsSet] = useState(hasCohereApiKey());
  const [rememberKey, setRememberKey] = useState(false);

  // Try to restore API key on mount
  useEffect(() => {
    const restore = async () => {
      if (hasStoredApiKey()) {
        try {
          const restored = await restoreApiKey();
          if (restored) {
            setIsSet(true);
            setRememberKey(true);
            onKeySet?.();
          }
        } catch (error) {
          console.error("Failed to restore API key:", error);
        }
      }
      setIsRestoring(false);
    };
    
    restore();
  }, [onKeySet]);

  const handleSetKey = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Set the key with persistence option
      setCohereApiKey(apiKey, rememberKey);

      // Validate the key
      const client = getCohereClient();
      if (!client) {
        throw new Error("Failed to initialize Cohere client");
      }

      const isValid = await client.validateKey();
      if (!isValid) {
        throw new Error("Invalid API key");
      }

      // Success
      setIsSet(true);
      setApiKey(""); // Clear input for security
      onKeySet?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate API key");
      setIsSet(false);
    } finally {
      setIsValidating(false);
    }
  };

  if (isRestoring) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <p className="text-blue-800">Restoring API key...</p>
        </div>
      </div>
    );
  }

  if (isSet) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">
          ✓ Cohere API key is set and validated. You can now use the AI assistant.
          {rememberKey && " (Key will be remembered)"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2">API Key Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          This application uses your Cohere API key to power the AI assistant.
          Your key is stored in-memory only and never sent to our servers.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              Cohere API Key
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="Enter your Cohere API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetKey()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500">
              Get your free API key at{" "}
              <a
                href="https://dashboard.cohere.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                dashboard.cohere.com
              </a>
            </p>
          </div>

          {/* Remember checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember-key"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember-key" className="text-sm text-gray-700">
              Remember my API key (stored encrypted in browser)
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleSetKey}
            disabled={isValidating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? "Validating..." : "Set API Key"}
          </button>

          <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-900">Privacy & Security:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>API key encrypted using Web Crypto API before storage</li>
              <li>Encryption key derived from device fingerprint (unique to this browser)</li>
              <li>All documents and embeddings stored locally in your browser</li>
              <li>No data sent to our servers - everything runs client-side</li>
              {!rememberKey && <li>Key stored in memory only - lost on page refresh</li>}
              {rememberKey && <li>Key persisted securely in localStorage - survives refresh</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
