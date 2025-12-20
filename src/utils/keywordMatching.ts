export interface ExperienceMatch {
  slug: string;
  company: string;
  role: string;
  period: string;
  summary: string;
  tags: string[];
  relevanceScore: number;
}

// Experience data (matches content collection structure)
const experienceData: Record<string, Omit<ExperienceMatch, 'relevanceScore'>> = {
  'positium': {
    slug: 'positium',
    company: 'Positium',
    role: 'Technical Project Lead',
    period: '2025 — Present',
    summary: 'Leading the Estonian Mobility Modelling initiative — a 2-year nationwide prototype that transforms mobile network data into actionable mobility insights for urban planning and policy decisions.',
    tags: ['Data Analytics', 'Python', 'Org Design', 'Big Data', 'Mobility'],
  },
  'guardtime-po': {
    slug: 'guardtime-po',
    company: 'Guardtime',
    role: 'Product Owner',
    period: '2024 — 2025',
    summary: 'Led product strategy for enterprise blockchain solutions, focusing on green energy certification and digital payments infrastructure.',
    tags: ['Blockchain', 'Web3', 'Product Strategy', 'DeFi', 'Enterprise'],
  },
  'guardtime-pm': {
    slug: 'guardtime-pm',
    company: 'Guardtime',
    role: 'Technical Project Manager / ScrumMaster',
    period: '2019 — 2024',
    summary: 'Managed complex technical projects at scale, from construction asset management in Saudi Arabia to pandemic response infrastructure across the EU.',
    tags: ['Mobile', 'KSI Blockchain', 'Agile', 'ScrumMaster', 'Enterprise'],
  },
  '4finance': {
    slug: '4finance',
    company: '4Finance Group',
    role: 'Product Manager — Risk & Customer Journey',
    period: '2017 — 2019',
    summary: 'Owned product development for risk assessment and customer journey optimization in consumer lending, launching products across European markets.',
    tags: ['Fintech', 'Risk', 'Agile Coach', 'GDPR', 'Consumer Lending'],
  },
  'playtech': {
    slug: 'playtech',
    company: 'Playtech',
    role: 'Team Lead — Casino Branding',
    period: '2012 — 2017',
    summary: 'Led a front-end development team delivering branding and customization solutions for the world\'s largest gaming operators.',
    tags: ['Gaming', 'Team Lead', 'Scrum', 'Front-end', 'B2B'],
  },
};

const keywordMap: Record<string, string[]> = {
  blockchain: ['guardtime-po', 'guardtime-pm'],
  web3: ['guardtime-po'],
  crypto: ['guardtime-po'],
  defi: ['guardtime-po'],
  token: ['guardtime-po'],
  stablecoin: ['guardtime-po', '4finance'],
  fintech: ['4finance', 'guardtime-po'],
  lending: ['4finance'],
  risk: ['4finance'],
  payments: ['4finance', 'guardtime-po'],
  fraud: ['4finance'],
  enterprise: ['4finance', 'guardtime-pm', 'guardtime-po'],
  gov: ['guardtime-pm'],
  compliance: ['4finance', 'guardtime-pm'],
  gdpr: ['4finance', 'guardtime-pm'],
  data: ['positium'],
  modelling: ['positium'],
  mobility: ['positium'],
  analytics: ['positium'],
  agile: ['playtech', 'guardtime-pm', '4finance'],
  scrum: ['playtech', 'guardtime-pm'],
  transformation: ['playtech', 'guardtime-pm'],
  coaching: ['playtech', 'guardtime-pm'],
  design: [],
  web: [],
  photography: [],
  video: [],
};

export function findRelevantExperiences(userMessage: string): ExperienceMatch[] {
  const lowerMessage = userMessage.toLowerCase();
  const matches: Map<string, ExperienceMatch> = new Map();

  // Check keyword map
  for (const [keyword, slugs] of Object.entries(keywordMap)) {
    if (lowerMessage.includes(keyword)) {
      for (const slug of slugs) {
        const exp = experienceData[slug];
        if (exp) {
          const existing = matches.get(slug);
          matches.set(slug, {
            ...exp,
            relevanceScore: (existing?.relevanceScore || 0) + 1,
          });
        }
      }
    }
  }

  // Sort by relevance score and return top matches
  return Array.from(matches.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}

export function classifyMessage(message: string): 'opportunity' | 'general' {
  const lowerMessage = message.toLowerCase();
  const opportunityKeywords = [
    'pm', 'product', 'manager', 'owner', 'lead', 'hire', 'job', 'team',
    'opportunity', 'position', 'role', 'contract', 'work', 'project',
    'can you help', 'we need', 'looking for'
  ];
  
  return opportunityKeywords.some(keyword => lowerMessage.includes(keyword))
    ? 'opportunity'
    : 'general';
}

