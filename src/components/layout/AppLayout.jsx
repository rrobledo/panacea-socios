import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart, LogOut, Menu, X, ChevronDown, Bell, User,
} from 'lucide-react';
import './layout.css';

const NAV = [
  { label: 'Ventas', icon: ShoppingCart, to: '/' },
];

const NavItem = ({ item, collapsed }) => {
  const location = useLocation();
  const active = location.pathname === item.to;
  return (
    <Link
      to={item.to}
      className={`nav-link ${active ? 'active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="nav-icon" />
      {!collapsed && <span className="nav-label">{item.label}</span>}
    </Link>
  );
};

export const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [userMenu, setUserMenu]       = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">P</div>
            {!collapsed && <span className="logo-text">Panacea Socios</span>}
          </div>
          <button className="btn btn-ghost btn-icon hide-mobile" onClick={() => setCollapsed(c => !c)}>
            <Menu size={16} />
          </button>
          <button className="btn btn-ghost btn-icon show-mobile" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => (
            <NavItem key={i} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link w-full" onClick={handleLogout}>
            <LogOut size={18} className="nav-icon" />
            {!collapsed && <span className="nav-label">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="main-area">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-icon show-mobile" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setUserMenu(o => !o)}>
                {user?.picture
                  ? <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  : <div className="avatar">{user?.name?.[0]?.toUpperCase() || <User size={16} />}</div>
                }
                <div className="hide-mobile">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name || 'Usuario'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{user?.email}</div>
                </div>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="user-dropdown">
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--gray-500)', borderBottom: '1px solid var(--gray-100)', marginBottom: 4 }}>
                    {user?.email}
                  </div>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
