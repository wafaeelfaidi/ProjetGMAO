'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Progress } from '@kit/ui/progress';
import type { EmbeddingProgress } from '~/lib/DataManagement/embeddings';

interface ProcessingModalProps {
  isOpen: boolean;
  fileName: string;
  progress: EmbeddingProgress | null;
}

export function ProcessingModal({
  isOpen,
  fileName,
  progress,
}: ProcessingModalProps) {
  const getStageLabel = (stage: EmbeddingProgress['stage']) => {
    switch (stage) {
      case 'extracting':
        return 'Extracting Text';
      case 'chunking':
        return 'Chunking Text';
      case 'embedding':
        return 'Generating Embeddings';
      case 'storing':
        return 'Storing Data';
      case 'complete':
        return 'Complete';
      default:
        return 'Processing';
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Processing File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-2">{fileName}</p>
            {progress && (
              <>
                <Progress value={progress.progress} className="mb-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {getStageLabel(progress.stage)}
                  </span>
                  <span className="font-medium">{progress.progress}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{progress.message}</p>
              </>
            )}
          </div>

          {progress?.stage === 'complete' && (
            <div className="text-center text-green-600 font-medium">
              ✓ Processing complete!
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
