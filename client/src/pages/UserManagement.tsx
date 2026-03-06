import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Shield, UserCheck, User as UserIcon, Package } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Create New User',
            html: `
                <input id="swal-name" class="swal2-input" placeholder="Full Name" />
                <input id="swal-email" class="swal2-input" placeholder="Email" type="email" />
                <input id="swal-password" class="swal2-input" placeholder="Password" type="password" />
                <select id="swal-role" class="swal2-select">
                    <option value="CASHIER">Cashier</option>
                    <option value="STAFF">Staff (All-around)</option>
                    <option value="INVENTORY_STAFF">Inventory Staff</option>
                    <option value="ADMIN">Admin</option>
                    <option value="USER">User (Price Scanner Only)</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Create',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#1e3a5f',
            background: '#132743',
            color: '#e8ecf4',
            preConfirm: () => {
                const name = (document.getElementById('swal-name') as HTMLInputElement).value;
                const email = (document.getElementById('swal-email') as HTMLInputElement).value;
                const password = (document.getElementById('swal-password') as HTMLInputElement).value;
                const role = (document.getElementById('swal-role') as HTMLSelectElement).value;
                if (!name || !email || !password) {
                    Swal.showValidationMessage('All fields are required');
                    return;
                }
                return { name, email, password, role };
            },
        });

        if (formValues) {
            try {
                await axios.post('/api/users', formValues);
                fetchUsers();
                Swal.fire({ icon: 'success', title: 'User Created!', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to create user', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            }
        }
    };

    const handleEdit = async (user: User) => {
        const { value: formValues } = await Swal.fire({
            title: 'Edit User',
            html: `
                <input id="swal-name" class="swal2-input" placeholder="Full Name" value="${user.name}" />
                <input id="swal-email" class="swal2-input" placeholder="Email" type="email" value="${user.email}" />
                <input id="swal-password" class="swal2-input" placeholder="New Password (leave blank to keep)" type="password" />
                <select id="swal-role" class="swal2-select">
                    <option value="CASHIER" ${user.role === 'CASHIER' ? 'selected' : ''}>Cashier</option>
                    <option value="STAFF" ${user.role === 'STAFF' ? 'selected' : ''}>Staff (All-around)</option>
                    <option value="INVENTORY_STAFF" ${user.role === 'INVENTORY_STAFF' ? 'selected' : ''}>Inventory Staff</option>
                    <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                    <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>User (Price Scanner Only)</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Update',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#1e3a5f',
            background: '#132743',
            color: '#e8ecf4',
            preConfirm: () => {
                const name = (document.getElementById('swal-name') as HTMLInputElement).value;
                const email = (document.getElementById('swal-email') as HTMLInputElement).value;
                const password = (document.getElementById('swal-password') as HTMLInputElement).value;
                const role = (document.getElementById('swal-role') as HTMLSelectElement).value;
                const data: any = { name, email, role };
                if (password) data.password = password;
                return data;
            },
        });

        if (formValues) {
            try {
                await axios.put(`/api/users/${user.id}`, formValues);
                fetchUsers();
                Swal.fire({ icon: 'success', title: 'User Updated!', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to update user', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            }
        }
    };

    const handleDelete = async (user: User) => {
        const result = await Swal.fire({
            title: 'Delete User?',
            text: `Are you sure you want to delete "${user.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1e3a5f',
            confirmButtonText: 'Delete',
            background: '#132743',
            color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/users/${user.id}`);
                fetchUsers();
                Swal.fire({ icon: 'success', title: 'User Deleted!', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to delete user', background: '#132743', color: '#e8ecf4', confirmButtonColor: '#2563eb' });
            }
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN': return <Shield size={14} />;
            case 'STAFF': return <UserCheck size={14} />;
            case 'INVENTORY_STAFF': return <UserCheck size={14} />;
            case 'USER': return <Package size={14} />;
            default: return <UserIcon size={14} />;
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>User Management</h1>
                    <p>{users.length} users</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <Plus size={18} /> Add User
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <Users size={56} />
                    <h3>No users found</h3>
                </div>
            ) : (
                <div className="user-grid">
                    {filtered.map((user) => (
                        <div key={user.id} className="user-card">
                            <div className="user-card-avatar">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-card-info">
                                <h3>{user.name}</h3>
                                <p>{user.email}</p>
                                <span className={`role-tag role-${user.role.toLowerCase()}`}>
                                    {getRoleIcon(user.role)} {user.role === 'USER' ? 'PRICE SCANNER' : user.role}
                                </span>
                            </div>
                            <div className="user-card-actions">
                                <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(user)}>
                                    <Edit2 size={16} />
                                </button>
                                <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(user)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
