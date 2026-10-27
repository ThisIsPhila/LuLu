/**
 * Small, source-checked directory used by the private support screen.
 * Keep source URLs and review dates next to each number so they can be
 * independently rechecked before this list is expanded or localized.
 */
export type SupportResource = {
  id: string;
  name: string;
  category: 'GBV support' | 'Emergency services' | 'Child support' | 'Crisis counselling';
  description: string;
  phone: string;
  tel: string;
  availability?: string;
  sourceLabel: string;
  sourceUrl: string;
  checkedOn: string;
};

const checkedOn = '2026-10-26';
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
    checkedOn,
  },
  {
    id: 'national-crisis-line',
    name: 'National Crisis Line',
    category: 'Crisis counselling',
    description: 'Telephone counselling for a range of personal crises.',
    phone: '0861 322 322',
    tel: '0861322322',
    availability: '24 hours',
    sourceLabel: 'South African Government',
    sourceUrl: governmentDirectory,
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
