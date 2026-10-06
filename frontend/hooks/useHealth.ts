'use client';

import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '@/services/api';
import { HealthStatus } from '@/types';

export function useHealth() {
  return useQuery<HealthStatus, Error>({
    queryKey: ['backend-health'],
    queryFn: checkHealth,
    retry: 2,
    refetchInterval: 10000, // poll every 10s for status updates
  });
}
