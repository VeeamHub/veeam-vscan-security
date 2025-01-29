import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, 
      refetchOnWindowFocus: true, 
      refetchOnMount: true, 
      refetchIntervalInBackground: false, 
    },
  },
});