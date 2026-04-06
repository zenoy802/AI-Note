import { useState, useCallback } from 'react';

interface UseCopyReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

export const useCopy = (timeout = 2000): UseCopyReturn => {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopied(false);
    }
  }, [timeout]);

  return { copied, copy };
};
