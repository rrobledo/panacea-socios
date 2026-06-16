import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, ShoppingCart, FileText, BarChart2,
  Settings, LogOut, Menu, X, ChevronDown, Bell, Search,
  Package, ClipboardList, Printer, ChevronRight
} from 'lucide-react';
import './layout.css';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  {
    label: 'Entities', icon: Package, children: [
      { label: 'Products', to: '/products' },
      { label: 'Orders',   to: '/orders'   },
      { label: 'Customers',to: '/customers' },
    ]
  },
  { label: 'Forms Demo', icon: ClipboardList, children: [
    { label: 'Master–Detail', to: '/forms/master-detail' },
    { label: 'Complex Form',  to: '/forms/complex'       },
  ]},
  { label: 'Charts',  icon: BarChart2, to: '/charts'  },
  { label: 'Reports', icon: FileText,  children: [
    { label: 'Data Grid',       to: '/reports/grid'      },
    { label: 'Report Builder',  to: '/reports/builder'   },
    { label: 'Printable',       to: '/reports/printable' },
  ]},
  { label: 'Users',    icon: Users,    to: '/users'    },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

const NavItem = ({ item, collapsed }) => {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => location.pathname === c.to)
  );

  if (item.children) {
    const active = item.children.some(c => location.pathname === c.to);
    return (
      <div className={`nav-group ${open ? 'open' : ''}`}>
        <button
          className={`nav-link nav-parent ${active ? 'active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <item.icon size={18} className="nav-icon" />
          {!collapsed && <><span className="nav-label">{item.label}</span><ChevronRight size={14} className="nav-arrow" /></>}
        </button>
        {open && !collapsed && (
          <div className="nav-children">
            {item.children.map(c => (
              <Link
                key={c.to}
                to={c.to}
                className={`nav-link nav-child ${location.pathname === c.to ? 'active' : ''}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}
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
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [userMenu, setUserMenu]         = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">E</div>
            {!collapsed && <span className="logo-text">EnterpriseApp</span>}
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
            {!collapsed && <span className="nav-label">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="main-area">
        {/* Header */}
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-icon show-mobile" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="search-box hide-mobile">
              <Search size={15} />
              <input placeholder="Search…" className="search-input" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-icon">
              <Bell size={18} />
            </button>
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setUserMenu(o => !o)}>
                <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                <div className="hide-mobile">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{user?.email}</div>
                </div>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="user-dropdown">
                  <Link to="/settings/profile" className="dropdown-item" onClick={() => setUserMenu(false)}>Profile</Link>
                  <Link to="/settings"         className="dropdown-item" onClick={() => setUserMenu(false)}>Settings</Link>
                  <hr className="divider" />
                  <button className="dropdown-item text-danger" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
