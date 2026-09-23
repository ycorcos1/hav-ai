import { useCallback } from 'react';
import { type Href, useRouter } from 'expo-router';

export function useSafeBack(fallback: Href): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback);
  }, [fallback, router]);
}
