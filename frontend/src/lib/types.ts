export type PromiseStatus = "pending" | "in_progress" | "fulfilled" | "broken" | "unclear";
export type ImpactLevel = "high" | "medium" | "low";
export type Feasibility = "fulfillable" | "partial" | "blocked" | "unfulfillable";

export interface Promise {
  id: string;
  promise_text: string;
  promise_tamil: string | null;
  made_by: string;
  made_on: string;
  source_url: string;
  source_name: string;
  category: string;
  status: PromiseStatus;
  status_updated_at: string | null;
  status_evidence: string | null;
  status_source_url: string | null;
  impact_level: ImpactLevel;
  feasibility: Feasibility | null;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  source_name: string;
  source_url: string;
  title: string;
  title_tamil: string | null;
  summary: string | null;
  summary_tamil: string | null;
  published_at: string | null;
  is_relevant: boolean;
  relevance_score: number | null;
  tags: string[] | null;
  status: string;
}

export interface FactCheck {
  id: string;
  claim: string;
  claim_tamil: string | null;
  verdict: "true" | "false" | "misleading" | "unverified" | "satire";
  explanation: string;
  explanation_tamil: string | null;
  confidence: string;
  is_published: boolean;
  created_at: string;
}

export interface ContentDraft {
  id: string;
  theme: string;
  content_type: string;
  content_english: string;
  content_tamil: string | null;
  hashtags: string[] | null;
  status: string;
  created_at: string;
}
