import { Icon } from '../../shared/Icons'

export function HomeEmpty({browseFrameworks}:{browseFrameworks:()=>void}){
  return <>

          <section className="page-heading"><div className="heading-copy"><div className="eyebrow">Oversight / Home</div>
            <h1>Enterprise Control Tower</h1><p>Connect an authorized organization to see current risk, compliance and work.</p></div></section>
          <div className="inline-state"><h3>No organization connected</h3>
            <p>Source-backed measures and approvals require authenticated tenant access. No illustrative counts are shown.</p>
            <button type="button" className="button primary" onClick={()=>browseFrameworks()}>Browse framework references <Icon name="next"/></button></div>

  </>
}
