import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth, homePathFor } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';

const links = (role) => {
  if (role === 'admin') return [['/admin', 'Dashboard', true], ['/admin/complaints', 'Complaints'], ['/admin/labs', 'Manage Labs'], ['/labs', 'Lab Status'], ['/admin/users', 'Users']];
  if (role === 'technician') return [['/workboard', 'Workboard'], ['/labs', 'Labs']];
  if (role === 'student') return [['/dashboard', 'Dashboard', true], ['/labs', 'Labs'], ['/report', 'Report Problem'], ['/my-reports', 'My Reports'], ['/instructions', 'Instructions']];
  return [['/', 'Home', true], ['/labs', 'Labs'], ['/report', 'Report Issue'], ['/contact', 'Contact']];
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { online } = useLive();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setMenu(false); setUserMenu(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setUserMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const initials = user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <header className="topbar">
        <div className="container">
          <Link to={user ? homePathFor(user.role) : '/'} className="brand">
            <span className="brand-mark"><Logo /></span>
            <span>UNIFIX<small>Computer Lab Support</small></span>
          </Link>
          <nav className={`nav ${menu ? 'open' : ''}`} aria-label="Main">
            {links(user?.role).map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
            {!user && <NavLink to="/login">Login</NavLink>}
          </nav>
          <div className="top-actions">
            <span className={`live-dot ${online ? 'on' : ''}`} title={online ? 'Live updates connected' : 'Live updates offline'} />
            {user ? (
              <>
                <NotificationBell />
                <div className="dd" ref={ref}>
                  <button className="user-chip" onClick={() => setUserMenu((o) => !o)} aria-haspopup="menu" aria-expanded={userMenu}>
                    <span className="avatar">{initials}</span>
                    <span className="who"><b>{user.name.split(' ')[0]}</b><span>{user.role}</span></span>
                    <ChevronDown size={14} />
                  </button>
                  {userMenu && (
                    <div className="dd-panel" role="menu">
                      <Link to="/profile" role="menuitem"><User size={16} /> My profile</Link>
                      <button role="menuitem" onClick={() => { logout(); navigate('/'); }}><LogOut size={16} /> Log out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link className="btn btn-light btn-sm" to="/login">Login</Link>
            )}
            <button className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="footer">
        <div className="container">
          <span>© {new Date().getFullYear()} UNIFIX · College Computer Lab Infrastructure &amp; Support Management</span>
          <span>IT Support · MB Building</span>
        </div>
      </footer>
    </>
  );
}
