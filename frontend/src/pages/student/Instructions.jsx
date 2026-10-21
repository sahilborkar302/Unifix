import { Download, ExternalLink, FileText } from 'lucide-react';

const guideUrl = '/UNIFIX-Complete-Step-by-Step-Reporting-Guide.pdf';

export default function Instructions() {
  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <h1>Instructions</h1>
            <p>Follow the step-by-step guide to report a specific PC problem correctly.</p>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href={guideUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={17} /> Open PDF
            </a>
            <a className="btn btn-primary" href={guideUrl} download>
              <Download size={17} /> Download guide
            </a>
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <div className="row"><FileText size={19} /><b>UNIFIX Complete Step-by-Step Reporting Guide</b></div>
          </div>
          <iframe
            title="UNIFIX Complete Step-by-Step Reporting Guide"
            src={guideUrl}
            style={{ display: 'block', width: '100%', height: 'calc(100vh - 210px)', minHeight: 620, border: 0 }}
          />
        </div>
      </div>
    </main>
  );
}
