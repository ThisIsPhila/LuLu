/**
 * Small, source-checked directory used by the public support screen.
 * Keep source URLs and review dates next to each number so they can be
 * independently rechecked before this list is expanded or localized.
 */
export type SupportResource = {
  id: string;
  name: string;
  category: 'GBV support' | 'Emergency services' | 'Child support' | 'Crisis counselling' | 'Mental health counselling';
  description: string;
  phone: string;
  tel: string;
  availability?: string;
  sourceLabel: string;
  sourceUrl: string;
  serviceUrl?: string;
  checkedOn: string;
};

const checkedOn = '2026-10-29';
const governmentDirectory = 'https://www.gov.za/about-government/government-call-centres-and-help-lines';

export const supportResources: readonly SupportResource[] = [
  {
    id: 'gbv-command-centre',
    name: 'Gender-Based Violence Command Centre',
    category: 'GBV support',
    description: 'South African government support and counselling service.',
    phone: '0800 428 428',
    tel: '0800428428',
    availability: '24 hours',
    sourceLabel: 'South African Government',
    sourceUrl: 'https://www.gov.za/news/media-statements/social-development-urges-communities-report-abuse-gbv-command-centre-records',
    serviceUrl: 'https://www.dsd.gov.za/',
    checkedOn,
  },
  {
    id: 'saps-emergency',
    name: 'SAPS emergency',
    category: 'Emergency services',
    description: 'South African Police Service emergency number.',
    phone: '10111',
    tel: '10111',
    availability: 'Emergency line',
    sourceLabel: 'South African Government',
    sourceUrl: 'https://www.gov.za/faq/justice-and-crime-prevention/where-can-i-find-organisation-offers-assistance-victims-violence',
    serviceUrl: 'https://www.saps.gov.za/',
    checkedOn,
  },
  {
    id: 'childline',
    name: 'Childline South Africa',
    category: 'Child support',
    description: 'National child protection helpline.',
    phone: '116',
    tel: '116',
    sourceLabel: 'South African Government',
    sourceUrl: governmentDirectory,
    serviceUrl: 'https://www.childlinesa.org.za/',
    checkedOn,
  },
  {
    id: 'national-crisis-line',
    name: 'LifeLine National Counselling Line',
    category: 'Crisis counselling',
    description: 'Telephone counselling for a range of personal crises.',
    phone: '0861 322 322',
    tel: '0861322322',
    sourceLabel: 'South African Government',
    sourceUrl: 'https://lifelinesa.co.za/',
    serviceUrl: 'https://lifelinesa.co.za/',
    checkedOn,
  },
  {
    id: 'sadag-crisis-helpline',
    name: 'SADAG Suicide Crisis Helpline',
    category: 'Mental health counselling',
    description: 'Call the South African Depression and Anxiety Group for crisis counselling and guidance. Ask them what support is available for your situation.',
    phone: '0800 567 567',
    tel: '0800567567',
    availability: '24 hours · toll-free',
    sourceLabel: 'SADAG',
    sourceUrl: 'https://www.sadag.org/',
    serviceUrl: 'https://www.sadag.org/',
    checkedOn,
  },
];

export function searchSupportResources(query: string): SupportResource[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...supportResources];
  return supportResources.filter(resource =>
    `${resource.name} ${resource.category} ${resource.description} ${resource.phone}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
}
