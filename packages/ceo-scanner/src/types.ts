export interface CheckResult {
  name: string;
  passed: boolean;
  label: string;
  detail: string;
  recommendation?: string;
  weight: number;
}

export interface ScanResult {
  url: string;
  checks: CheckResult[];
  score: number;
  maxScore: number;
  timestamp: Date;
}
