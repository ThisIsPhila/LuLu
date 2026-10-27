import { useMemo, useState } from 'react';
import { ExternalLink, Phone } from 'lucide-react';
import { searchSupportResources } from '../services/supportDirectory';

/** Read-only, source-linked national directory. It does not contact services for the user. */
export function SupportDirectory() {
  const [query, setQuery] = useState('');
  const resources = useMemo(() => searchSupportResources(query), [query]);

  return <section className="sanctuary-support-directory" aria-label="South African support resources">
    <p className="sanctuary-support-note">South African national numbers. Choose a number to open your phone app. LuLu does not place calls or send messages.</p>
    <label className="sanctuary-support-search">Find a service
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, type or number" />
    </label>
    {resources.length ? <ul className="sanctuary-support-list">
      {resources.map(resource => <li key={resource.id}>
        <article className="sanctuary-support-card">
          <div className="sanctuary-support-card-heading">
            <div><h3>{resource.name}</h3><span>{resource.category}{resource.availability ? ` · ${resource.availability}` : ''}</span></div>
            <a className="sanctuary-support-call" href={`tel:${resource.tel}`} aria-label={`Call ${resource.name} at ${resource.phone}`}><Phone size={15} /> Call</a>
          </div>
          <p>{resource.description}</p>
          <strong className="sanctuary-support-number">{resource.phone}</strong>
          <div className="sanctuary-support-source">
            <a href={resource.sourceUrl} target="_blank" rel="noreferrer">{resource.sourceLabel} <ExternalLink size={12} aria-hidden="true" /></a>
            <span>Checked {resource.checkedOn}</span>
          </div>
        </article>
      </li>)}
    </ul> : <p className="sanctuary-support-note" role="status">No listed service matches that search.</p>}
    <p className="sanctuary-support-note">If a number or service is unavailable, check the linked source for current contact options.</p>
  </section>;
}
