import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, AlertTriangle, DollarSign, TrendingUp, ShoppingCart, Clock, FolderOpen, Calendar } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

interface DashboardStats {
    totalProducts: number;
    lowStockProducts: number;
    totalTransactions: number;
    totalCategories: number;
    todaySalesAmount: number;
    todaySalesCount: number;
    recentTransactions: any[];
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [interval, setInterval] = useState('week');
    const [loading, setLoading] = useState(true);
    const [isPosOpen, setIsPosOpen] = useState(true);
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchSettings();
    }, []);

    useEffect(() => {
        fetchChartData();
    }, [interval]);

    const fetchChartData = async () => {
        try {
            const res = await axios.get('/api/transactions/stats/charts', { params: { interval } });
            setChartData(res.data);
        } catch (err) {
            console.error('Failed to fetch chart data', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/transactions/stats/dashboard');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setIsPosOpen(res.data.isPosOpen);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const togglePosStatus = async () => {
        setIsUpdatingSettings(true);
        try {
            const res = await axios.patch('/api/settings', { isPosOpen: !isPosOpen });
            setIsPosOpen(res.data.isPosOpen);
            Swal.fire({
                icon: 'success',
                title: `POS ${res.data.isPosOpen ? 'Opened' : 'Closed'}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (err) {
            console.error('Failed to update settings', err);
            Swal.fire({
                icon: 'error',
                title: 'Operation Failed',
                text: 'Could not update POS status.'
            });
        } finally {
            setIsUpdatingSettings(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back, {user?.name}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {user?.role === 'ADMIN' && (
                        <div className="admin-status-control" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'var(--bg-card)',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>POS System Status</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isPosOpen ? 'var(--green)' : 'var(--red)' }}>
                                    {isPosOpen ? 'SYSTEM OPEN' : 'SYSTEM CLOSED'}
                                </span>
                            </div>
                            <label className="switch" style={{ margin: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={isPosOpen}
                                    onChange={togglePosStatus}
                                    disabled={isUpdatingSettings}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    )}
                    <span className="role-badge">{user?.role}</span>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <span className="stat-value">{stats?.totalProducts || 0}</span>
                        <span className="stat-label">Total Products</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <span className="stat-value">{stats?.lowStockProducts || 0}</span>
                        <span className="stat-label">Low Stock Items</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <span className="stat-value">₱{(stats?.todaySalesAmount || 0).toLocaleString()}</span>
                        <span className="stat-label">Today's Sales</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <span className="stat-value">{stats?.totalTransactions || 0}</span>
                        <span className="stat-label">Total Transactions</span>
                    </div>
                </div>
            </div>

            <div className="analytics-section">
                <div className="section-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <TrendingUp size={20} className="text-accent" />
                        Performance Analytics
                    </h2>
                    <div className="interval-selector">
                        {['day', 'week', 'month', 'year'].map(int => (
                            <button
                                key={int}
                                className={`interval-btn ${interval === int ? 'active' : ''}`}
                                onClick={() => setInterval(int)}
                            >
                                {int.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="charts-grid">
                    {/* POS Sales Chart - Visible to ADMIN, INVENTORY_STAFF, STAFF, CASHIER */}
                    {['ADMIN', 'INVENTORY_STAFF', 'STAFF', 'CASHIER'].includes(user?.role || '') && (
                        <div className="card chart-card">
                            <div className="chart-header">
                                <h3>Point of Sale Revenue</h3>
                                <div className="chart-badge sales">POS</div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                                        <Tooltip
                                            contentStyle={{ background: '#132743', border: '1px solid var(--border)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--green)' }}
                                            labelStyle={{ color: '#fff', marginBottom: '4px' }}
                                            formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Total Sales']}
                                        />
                                        <Area type="monotone" dataKey="sales" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Inventory Movement Chart - Visible to ADMIN, STAFF, INVENTORY_STAFF */}
                    {['ADMIN', 'INVENTORY_STAFF', 'STAFF'].includes(user?.role || '') && (
                        <div className="card chart-card">
                            <div className="chart-header">
                                <h3>Stock Movement (Units Sold)</h3>
                                <div className="chart-badge inventory">Inventory</div>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#132743', border: '1px solid var(--border)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--cyan)' }}
                                            labelStyle={{ color: '#fff', marginBottom: '4px' }}
                                            formatter={(value: any) => [`${value} Units`, 'Sold Quantity']}
                                        />
                                        <Bar dataKey="units" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <h2 className="card-title">Recent Transactions</h2>
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cashier</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentTransactions.map((txn: any) => (
                                    <tr key={txn.id}>
                                        <td>#{txn.id}</td>
                                        <td>{txn.cashier?.name}</td>
                                        <td>{txn._count?.items} items</td>
                                        <td className="text-green">₱{txn.totalAmount.toLocaleString()}</td>
                                        <td>
                                            <span className="date-cell">
                                                <Clock size={14} />
                                                {new Date(txn.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <ShoppingCart size={48} />
                        <h3>No transactions yet</h3>
                        <p>Start processing sales on the POS page</p>
                    </div>
                )}
            </div>
        </div>
    );
}
