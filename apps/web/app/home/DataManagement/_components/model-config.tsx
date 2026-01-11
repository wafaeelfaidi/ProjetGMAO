'use client';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { useEffect, useState } from 'react';

interface ModelConfigProps {
  currentModel: {
    name: string;
    type: string;
    dimension: number;
  };
  onModelChange: (modelType: 'cohere', apiKey?: string) => void;
}

export function ModelConfig({ currentModel, onModelChange }: ModelConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Load saved API key status on mount
  useEffect(() => {
    const saved = localStorage.getItem('embedding_api_key_cohere');
    if (saved) {
      setHasApiKey(true);
      setApiKey(saved);
    }
  }, []);

  const modelInfo = {
    cohere: {
      name: 'Cohere',
      description: 'embed-english-v3.0 - High quality multilingual embeddings',
      requiresKey: true,
      dimension: 1024,
    },
  };

  const handleApply = () => {
    if (!apiKey.trim()) {
      alert('Please enter your Cohere API key');
      return;
    }

    try {
      onModelChange('cohere', apiKey);
      setHasApiKey(true);
      alert('✓ Cohere model configured successfully\n\nAPI key saved locally.\nNew embeddings will use Cohere.');
    } catch (error) {
      alert(`Failed to configure model: ${error}`);
    }
  };

  const cohereInfo = modelInfo.cohere;

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Cohere Embedding Configuration</h3>
        <p className="text-sm text-gray-600">
          Configure your Cohere API key for document embeddings
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{cohereInfo.name}</span>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Dimension: {cohereInfo.dimension}
            </span>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-200">{cohereInfo.description}</p>
        </div>

        <div>
          <Label htmlFor="api-key">
            Cohere API Key
            {hasApiKey && (
              <span className="text-green-600 text-xs ml-2">✓ Configured</span>
            )}
          </Label>
          <div className="flex gap-2">
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? 'Using saved API key (enter new to update)' : 'Enter your Cohere API key'}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {hasApiKey
              ? '✓ API key is saved locally. Enter a new key to update it.'
              : 'Get your API key from https://dashboard.cohere.com/api-keys'}
          </p>
        </div>

        <Button onClick={handleApply} className="w-full">
          {hasApiKey ? 'Update API Key' : 'Save API Key'}
        </Button>
      </div>

      {currentModel.type === 'cohere' && (
        <div className="border-t pt-4">
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-600 font-bold">✓</span>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Cohere Active</p>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              All new embeddings will use Cohere embed-english-v3.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

