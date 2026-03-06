import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, Search } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Category {
    id: number;
    name: string;
    _count?: {
        products: number;
    };
}

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        const { value: name } = await Swal.fire({
            title: 'Add New Category',
            input: 'text',
            inputLabel: 'Category Name',
            inputPlaceholder: 'Enter category name...',
            showCancelButton: true,
            background: '#132743',
            color: '#e8ecf4',
            confirmButtonColor: '#2563eb',
        });

        if (name) {
            try {
                await axios.post('/api/categories', { name });
                Swal.fire({
                    icon: 'success',
                    title: 'Category Added',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchCategories();
            } catch (err: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to add',
                    text: err.response?.data?.error || 'Unknown error',
                    background: '#132743',
                    color: '#e8ecf4',
                });
            }
        }
    };

    const handleDeleteCategory = async (cat: Category) => {
        if (cat._count && cat._count.products > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Cannot Delete',
                text: `This category has ${cat._count.products} products. Move or delete them first.`,
                background: '#132743',
                color: '#e8ecf4',
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete the category "${cat.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1e3a5f',
            confirmButtonText: 'Yes, delete it!',
            background: '#132743',
            color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/categories/${cat.id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchCategories();
            } catch (err: any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to delete',
                    text: err.response?.data?.error || 'Unknown error',
                    background: '#132743',
                    color: '#e8ecf4',
                });
            }
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="categories-page">
            <div className="page-header">
                <div>
                    <h1>Category Management</h1>
                    <p>Organize your products with categories</p>
                </div>
                <button className="btn btn-primary" onClick={handleAddCategory}>
                    <Plus size={18} /> Add Category
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Product Count</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-8">
                                        <div className="spinner mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-8 text-muted">
                                        No categories found.
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((cat) => (
                                    <tr key={cat.id}>
                                        <td className="font-semibold">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Tag size={16} className="text-accent" />
                                                {cat.name}
                                            </div>
                                        </td>
                                        <td>{cat._count?.products || 0} Products</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn-icon btn-danger"
                                                onClick={() => handleDeleteCategory(cat)}
                                                title="Delete Category"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
orphanage: false
