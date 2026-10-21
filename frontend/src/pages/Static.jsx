import { Link } from 'react-router-dom';
import { Mail, MapPin, Clock, KeyRound } from 'lucide-react';

export function ForgotPassword() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="stat" style={{ padding: 0, marginBottom: 12 }}><div className="ic tone-blue"><KeyRound size={22} /></div><h1>Forgot password?</h1></div>
        <p>Password reset by email is not enabled yet. Please contact the IT admin with your Student ID – they can set a new password for you from the Users page.</p>
        <p className="muted small" style={{ margin: '12px 0 18px' }}>Already logged in? You can change your password from <b>My profile</b>.</p>
        <Link className="btn btn-primary btn-block" to="/login">Back to login</Link>
      </div>
    </div>
  );
}

export function Contact() {
  return (
    <main className="page"><div className="container" style={{ maxWidth: 760 }}>
      <div className="page-head"><div><h1>Contact IT support</h1><p>For urgent lab issues, report the PC on UNIFIX first so a technician can be assigned.</p></div></div>
      <div className="card card-pad grid" style={{ gap: 18 }}>
        <div className="row"><div className="stat" style={{ padding: 0 }}><div className="ic tone-blue"><MapPin size={20} /></div><div><b style={{ fontSize: 16 }}>IT Support Desk</b><span>MB Building, 4th floor</span></div></div></div>
        <div className="row"><div className="stat" style={{ padding: 0 }}><div className="ic tone-blue"><Clock size={20} /></div><div><b style={{ fontSize: 16 }}>Support hours</b><span>Monday – Saturday, 9:00 am – 5:00 pm</span></div></div></div>
        <div className="row"><div className="stat" style={{ padding: 0 }}><div className="ic tone-blue"><Mail size={20} /></div><div><b style={{ fontSize: 16 }}>Email</b><span>admin@college.edu</span></div></div></div>
      </div>
    </div></main>
  );
}

export function NotFound() {
  return (
    <main className="page"><div className="container"><div className="card"><div className="empty"><b>Page not found</b>The page you are looking for does not exist.<div style={{ marginTop: 14 }}><Link className="btn btn-primary" to="/">Go home</Link></div></div></div></div></main>
  );
}
