import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import logoImg from '../images/astik.png';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    History,
    Users,
    LogOut,
    Menu,
    X,
    Monitor,
    Camera,
    Tag,
    ChevronDown,
    Settings as SettingsIcon
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'INVENTORY_STAFF', 'CASHIER', 'STAFF'] },
    {
        label: 'Inventory',
        icon: Package,
        roles: ['ADMIN', 'INVENTORY_STAFF', 'STAFF'],
        children: [
            { to: '/inventory', label: 'Products' },
            { to: '/categories', label: 'Categories' },
        ]
    },
    {
        label: 'Sales',
        icon: ShoppingCart,
        roles: ['ADMIN', 'CASHIER', 'STAFF'],
        children: [
            { to: '/pos', label: 'Point of Sale' },
            { to: '/sales', label: 'Sales History' },
        ]
    },
    { to: '/price-check', icon: Camera, label: 'Price Check', roles: ['ADMIN', 'INVENTORY_STAFF', 'CASHIER', 'STAFF', 'USER'] },
    { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
    { to: '/settings', icon: SettingsIcon, label: 'Settings', roles: ['ADMIN', 'STAFF'] },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        Inventory: window.location.pathname.startsWith('/inventory') || window.location.pathname.startsWith('/categories'),
        Sales: window.location.pathname.startsWith('/pos') || window.location.pathname.startsWith('/sales')
    });

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const filteredNavItems = navItems.filter(
        (item) => user && item.roles.includes(user.role)
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {sidebarOpen && (
                <div
                    className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <img src={logoImg} alt="AZTECH" className="logo-img" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        <div>
                            <h1>AZTECH</h1>
                            <div className="logo-subtitle">Computer Enterprises</div>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {filteredNavItems.map((item) => (
                        <div key={item.label}>
                            {item.children ? (
                                <>
                                    <button
                                        className={`nav-link dropdown-toggle ${openGroups[item.label] ? 'open' : ''}`}
                                        onClick={() => toggleGroup(item.label)}
                                    >
                                        <item.icon size={20} />
                                        <span>{item.label}</span>
                                        <ChevronDown size={16} className={`chevron ${openGroups[item.label] ? 'rotated' : ''}`} />
                                    </button>
                                    {openGroups[item.label] && (
                                        <div className="nav-dropdown">
                                            {item.children.map(child => (
                                                <NavLink
                                                    key={child.to}
                                                    to={child.to}
                                                    className={({ isActive }) => `nav-link child-link ${isActive ? 'active' : ''}`}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <NavLink
                                    to={item.to!}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </NavLink>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.name}</span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-navbar">
                    <button className="mobile-menu-btn-nav" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="navbar-content">
                        <div className="navbar-user-section">
                            <div className="navbar-user-name">{user?.name}</div>
                            <span className={`nav-role-badge role-${user?.role?.toLowerCase().replace('_', '-')}`}>
                                {user?.role?.replace('_', ' ')}
                            </span>
                            <div className="navbar-user-avatar">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
