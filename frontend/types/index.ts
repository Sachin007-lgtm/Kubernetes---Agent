export interface HealthStatus {
  status: string;
  service: string;
}

export interface ProblematicPod {
  name: string;
  namespace: string;
  status: string;
  restart_count?: number;
  message?: string;
}

export interface NetworkIssue {
  service: string;
  namespace: string;
  issue: string;
  severity: string;
}

export interface WarningEvent {
  namespace: string;
  last_seen: string;
  count: number;
  type: string;
  reason: string;
  object: string;
  message: string;
}

export interface InvestigationResult {
  pods?: {
    healthy?: boolean;
    total_pods?: number;
    problematic_pods?: ProblematicPod[];
    error?: string;
  };
  logs?: Record<string, {
    pod: string;
    namespace: string;
    relevant_lines?: string[];
    total_lines_fetched?: number;
    raw_tail?: string;
    error?: string;
  }>;
  events?: {
    total_events?: number;
    warning_count?: number;
    warning_events?: WarningEvent[];
    error?: string;
  };
  deployments?: {
    total_deployments?: number;
    unhealthy_count?: number;
    healthy?: boolean;
    unhealthy_deployments?: Array<{
      name: string;
      namespace: string;
      ready: number;
      desired: number;
      conditions?: string;
    }>;
    error?: string;
  };
  network?: {
    total_services?: number;
    issue_count?: number;
    issues?: NetworkIssue[];
    dns_healthy?: boolean;
    dns_status?: string;
    error?: string;
  };
}

export interface DiagnosisResult {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command?: string | null;
  prevention?: string;
  confidence: number;
  confidence_label: 'High' | 'Medium' | 'Low';
  confidence_reasoning: string[];
}

export interface InvestigateResponse {
  status: 'success' | 'partial';
  investigation: InvestigationResult;
  diagnosis?: DiagnosisResult | null;
  ai_error?: string | null;
}

export interface ClusterInfo {
  name: string;
  cluster: string;
  user?: string;
  namespace?: string;
  is_current: boolean;
  reachable: boolean;
  is_mock?: boolean;
  status?: string;
  info?: string;
}

export interface ClustersResponse {
  clusters: ClusterInfo[];
  current_context: string;
  has_live_clusters: boolean;
  message?: string;
  guide?: Record<string, string>;
}

export interface InvestigationRecord {
  id: string;
  timestamp: string;
  cluster: string;
  namespace: string;
  status: string;
  root_cause: string;
  confidence: number;
  confidence_label: string;
  diagnosis?: DiagnosisResult | null;
  investigation?: InvestigationResult;
  ai_error?: string | null;
}

export interface HistoryResponse {
  status: string;
  total: number;
  investigations: InvestigationRecord[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  token?: string;
}

export interface AuthResponse {
  status: string;
  token: string;
  user: UserProfile;
}
