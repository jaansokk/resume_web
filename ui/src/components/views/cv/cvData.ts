export interface Experience {
  id: string;
  title: string;
  company: string;
  period: string;
  tags: string[];
  summary: string;
  highlights: string[];
}

export const experiences: Experience[] = [
  {
    id: 'positium',
    title: 'Technical Project Lead',
    company: 'Positium',
    period: '2025 — Present',
    tags: ['Data Analytics', 'Python', 'Org Design', 'Big Data', 'Mobility'],
    summary: 'Leading the Estonian Mobility Modelling initiative — a 2-year nationwide prototype that transforms mobile network data into actionable mobility insights for urban planning and policy decisions.',
    highlights: [
      'Engineering management across international projects in Saudi Arabia, India, and Mongolia',
      'Org design using unFIX patterns for cross-functional team flexibility',
      'Pipeline development for big data analytics (Python, PySpark)',
      'Stakeholder coordination across government and private sector partners',
    ],
  },
  {
    id: 'guardtime-po',
    title: 'Product Owner',
    company: 'Guardtime',
    period: '2024 — 2025',
    tags: ['Blockchain', 'Web3', 'Product Strategy', 'DeFi', 'Enterprise'],
    summary: 'Led product strategy for enterprise blockchain solutions, focusing on green energy certification and digital payments infrastructure.',
    highlights: [
      'Digital Green Energy Certification for Adani — blockchain-based, privacy-preserving renewable energy certificates',
      'UAE Stablecoin platform with zkSync bridge for enterprise cross-border payments',
      'Product discovery and roadmap ownership for Web3 enterprise products',
      'Coordination between engineering, business development, and external partners',
    ],
  },
  {
    id: 'guardtime-pm',
    title: 'Technical Project Manager / ScrumMaster',
    company: 'Guardtime',
    period: '2019 — 2024',
    tags: ['Mobile', 'KSI Blockchain', 'Agile', 'ScrumMaster', 'Enterprise'],
    summary: 'Managed complex technical projects at scale, from construction asset management in Saudi Arabia to pandemic response infrastructure across the EU.',
    highlights: [
      'NEOM Construction Asset Management: Team of 11, 1600 monthly active users, 114 construction sites',
      'EU Digital Covid Certificate: Implementation for vaccination verification across member states',
      'Certified ScrumMaster with hands-on Agile coaching',
      'KSI blockchain integration for tamper-proof audit trails',
    ],
  },
  {
    id: '4finance',
    title: 'Product Manager — Risk & Customer Journey',
    company: '4Finance Group',
    period: '2017 — 2019',
    tags: ['Fintech', 'Risk', 'Agile Coach', 'GDPR', 'Consumer Lending'],
    summary: 'Owned product development for risk assessment and customer journey optimization in consumer lending, launching products across European markets.',
    highlights: [
      'friia.se loan product launch — end-to-end product ownership from concept to market',
      'Event-driven architecture implementation for real-time risk decisioning',
      'GDPR compliance project across multiple data systems',
      'Scaled agile practices across 3 cross-functional teams',
    ],
  },
  {
    id: 'playtech',
    title: 'Team Lead — Casino Branding',
    company: 'Playtech',
    period: '2012 — 2017',
    tags: ['Gaming', 'Team Lead', 'Scrum', 'Front-end', 'B2B'],
    summary: 'Led a front-end development team delivering branding and customization solutions for the world\'s largest gaming operators.',
    highlights: [
      'Team of 7 developers delivering branded casino experiences',
      'Led Agile transformation → 30% reduction in lead time',
      'Feature rollout for 100+ brands including Bet365, Betfair, and major European operators',
      'Technical mentorship and hiring for growing team',
    ],
  },
];

export const skills = {
  product: ['Product Discovery', 'Roadmap Planning', 'User Research', 'A/B Testing', 'OKRs', 'Product Analytics'],
  technical: ['Python', 'TypeScript', 'React', 'Node.js', 'SQL', 'AWS', 'Blockchain'],
  process: ['Scrum', 'Kanban', 'SAFe', 'Event Storming', 'Story Mapping', 'Design Sprints'],
};

export const education = [
  {
    degree: 'MSc Information Technology',
    school: 'Tallinn University of Technology',
    year: '2014',
  },
  {
    degree: 'Certified ScrumMaster (CSM)',
    school: 'Scrum Alliance',
    year: '2020',
  },
];

