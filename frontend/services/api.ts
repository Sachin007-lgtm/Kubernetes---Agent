import axios from 'axios';
import {
  HealthStatus,
  InvestigateResponse,
  ClustersResponse,
  HistoryResponse,
  InvestigationRecord,
  AuthResponse,
  UserProfile,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 min — investigation + AI reasoning can take time
});

// Attach auth token if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sre_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Fetch backend health status
 */
export const checkHealth = async (): Promise<HealthStatus> => {
  const response = await apiClient.get<HealthStatus>('/health');
  return response.data;
};

/**
 * Run Kubernetes cluster investigation with AI reasoning
 */
export const runInvestigation = async (
  namespace: string = '--all-namespaces',
  skipAi: boolean = false,
  context?: string,
): Promise<InvestigateResponse> => {
  const response = await apiClient.post<InvestigateResponse>('/investigate', {
    namespace,
    context: context || undefined,
    skip_ai: skipAi,
  });
  return response.data;
};

/**
 * Fetch local Kubernetes clusters from kubeconfig
 */
export const fetchClusters = async (): Promise<ClustersResponse> => {
  const response = await apiClient.get<ClustersResponse>('/clusters');
  return response.data;
};

/**
 * Switch active cluster context
 */
export const switchCluster = async (context: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post('/clusters/switch', { context });
  return response.data;
};

/**
 * Fetch investigation history
 */
export const fetchHistory = async (limit: number = 20): Promise<HistoryResponse> => {
  const response = await apiClient.get<HistoryResponse>(`/history?limit=${limit}`);
  return response.data;
};

/**
 * Fetch a single past investigation by ID
 */
export const fetchInvestigationDetail = async (
  id: string,
): Promise<{ status: string; investigation: InvestigationRecord }> => {
  const response = await apiClient.get(`/history/${id}`);
  return response.data;
};

/**
 * Reset investigation history
 */
export const resetHistory = async (): Promise<{ status: string; message: string }> => {
  const response = await apiClient.delete('/history');
  return response.data;
};

/**
 * Login user
 */
export const loginUser = async (
  email: string = 'sre@cloudinfra.io',
  password: string = 'admin123',
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  if (typeof window !== 'undefined' && response.data.token) {
    localStorage.setItem('sre_token', response.data.token);
    localStorage.setItem('sre_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

/**
 * Get current authenticated user
 */
export const fetchCurrentUser = async (): Promise<{ authenticated: boolean; user: UserProfile }> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

/**
 * Logout user
 */
export const logoutUser = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sre_token');
    localStorage.removeItem('sre_user');
  }
  await apiClient.post('/auth/logout').catch(() => {});
};
