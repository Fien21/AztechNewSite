import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import UserManagement from './pages/UserManagement';
import PriceScanner from './pages/PriceScanner';
import Categories from './pages/Categories';
import Settings from './pages/Settings';

export default function App() {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading AZTECH System...</p>
            </div>
        );
    }

    const defaultPath = user?.role === 'USER' ? '/price-check' : '/';

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <Login />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={user?.role === 'USER' ? <Navigate to="/price-check" replace /> : <Dashboard />} />
                <Route path="/inventory" element={<ProtectedRoute roles={['ADMIN', 'INVENTORY_STAFF', 'STAFF']}><Inventory /></ProtectedRoute>} />
                <Route path="/categories" element={<ProtectedRoute roles={['ADMIN', 'INVENTORY_STAFF', 'STAFF']}><Categories /></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute roles={['ADMIN', 'CASHIER', 'STAFF']}><POS /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute roles={['ADMIN', 'INVENTORY_STAFF', 'CASHIER', 'STAFF']}><SalesHistory /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><Settings /></ProtectedRoute>} />
                <Route path="/price-check" element={<PriceScanner />} />
            </Route>

            <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
    );
}
