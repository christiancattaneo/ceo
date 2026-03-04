export type Category = 'discovery' | 'integration' | 'transaction';

export interface SubScore {
  name: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface CheckResult {
  name: string;
  category: Category;
  label: string;
  score: number;        // 0-100
  maxScore: number;     // always 100
  weight: number;       // relative importance
  subScores: SubScore[];
  recommendations: string[];
}

export interface CategoryResult {
  score: number;
  maxScore: number;
  checks: CheckResult[];
}

export interface ScanResult {
  url: string;
  score: number;        // 0-100 weighted
  grade: string;        // A+ through F
  categories: {
    discovery: CategoryResult;
    integration: CategoryResult;
    transaction: CategoryResult;
  };
  recommendations: string[];  // top 5 most impactful
  timestamp: string;
  scanDurationMs: number;
}

export interface ScanContext {
  homepageHtml: string | undefined;
  headers: Record<string, string>;
  responseTime: number;
}

export type CheckFn = (baseUrl: string, context: ScanContext) => Promise<CheckResult>;
