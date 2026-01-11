'use client';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { useEffect, useState } from 'react';

interface ModelConfigProps {
  currentModel: {
    name: string;
    type: string;
    dimension: number;
  };
  onModelChange: (
    modelType: 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini',
    apiKey?: string,
  ) => void;
}

export function ModelConfig({ currentModel, onModelChange }: ModelConfigProps) {
  const [selectedModel, setSelectedModel] = useState<string>(currentModel.type);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, boolean>>({});

  // Load saved API key status on mount
  useEffect(() => {
    const keys: Record<string, boolean> = {};
    ['openai', 'cohere', 'mistral', 'gemini'].forEach((model) => {
      const saved = localStorage.getItem(`embedding_api_key_${model}`);
      if (saved) {
        keys[model] = true;
      }
    });
    setSavedApiKeys(keys);
  }, []);

  // Update selected model and load saved API key when current model changes
  useEffect(() => {
    setSelectedModel(currentModel.type);
    
    // Load saved API key for the current model
    const saved = localStorage.getItem(`embedding_api_key_${currentModel.type}`);
    if (saved) {
      setApiKey(saved);
    } else {
      setApiKey('');
    }
  }, [currentModel.type]);

  // Load saved API key when model selection changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    const saved = localStorage.getItem(`embedding_api_key_${model}`);
    if (saved) {
      setApiKey(saved);
    } else {
      setApiKey('');
    }
  };

  const modelInfo = {
    simple: {
      name: 'Simple TF-IDF',
      description: 'Local model, no API key required',
      requiresKey: false,
      dimension: 384,
    },
    openai: {
      name: 'OpenAI',
      description: 'text-embedding-3-small',
      requiresKey: true,
      dimension: 1536,
    },
    cohere: {
      name: 'Cohere',
      description: 'embed-english-v3.0',
      requiresKey: true,
      dimension: 1024,
    },
    mistral: {
      name: 'Mistral',
      description: 'mistral-embed',
      requiresKey: true,
      dimension: 1024,
    },
    gemini: {
      name: 'Google Gemini',
      description: 'text-embedding-004',
      requiresKey: true,
      dimension: 768,
    },
  };

  const handleApply = () => {
    const info = modelInfo[selectedModel as keyof typeof modelInfo];
    
    if (info.requiresKey && !apiKey.trim()) {
      alert('Please enter an API key for ' + info.name);
      return;
    }

    try {
      onModelChange(
        selectedModel as 'simple' | 'openai' | 'cohere' | 'mistral' | 'gemini',
        apiKey || undefined,
      );
      
      // Update saved keys status
      if (apiKey && selectedModel !== 'simple') {
        setSavedApiKeys((prev) => ({ ...prev, [selectedModel]: true }));
      }
      
      alert(`✓ Model successfully changed to ${info.name}\n\nAPI key saved locally.\nNew embeddings will use this model.`);
    } catch (error) {
      alert(`Failed to change model: ${error}`);
    }
  };

  const selectedInfo = modelInfo[selectedModel as keyof typeof modelInfo];

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Embedding Model Configuration</h3>
        <p className="text-sm text-gray-600">
          Choose your embedding model and provide API key if required
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="model-select">Select Model</Label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger id="model-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">
                Simple TF-IDF (No API key)
              </SelectItem>
              <SelectItem value="openai">
                {savedApiKeys['openai'] ? '✓ ' : ''}OpenAI (text-embedding-3-small)
              </SelectItem>
              <SelectItem value="cohere">
                {savedApiKeys['cohere'] ? '✓ ' : ''}Cohere (embed-english-v3.0)
              </SelectItem>
              <SelectItem value="mistral">
                {savedApiKeys['mistral'] ? '✓ ' : ''}Mistral (mistral-embed)
              </SelectItem>
              <SelectItem value="gemini">
                {savedApiKeys['gemini'] ? '✓ ' : ''}Google Gemini (text-embedding-004)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedInfo && (
          <div className="bg-gray-100 border border-gray-300 p-3 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedInfo.name}</span>
              <span className="text-xs text-gray-500">
                Dimension: {selectedInfo.dimension}
              </span>
            </div>
            <p className="text-xs text-gray-600">{selectedInfo.description}</p>
            {selectedInfo.requiresKey && (
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ API key required
              </p>
            )}
          </div>
        )}

        {selectedInfo?.requiresKey && (
          <div>
            <Label htmlFor="api-key">
              API Key
              {savedApiKeys[selectedModel] && (
                <span className="text-green-600 text-xs ml-2">✓ Saved</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  savedApiKeys[selectedModel]
                    ? 'Using saved API key (enter new to update)'
                    : `Enter your ${selectedInfo.name} API key`
                }
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
              {savedApiKeys[selectedModel]
                ? '✓ API key is saved locally. Enter a new key to update it.'
                : 'Your API key will be stored locally and never sent to our servers'}
            </p>
          </div>
        )}

        <Button onClick={handleApply} className="w-full">
          Apply Model Configuration
        </Button>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium text-sm mb-2">Current Active Model</h4>
        <div className="bg-primary/10 dark:bg-primary/5 p-3 rounded-md border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary font-bold">✓</span>
            <p className="text-sm font-medium">{currentModel.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Type: {currentModel.type} | Dimension: {currentModel.dimension}
          </p>
          <p className="text-xs text-primary/80 mt-1">
            All new embeddings will use this model
          </p>
        </div>
      </div>
    </div>
  );
}

