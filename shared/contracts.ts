export type ChatApiRole = 'system' | 'user' | 'assistant';
export type SplitActiveTab = 'brief' | 'experience';
export type UIView = 'chat' | 'split';
export type ShareType = 'conversation' | 'cv_download';

export interface MessageMetrics {
  elapsedMs?: number;
  outputTokens?: number;
}

export interface ChatApiMessage {
  role: ChatApiRole;
  text: string;
  thinking?: string;
  metrics?: MessageMetrics;
}

export interface UISplit {
  activeTab: SplitActiveTab;
}

export interface ClientUI {
  view: UIView;
  split?: UISplit;
}

export interface ClientPage {
  path?: string | null;
  referrerShareId?: string | null;
}

export interface ChatApiClient {
  origin?: string | null;
  page?: ClientPage | null;
  ui?: ClientUI | null;
  thinkingEnabled?: boolean;
}

export interface ChatApiRequest {
  conversationId: string;
  client?: ChatApiClient | null;
  messages: ChatApiMessage[];
}

export interface FitBriefSection {
  id: string;
  title: string;
  content: string;
}

export interface FitBrief {
  title: string;
  sections: FitBriefSection[];
}

export interface RelevantExperienceItem {
  slug: string;
  type: 'experience' | 'project';
  title: string;
  company?: string;
  role?: string;
  period?: string;
  bullets: string[];
  whyRelevant?: string;
}

export interface RelevantExperienceGroup {
  title: string;
  items: RelevantExperienceItem[];
}

export interface RelevantExperience {
  groups: RelevantExperienceGroup[];
}

export interface Artifacts {
  fitBrief?: FitBrief;
  relevantExperience?: RelevantExperience;
}

export interface UIDirective {
  view: UIView;
  split?: UISplit;
}

export interface Hints {
  suggestShare?: boolean;
  suggestTab?: SplitActiveTab | null;
}

export interface AgentUsage {
  outputTokens: number;
}

export interface Usage {
  outputTokens: number;
  byAgent?: Record<string, AgentUsage>;
}

export interface AssistantResponse {
  text: string;
}

export interface ChatApiResponse {
  assistant: AssistantResponse;
  usage?: Usage;
  ui: UIDirective;
  hints?: Hints;
  chips?: string[];
  artifacts?: Artifacts;
  thinking?: string;
}

export interface ShareSnapshot {
  conversationId: string;
  createdAt: string;
  ui: UIDirective;
  messages: ChatApiMessage[];
  artifacts?: Artifacts;
}

export interface CreateShareRequest {
  createdByContact: string;
  snapshot: ShareSnapshot;
  shareType?: ShareType;
}

export interface CreateShareResponse {
  shareId: string;
  path: string;
}

export interface GetShareResponse {
  shareId: string;
  createdAt: string;
  snapshot: ShareSnapshot;
}
