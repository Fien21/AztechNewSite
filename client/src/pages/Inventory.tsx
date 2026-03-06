import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, Package, Edit2, Trash2, Archive, RotateCcw,
    AlertTriangle, Barcode, CheckSquare, Square,
    Download, Upload, Eye, ListFilter, TrendingUp, Boxes, DollarSign
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    discountPrice: number | null;
    barcode: string;
    serialNumber: string | null;
    imageUrl: string | null;
    stockQty: number;
    isBundle: boolean;
    categoryId: number;
    category: { id: number; name: string };
    bundleItems?: { id: number; quantity: number; product: Product }[];
    createdAt: string;
    isArchived: boolean;
}

interface Category {
    id: number;
    name: string;
}

export default function Inventory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [loading, setLoading] = useState(true);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    useEffect(() => {
        if (showAnalytics) {
            fetchChartData();
        }
    }, [showAnalytics]);

    const fetchChartData = async () => {
        try {
            const res = await axios.get('/api/transactions/stats/charts', { params: { interval: 'week' } });
            setChartData(res.data);
        } catch (err) {
            console.error('Failed to fetch chart data', err);
        }
    };

    const generateRandomBarcode = () => {
        const length = Math.floor(Math.random() * 7) + 6; // 6 to 12
        let barcode = '';
        for (let i = 0; i < length; i++) {
            barcode += Math.floor(Math.random() * 10).toString();
        }
        return barcode;
    };
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [cachedProducts, setCachedProducts] = useState<{ active: Product[], archived: Product[] }>({ active: [], archived: [] });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Immediate fetch for tab/filter/sort changes
    useEffect(() => {
        setPage(1);
        fetchProducts(1);
    }, [categoryFilter, sortBy, activeTab]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchProducts(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchProducts = async (pageNum = page) => {
        try {
            // Show cached products immediately for the tab if we have them
            if (cachedProducts[activeTab].length > 0 && !search && !categoryFilter && pageNum === 1) {
                setProducts(cachedProducts[activeTab]);
            } else {
                setLoading(true);
            }

            const params: any = {
                sortBy,
                page: pageNum,
                limit: 100
            };
            if (search) params.q = search;
            if (categoryFilter) params.categoryId = categoryFilter;
            if (activeTab === 'archived') params.archived = 'true';

            const res = await axios.get('/api/products/search', { params });
            const data = res.data || {};

            let fetchedProducts: Product[] = [];
            let total = 0;
            let fetchedTotalPages = 1;

            if (Array.isArray(data)) {
                // Backward compatibility just in case
                fetchedProducts = data;
                total = data.length;
                fetchedTotalPages = 1;
            } else {
                fetchedProducts = data.products || [];
                total = data.total || 0;
                fetchedTotalPages = data.totalPages || 1;
            }

            setProducts(fetchedProducts);
            setTotalRecords(total);
            setTotalPages(fetchedTotalPages);

            // Update cache only if not searching/filtering and on first page
            if (!search && !categoryFilter && pageNum === 1) {
                setCachedProducts(prev => ({ ...prev, [activeTab]: fetchedProducts }));
            }

            setSelectedIds([]);
        } catch (err) {
            console.error('Failed to fetch products', err);
        } finally {
            setLoading(false);
        }
    };

    const totalStats = {
        totalItems: totalRecords,
        totalStock: (products || []).reduce((sum, p) => sum + p.stockQty, 0),
        totalValue: (products || []).reduce((sum, p) => sum + (p.price * p.stockQty), 0),
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            fetchProducts(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleViewProduct = (product: Product) => {
        const savings = product.discountPrice ? product.price - product.discountPrice : 0;
        const savingsPercent = product.discountPrice ? (savings / product.price) * 100 : 0;

        Swal.fire({
            title: 'Product Overview',
            width: '600px',
            background: '#132743',
            color: '#e8ecf4',
            showCloseButton: true,
            showConfirmButton: false,
            html: `
                <div class="product-view-container">
                    <div class="product-view-header">
                        ${product.imageUrl
                    ? `<img src="${product.imageUrl}" class="product-view-image" />`
                    : `<div class="product-view-image" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.3"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`
                }
                        <div class="product-view-main-info">
                            <h2 style="margin: 0 0 8px 0; font-size: 1.6rem; font-weight: 800; color: #fff;">${product.name}</h2>
                            <span class="role-tag role-staff" style="margin: 0; padding: 4px 12px; font-size: 0.75rem;">${product.category?.name || 'Uncategorized'}</span>
                        </div>
                    </div>

                    <div class="product-view-grid">
                        <div class="view-stat-item">
                            <span class="view-stat-label">Stock Status</span>
                            <span class="view-stat-value ${product.stockQty <= 10 ? 'text-danger' : 'text-green'}" style="font-weight: 800;">${product.stockQty} Units</span>
                        </div>
                        <div class="view-stat-item">
                            <span class="view-stat-label">Barcode ID</span>
                            <span class="view-stat-value" style="font-family: monospace; font-size: 0.9rem; color: var(--text-secondary); opacity: 0.8;">${product.barcode || 'N/A'}</span>
                        </div>
                        <div class="view-stat-item">
                            <span class="view-stat-label">Serial Number</span>
                            <span class="view-stat-value" style="font-size: 0.9rem; color: var(--text-secondary);">${product.serialNumber || 'N/A'}</span>
                        </div>
                        <div class="view-stat-item">
                            <span class="view-stat-label">Date Added</span>
                            <span class="view-stat-value" style="font-size: 0.9rem; color: var(--text-secondary);">${new Date(product.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div class="calculation-container" style="margin-top: 20px; padding: 15px; background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 8px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.9rem; color: var(--accent-light); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20L12 2z"/></svg>
                            Pricing Details
                        </h4>
                        <div class="product-view-grid" style="grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div class="view-stat-item">
                                <span class="view-stat-label">Excl. Tax (Estimated)</span>
                                <span class="view-stat-value" style="font-size: 1rem;">₱${(product.price / 1.12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="view-stat-item">
                                <span class="view-stat-label">Retail Price (₱)</span>
                                <span class="view-stat-value" style="font-size: 1.1rem; color: var(--cyan); font-weight: 800;">₱${product.price.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    ${product.discountPrice ? `
                        <div class="discount-container" style="margin-top: 15px; padding: 15px; background: rgba(249, 115, 22, 0.05); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px;">Active Discount</h4>
                                    <span style="font-size: 0.75rem; color: #fb923c; opacity: 0.8;">You save ₱${savings.toLocaleString()} (${savingsPercent.toFixed(1)}%)</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.3rem; font-weight: 900; color: #fb923c;">₱${product.discountPrice.toLocaleString()}</div>
                                    <span style="font-size: 0.7rem; color: var(--text-muted); text-decoration: line-through;">Reg: ₱${product.price.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    ${product.isBundle && product.bundleItems && product.bundleItems.length > 0 ? `
                        <div style="margin-top: 15px;">
                            <span class="view-stat-label" style="display: block; margin-bottom: 8px;">Bundle Contents</span>
                            <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); max-height: 120px; overflow-y: auto;">
                                ${product.bundleItems.map(item => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">${item.quantity}x</div>
                                            <span style="font-size: 0.85rem; color: #fff;">${item.product.name}</span>
                                        </div>
                                        <span style="font-size: 0.8rem; color: var(--text-muted);">₱${item.product.price.toLocaleString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div style="margin-top: 15px;">
                        <span class="view-stat-label" style="display: block; margin-bottom: 8px;">Product Description</span>
                        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; max-height: 80px; overflow-y: auto;">
                                ${product.description || 'No detailed description available for this item.'}
                            </p>
                        </div>
                    </div>

                    <div style="margin-top: 25px; display: flex; gap: 12px;">
                        <button id="view-edit-btn" class="btn btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit Product
                        </button>
                        <button id="view-archive-btn" class="btn" style="flex: 1; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; gap: 8px;">
                            ${activeTab === 'active'
                    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> Archive`
                    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Restore`
                }
                        </button>
                    </div>
                </div>
            `,
            didOpen: () => {
                const editBtn = document.getElementById('view-edit-btn');
                const archiveBtn = document.getElementById('view-archive-btn');

                editBtn?.addEventListener('click', () => {
                    Swal.close();
                    handleEditProductModally(product);
                });

                archiveBtn?.addEventListener('click', () => {
                    Swal.close();
                    handleArchive(product);
                });
            }
        });
    };

    const handleAddProductModally = async () => {
        let selectedItems: { productId: number, name: string, price: number, quantity: number }[] = [];

        const { value: formValues } = await Swal.fire({
            title: 'Quick Add Product',
            width: '700px',
            background: '#132743',
            color: '#e8ecf4',
            html: `
                <div class="product-view-container edit-mode" style="max-height: 85vh; overflow-y: auto; padding-right: 4px;">
                    <style>
                        .modal-columns { display: flex; gap: 12px; }
                        .modal-sidebar { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
                        .modal-main { flex: 1; display: flex; flex-direction: column; gap: 8px; }
                        .section-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; padding: 8px; }
                        .section-title { margin: 0 0 6px 0; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
                        .swal-mini-input { height: 28px !important; font-size: 0.8rem !important; padding: 0 8px !important; margin: 0 !important; background: rgba(0,0,0,0.3) !important; border: 1px solid var(--border) !important; color: #fff !important; border-radius: 4px !important; width: 100% !important; }
                        .swal-mini-label { display: block; margin-bottom: 4px; font-size: 0.6rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                    </style>

                    <div class="modal-columns">
                        <!-- Left Sidebar Column -->
                        <div class="modal-sidebar">
                            <div class="product-image-container" style="position: relative; cursor: pointer; width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);" onclick="document.getElementById('swal-image-input').click()">
                                <div id="swal-image-placeholder" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03); width: 100%; height: 100%;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>
                                <div class="image-edit-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                </div>
                                <input id="swal-image-input" type="file" accept="image/*" style="display: none">
                            </div>

                            <div class="section-card">
                                <span class="swal-mini-label">Category</span>
                                <select id="swal-category" class="swal-mini-input">
                                    <option value="" disabled selected>Select...</option>
                                    ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="section-card">
                                <span class="swal-mini-label">Bundle Mode</span>
                                <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
                                    <label class="switch" style="width: 32px; height: 18px;">
                                        <input id="swal-bundle" type="checkbox">
                                        <span class="slider"></span>
                                    </label>
                                    <span id="swal-bundle-text" style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted);">OFF</span>
                                </div>
                            </div>

                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <span class="swal-mini-label">Description</span>
                                <textarea id="swal-description" placeholder="..." style="margin: 0; width: 100%; flex: 1; min-height: 80px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); color: var(--text-secondary); font-size: 0.75rem; border-radius: 4px; padding: 6px; line-height: 1.3; resize: none;"></textarea>
                            </div>
                        </div>

                        <!-- Right Main Column -->
                        <div class="modal-main">
                            <input id="swal-name" placeholder="Product Name" style="margin: 0; width: 100%; height: 34px; background: rgba(0,0,0,0.2); border: 1px solid var(--accent); color: #fff; font-size: 1.05rem; font-weight: 800; border-radius: 4px; padding: 0 12px; border-left-width: 3px;">

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div class="section-card">
                                    <span class="swal-mini-label">Initial Stock</span>
                                    <input id="swal-stock" type="number" class="swal-mini-input" value="0" style="color: var(--cyan); font-weight: 800;">
                                </div>
                                <div class="section-card">
                                    <span class="swal-mini-label">Barcode</span>
                                                                         <div style="display: flex; gap: 4px;">
                                         <input id="swal-barcode" class="swal-mini-input" placeholder="SCANCODE">
                                         <button id="swal-generate-barcode" type="button" class="btn-icon-tiny" title="Generate" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 4px; padding: 0; height: 28px; width: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                                         </button>
                                     </div>

                                </div>
                                <div class="section-card" style="grid-column: span 2;">
                                    <span class="swal-mini-label">Serial Number</span>
                                    <input id="swal-serial" class="swal-mini-input" placeholder="S/N">
                                </div>
                            </div>

                            <div class="calculation-container section-card" style="background: rgba(37, 99, 235, 0.03); border-color: rgba(37, 99, 235, 0.15);">
                                <h4 class="section-title" style="color: var(--accent-light);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20L12 2z"/></svg>
                                    Pricing
                                </h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Tax Type</span>
                                        <select id="swal-tax-type" class="swal-mini-input" style="height: 24px !important;">
                                            <option value="exclusive" selected>Exc</option>
                                            <option value="inclusive">Inc (12%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Cost (Exc)</span>
                                        <input id="swal-exc" type="number" placeholder="0.00" class="swal-mini-input" style="height: 24px !important;">
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Cost (Inc)</span>
                                        <input id="swal-inc" type="number" readonly placeholder="0.00" class="swal-mini-input" style="height: 24px !important; opacity: 0.6;">
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Margin %</span>
                                        <input id="swal-margin" type="number" placeholder="0" class="swal-mini-input" style="height: 24px !important; color: var(--green); font-weight: 800;">
                                    </div>
                                </div>
                                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: space-between;">
                                    <span class="swal-mini-label" style="color: var(--cyan); margin: 0;">Retail Price</span>
                                    <input id="swal-retail" type="number" placeholder="0.00" style="width: 100px; height: 30px; background: rgba(0,0,0,0.3); border: 1px solid var(--cyan); color: var(--cyan); font-size: 0.95rem; font-weight: 900; border-radius: 4px; text-align: right; padding-right: 8px;">
                                </div>
                            </div>

                            <div class="discount-container section-card" style="background: rgba(249, 115, 22, 0.03); border-color: rgba(249, 115, 22, 0.15);">
                                <h4 class="section-title" style="color: #f97316;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4-11 11H4v-4L15 5z"/></svg>
                                    Promotion
                                </h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Type</span>
                                        <select id="swal-discount-type" class="swal-mini-input" style="height: 24px !important;">
                                            <option value="none" selected>None</option>
                                            <option value="percent">-%</option>
                                            <option value="subtract">-₱</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Value</span>
                                        <input id="swal-discount-value" type="number" placeholder="0" class="swal-mini-input" style="height: 24px !important;">
                                    </div>
                                </div>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(0,0,0,0.1); border-radius: 3px; border: 1px dashed rgba(249, 115, 22, 0.2);">
                                    <span class="swal-mini-label" style="color: #fb923c; margin: 0; font-size: 0.55rem;">Promo Price</span>
                                    <div id="swal-discount-result" style="font-size: 0.85rem; font-weight: 900; color: #fb923c;">₱0.00</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="swal-bundle-section" style="display: none; margin-top: 10px; padding: 10px; background: rgba(147, 51, 234, 0.03); border: 1px solid rgba(147, 51, 234, 0.1); border-radius: 8px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 0.75rem; color: #a855f7; text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 6px; font-weight: 800;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
                            Bundle Contents
                        </h4>
                        
                        <div style="position: relative; margin-bottom: 8px;">
                            <div style="display: flex; gap: 6px;">
                                <div style="position: relative; flex: 1;">
                                    <input id="swal-bundle-search" type="text" class="swal-mini-input" placeholder="Search name, barcode, or S/N..." autocomplete="off" style="height: 30px !important;">
                                    <div id="swal-bundle-search-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #1a2f4d; border: 1px solid var(--accent); border-radius: 4px; z-index: 1000; max-height: 150px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-top: 2px;">
                                        <!-- Search results will appear here -->
                                    </div>
                                </div>
                                <button type="button" id="swal-bundle-add-btn" disabled style="padding: 0 12px; background: rgba(147, 51, 234, 0.3); color: rgba(255,255,255,0.5); border: none; border-radius: 4px; font-size: 0.7rem; font-weight: 800; cursor: not-allowed;">ADD</button>
                            </div>
                        </div>

                        <div id="swal-bundle-items-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                             <div style="grid-column: span 2; text-align: center; padding: 12px; color: var(--text-muted); font-style: italic; font-size: 0.75rem; background: rgba(0,0,0,0.05); border-radius: 6px; border: 1px dashed var(--border);">No items added</div>
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Add Product',
            confirmButtonColor: '#2563eb',
            didOpen: () => {
                const taxTypeSelect = document.getElementById('swal-tax-type') as HTMLSelectElement;
                const excInput = document.getElementById('swal-exc') as HTMLInputElement;
                const incInput = document.getElementById('swal-inc') as HTMLInputElement;
                const marginInput = document.getElementById('swal-margin') as HTMLInputElement;
                const retailInput = document.getElementById('swal-retail') as HTMLInputElement;
                const discountTypeSelect = document.getElementById('swal-discount-type') as HTMLSelectElement;
                const discountValueInput = document.getElementById('swal-discount-value') as HTMLInputElement;
                const barcodeInput = document.getElementById('swal-barcode') as HTMLInputElement;
                const generateBarcodeBtn = document.getElementById('swal-generate-barcode');

                if (generateBarcodeBtn && barcodeInput) {
                    generateBarcodeBtn.addEventListener('click', () => {
                        if (!barcodeInput.value) {
                            barcodeInput.value = generateRandomBarcode();
                        }
                    });
                }
                const discountResultDiv = document.getElementById('swal-discount-result') as HTMLDivElement;
                const bundleCheckbox = document.getElementById('swal-bundle') as HTMLInputElement;
                const bundleText = document.getElementById('swal-bundle-text') as HTMLSpanElement;
                const bundleSection = document.getElementById('swal-bundle-section') as HTMLDivElement;
                const bundleItemsList = document.getElementById('swal-bundle-items-list') as HTMLDivElement;
                const bundleAddSelect = document.getElementById('swal-bundle-add-select') as HTMLSelectElement;
                const bundleAddBtn = document.getElementById('swal-bundle-add-btn') as HTMLButtonElement;

                const renderBundleItems = () => {
                    if (selectedItems.length === 0) {
                        bundleItemsList.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 12px; color: var(--text-muted); font-style: italic; font-size: 0.75rem; background: rgba(0,0,0,0.05); border-radius: 6px; border: 1px dashed var(--border);">No items added</div>';
                        return;
                    }

                    bundleItemsList.innerHTML = selectedItems.map((item, index) => `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 0.75rem; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                                <div style="font-size: 0.65rem; color: var(--text-muted);">₱${item.price.toLocaleString()}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="number" class="bundle-item-qty swal-mini-input" data-index="${index}" value="${item.quantity}" min="1" style="width: 36px !important; height: 22px !important; text-align: center; font-size: 0.7rem !important;">
                                <button type="button" class="bundle-item-remove" data-index="${index}" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; cursor: pointer; padding: 3px; border-radius: 3px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>
                    `).join('');

                    // Add listeners for newly rendered elements
                    bundleItemsList.querySelectorAll('.bundle-item-qty').forEach(input => {
                        input.addEventListener('change', (ev) => {
                            const idx = parseInt((ev.target as HTMLInputElement).dataset.index!);
                            const val = parseInt((ev.target as HTMLInputElement).value) || 1;
                            selectedItems[idx].quantity = val;
                        });
                    });

                    bundleItemsList.querySelectorAll('.bundle-item-remove').forEach(btn => {
                        btn.addEventListener('click', (ev) => {
                            const idx = parseInt((ev.currentTarget as HTMLButtonElement).dataset.index!);
                            selectedItems.splice(idx, 1);
                            renderBundleItems();
                        });
                    });
                };

                if (bundleCheckbox && bundleText && bundleSection) {
                    bundleCheckbox.addEventListener('change', (ev: Event) => {
                        const target = ev.target as HTMLInputElement;
                        if (target.checked) {
                            bundleText.innerText = 'ON';
                            bundleText.style.color = 'var(--accent)';
                            bundleSection.style.display = 'block';
                        } else {
                            bundleText.innerText = 'OFF';
                            bundleText.style.color = 'var(--text-muted)';
                            bundleSection.style.display = 'none';
                        }
                    });
                }

                const bundleSearchInput = document.getElementById('swal-bundle-search') as HTMLInputElement;
                const bundleSearchResults = document.getElementById('swal-bundle-search-results') as HTMLDivElement;
                let selectedProductId: number | null = null;
                let currentSearchResults: Product[] = [];

                const updateSearchBtn = (enabled: boolean) => {
                    if (enabled) {
                        bundleAddBtn.disabled = false;
                        bundleAddBtn.style.background = '#9333ea';
                        bundleAddBtn.style.color = 'white';
                        bundleAddBtn.style.cursor = 'pointer';
                    } else {
                        bundleAddBtn.disabled = true;
                        bundleAddBtn.style.background = 'rgba(147, 51, 234, 0.3)';
                        bundleAddBtn.style.color = 'rgba(255,255,255,0.5)';
                        bundleAddBtn.style.cursor = 'not-allowed';
                    }
                };

                if (bundleSearchInput && bundleSearchResults) {
                    let searchTimeout: any;

                    bundleSearchInput.addEventListener('input', (e) => {
                        const term = (e.target as HTMLInputElement).value.trim();
                        selectedProductId = null;
                        updateSearchBtn(false);

                        clearTimeout(searchTimeout);
                        if (term.length < 1) {
                            bundleSearchResults.style.display = 'none';
                            return;
                        }

                        searchTimeout = setTimeout(async () => {
                            try {
                                const response = await axios.get('/api/products/search', {
                                    params: { q: term, limit: 10 }
                                });
                                const matches: Product[] = response.data.products || [];
                                currentSearchResults = matches;

                                if (matches.length > 0) {
                                    bundleSearchResults.innerHTML = matches.map(p => `
                                        <div class="search-result-item" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; transition: background 0.2s;">
                                            <div style="font-weight: 700; color: #fff;">${p.name}</div>
                                            <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                                                <span>₱${p.price.toLocaleString()}</span>
                                                <span style="font-size: 0.6rem; opacity: 0.7;">${p.barcode || ''}</span>
                                            </div>
                                        </div>
                                    `).join('');
                                    bundleSearchResults.style.display = 'block';

                                    bundleSearchResults.querySelectorAll('.search-result-item').forEach(item => {
                                        item.addEventListener('click', () => {
                                            const id = parseInt((item as HTMLElement).dataset.id!);
                                            const name = (item as HTMLElement).dataset.name!;
                                            bundleSearchInput.value = name;
                                            selectedProductId = id;
                                            bundleSearchResults.style.display = 'none';
                                            updateSearchBtn(true);
                                        });
                                        item.addEventListener('mouseover', () => { (item as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; });
                                        item.addEventListener('mouseout', () => { (item as HTMLElement).style.background = 'transparent'; });
                                    });
                                } else {
                                    bundleSearchResults.innerHTML = '<div style="padding: 10px; font-size: 0.75rem; color: var(--text-muted); text-align: center;">No products found</div>';
                                    bundleSearchResults.style.display = 'block';
                                }
                            } catch (err) {
                                console.error('Bundle search error:', err);
                            }
                        }, 300);
                    });

                    // Hide results when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!bundleSearchInput.contains(e.target as Node) && !bundleSearchResults.contains(e.target as Node)) {
                            bundleSearchResults.style.display = 'none';
                        }
                    });
                }

                if (bundleAddBtn) {
                    bundleAddBtn.addEventListener('click', () => {
                        const pid = selectedProductId;
                        if (!pid) return;

                        // Use a more robust way to find the product (it might not be in the current page's 'products' array)
                        const productToAdd = currentSearchResults.find((p: Product) => p.id === pid);
                        if (!productToAdd) return;

                        // Check if already added
                        const existing = selectedItems.find(i => i.productId === pid);
                        if (existing) {
                            existing.quantity += 1;
                        } else {
                            selectedItems.push({
                                productId: pid,
                                name: productToAdd.name,
                                price: productToAdd.price,
                                quantity: 1
                            });
                        }

                        renderBundleItems();
                        bundleSearchInput.value = '';
                        selectedProductId = null;
                        updateSearchBtn(false);
                    });
                }

                const calculateDiscount = () => {
                    const retail = parseFloat(retailInput.value) || 0;
                    const type = discountTypeSelect.value;
                    const val = parseFloat(discountValueInput.value) || 0;

                    if (type === 'none' || val <= 0) {
                        discountResultDiv.innerText = 'No Discount';
                        discountResultDiv.style.opacity = '0.5';
                        return;
                    }

                    let discounted = retail;
                    if (type === 'percent') {
                        discounted = retail - (retail * (val / 100));
                    } else if (type === 'subtract') {
                        discounted = retail - val;
                    }

                    discounted = Math.max(0, discounted);
                    discountResultDiv.innerText = `₱${discounted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    discountResultDiv.style.opacity = '1';
                };

                const calculate = () => {
                    const taxType = taxTypeSelect.value;
                    const exc = parseFloat(excInput.value) || 0;
                    const margin = parseFloat(marginInput.value) || 0;

                    let inc = exc;
                    if (taxType === 'inclusive') {
                        inc = exc * 1.12;
                    }

                    const retail = inc + (inc * (margin / 100));

                    incInput.value = inc.toFixed(2);
                    retailInput.value = retail.toFixed(2);
                };

                const imageInput = document.getElementById('swal-image-input') as HTMLInputElement;
                const imagePlaceholder = document.getElementById('swal-image-placeholder');

                imageInput?.addEventListener('change', (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const url = URL.createObjectURL(file);
                        const imagePreview = document.getElementById('swal-image-preview') as HTMLImageElement;
                        if (imagePreview) {
                            imagePreview.src = url;
                            imagePreview.style.width = '100%';
                            imagePreview.style.height = '100%';
                            imagePreview.style.objectFit = 'cover';
                        } else if (imagePlaceholder) {
                            const img = document.createElement('img');
                            img.id = 'swal-image-preview';
                            img.src = url;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            imagePlaceholder.replaceWith(img);
                        }
                    }
                });

                const calculateMargin = () => {
                    const retail = parseFloat(retailInput.value) || 0;
                    const inc = parseFloat(incInput.value) || 0;

                    if (inc !== 0) {
                        const margin = ((retail - inc) / inc) * 100;
                        marginInput.value = margin.toFixed(2);
                    } else {
                        marginInput.value = "0";
                    }
                };

                taxTypeSelect.addEventListener('change', () => { calculate(); calculateDiscount(); });
                excInput.addEventListener('input', () => { calculate(); calculateDiscount(); });
                marginInput.addEventListener('input', () => { calculate(); calculateDiscount(); });
                retailInput.addEventListener('input', () => { calculateMargin(); calculateDiscount(); });
                discountTypeSelect.addEventListener('change', calculateDiscount);
                discountValueInput.addEventListener('input', calculateDiscount);
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-name') as HTMLInputElement).value;
                const categoryId = (document.getElementById('swal-category') as HTMLSelectElement).value;

                if (!name || !categoryId) {
                    Swal.showValidationMessage('Name and Category are required');
                    return false;
                }

                const retailPrice = parseFloat((document.getElementById('swal-retail') as HTMLInputElement).value);
                const discountType = (document.getElementById('swal-discount-type') as HTMLSelectElement).value;
                const discountVal = parseFloat((document.getElementById('swal-discount-value') as HTMLInputElement).value) || 0;
                let finalDiscountPrice: number | null = null;

                if (discountType !== 'none' && discountVal > 0) {
                    const retail = isNaN(retailPrice) ? 0 : retailPrice;
                    if (discountType === 'percent') {
                        finalDiscountPrice = retail - (retail * (discountVal / 100));
                    } else {
                        finalDiscountPrice = retail - discountVal;
                    }
                    finalDiscountPrice = Math.max(0, finalDiscountPrice);
                }

                return {
                    name,
                    price: isNaN(retailPrice) ? 0 : retailPrice,
                    discountPrice: finalDiscountPrice,
                    stockQty: parseInt((document.getElementById('swal-stock') as HTMLInputElement).value) || 0,
                    isBundle: (document.getElementById('swal-bundle') as HTMLInputElement).checked,
                    description: (document.getElementById('swal-description') as HTMLTextAreaElement).value,
                    serialNumber: (document.getElementById('swal-serial') as HTMLInputElement).value,
                    barcode: (document.getElementById('swal-barcode') as HTMLInputElement).value,
                    categoryId,
                    bundleItems: selectedItems,
                    image: (document.getElementById('swal-image-input') as HTMLInputElement).files?.[0] || null,
                };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData();
                formData.append('name', formValues.name);
                formData.append('price', String(formValues.price));
                if (formValues.discountPrice !== null) {
                    formData.append('discountPrice', String(formValues.discountPrice));
                }
                formData.append('stockQty', String(formValues.stockQty));
                formData.append('isBundle', String(formValues.isBundle));
                if (formValues.isBundle && formValues.bundleItems && formValues.bundleItems.length > 0) {
                    formData.append('bundleItems', JSON.stringify(formValues.bundleItems));
                }
                formData.append('description', formValues.description);
                formData.append('serialNumber', formValues.serialNumber);
                formData.append('categoryId', formValues.categoryId);
                if (formValues.image) {
                    formData.append('image', formValues.image);
                }

                if (formValues.barcode) {
                    formData.append('barcode', formValues.barcode);
                } else {
                    const randomBarcode = Math.floor(100000000 + Math.random() * 900000000).toString();
                    formData.append('barcode', randomBarcode);
                }

                await axios.post('/api/products', formData);

                Swal.fire({
                    icon: 'success',
                    title: 'Added!',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchProducts();
            } catch (err: any) {
                const errorMsg = err.response?.data?.error || 'Error adding product';
                Swal.fire({ icon: 'error', title: 'Add Failed', text: errorMsg, background: '#132743', color: '#e8ecf4' });
            }
        }
    };

    const handleEditProductModally = async (product: Product) => {
        let selectedItems: { productId: number, name: string, price: number, quantity: number }[] = [];

        // Populate initial items if it's a bundle
        if (product.isBundle && product.bundleItems) {
            selectedItems = product.bundleItems.map((bi: any) => ({
                productId: bi.productId,
                name: bi.product?.name || 'Unknown Product',
                price: bi.product?.price || 0,
                quantity: bi.quantity
            }));
        }

        const { value: formValues } = await Swal.fire({
            title: 'Quick Edit Product',
            width: '700px',
            background: '#132743',
            color: '#e8ecf4',
            html: `
                <div class="product-view-container edit-mode" style="max-height: 85vh; overflow-y: auto; padding-right: 4px;">
                    <style>
                        .modal-columns { display: flex; gap: 12px; }
                        .modal-sidebar { width: 180px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
                        .modal-main { flex: 1; display: flex; flex-direction: column; gap: 8px; }
                        .section-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; padding: 8px; }
                        .section-title { margin: 0 0 6px 0; font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
                        .swal-mini-input { height: 28px !important; font-size: 0.8rem !important; padding: 0 8px !important; margin: 0 !important; background: rgba(0,0,0,0.3) !important; border: 1px solid var(--border) !important; color: #fff !important; border-radius: 4px !important; width: 100% !important; }
                        .swal-mini-label { display: block; margin-bottom: 4px; font-size: 0.6rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                    </style>

                    <div class="modal-columns">
                        <!-- Left Sidebar Column -->
                        <div class="modal-sidebar">
                            <div class="product-image-container" style="position: relative; cursor: pointer; width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);" onclick="document.getElementById('swal-image-input').click()">
                                ${product.imageUrl
                    ? `<img id="swal-image-preview" src="${product.imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<div id="swal-image-placeholder" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03); width: 100%; height: 100%;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`
                }
                                <div class="image-edit-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                </div>
                                <input id="swal-image-input" type="file" accept="image/*" style="display: none">
                            </div>

                            <div class="section-card">
                                <span class="swal-mini-label">Category</span>
                                <div class="swal-mini-input" style="display: flex; align-items: center; background: rgba(255,255,255,0.05) !important; color: var(--text-muted); font-weight: 700; font-size: 0.75rem !important;">
                                    ${product.category?.name || 'Uncategorized'}
                                </div>
                            </div>

                            <div class="section-card">
                                <span class="swal-mini-label">Bundle Mode</span>
                                <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
                                    <label class="switch" style="width: 32px; height: 18px;">
                                        <input id="swal-bundle" type="checkbox" ${product.isBundle ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                    <span id="swal-bundle-text" style="font-size: 0.65rem; font-weight: 800; color: ${product.isBundle ? 'var(--accent)' : 'var(--text-muted)'};">
                                        ${product.isBundle ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            </div>

                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <span class="swal-mini-label">Description</span>
                                <textarea id="swal-description" placeholder="..." style="margin: 0; width: 100%; flex: 1; min-height: 80px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); color: var(--text-secondary); font-size: 0.75rem; border-radius: 4px; padding: 6px; line-height: 1.3; resize: none;">${product.description || ''}</textarea>
                            </div>
                        </div>

                        <!-- Right Main Column -->
                        <div class="modal-main">
                            <input id="swal-name" placeholder="Product Name" value="${product.name}" style="margin: 0; width: 100%; height: 34px; background: rgba(0,0,0,0.2); border: 1px solid var(--accent); color: #fff; font-size: 1.05rem; font-weight: 800; border-radius: 4px; padding: 0 12px; border-left-width: 3px;">

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div class="section-card">
                                    <span class="swal-mini-label">Current Stock</span>
                                    <input id="swal-stock" type="number" class="swal-mini-input" value="${product.stockQty}" style="color: var(--cyan); font-weight: 800;">
                                </div>
                                <div class="section-card">
                                    <span class="swal-mini-label">Barcode</span>
                                                                         <div style="display: flex; gap: 4px;">
                                         <input id="swal-barcode" class="swal-mini-input" value="${product.barcode || ''}" placeholder="SCANCODE">
                                         <button id="swal-generate-barcode" type="button" class="btn-icon-tiny" title="Generate" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 4px; padding: 0; height: 28px; width: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.7;"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                                         </button>
                                     </div>

                                </div>
                                <div class="section-card" style="grid-column: span 2;">
                                    <span class="swal-mini-label">Serial Number</span>
                                    <input id="swal-serial" class="swal-mini-input" value="${product.serialNumber || ''}" placeholder="S/N">
                                </div>
                            </div>

                            <div class="calculation-container section-card" style="background: rgba(37, 99, 235, 0.03); border-color: rgba(37, 99, 235, 0.15);">
                                <h4 class="section-title" style="color: var(--accent-light);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20L12 2z"/></svg>
                                    Pricing
                                </h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Tax Type</span>
                                        <select id="swal-tax-type" class="swal-mini-input" style="height: 24px !important;">
                                            <option value="exclusive" selected>Exc</option>
                                            <option value="inclusive">Inc (12%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Cost (Exc)</span>
                                        <input id="swal-exc" type="number" placeholder="0.00" class="swal-mini-input" style="height: 24px !important;">
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Cost (Inc)</span>
                                        <input id="swal-inc" type="number" readonly placeholder="0.00" class="swal-mini-input" style="height: 24px !important; opacity: 0.6;">
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Margin %</span>
                                        <input id="swal-margin" type="number" placeholder="0" class="swal-mini-input" style="height: 24px !important; color: var(--green); font-weight: 800;">
                                    </div>
                                </div>
                                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: space-between;">
                                    <span class="swal-mini-label" style="color: var(--cyan); margin: 0;">Retail Price</span>
                                    <input id="swal-retail" type="number" value="${product.price}" style="width: 100px; height: 30px; background: rgba(0,0,0,0.3); border: 1px solid var(--cyan); color: var(--cyan); font-size: 0.95rem; font-weight: 900; border-radius: 4px; text-align: right; padding-right: 8px;">
                                </div>
                            </div>

                            <div class="discount-container section-card" style="background: rgba(249, 115, 22, 0.03); border-color: rgba(249, 115, 22, 0.15);">
                                <h4 class="section-title" style="color: #f97316;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4-11 11H4v-4L15 5z"/></svg>
                                    Promotion
                                </h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Type</span>
                                        <select id="swal-discount-type" class="swal-mini-input" style="height: 24px !important;">
                                            <option value="none" ${!product.discountPrice ? 'selected' : ''}>None</option>
                                            <option value="percent">-%</option>
                                            <option value="subtract">-₱</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span class="swal-mini-label" style="font-size: 0.55rem;">Value</span>
                                        <input id="swal-discount-value" type="number" placeholder="0" class="swal-mini-input" style="height: 24px !important;">
                                    </div>
                                </div>
                                <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(0,0,0,0.1); border-radius: 3px; border: 1px dashed rgba(249, 115, 22, 0.2);">
                                    <span class="swal-mini-label" style="color: #fb923c; margin: 0; font-size: 0.55rem;">Promo Price</span>
                                    <div id="swal-discount-result" style="font-size: 0.85rem; font-weight: 900; color: #fb923c;">
                                        ${product.discountPrice ? `₱${product.discountPrice.toLocaleString()}` : 'No Promo'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="swal-bundle-section" style="display: ${product.isBundle ? 'block' : 'none'}; margin-top: 10px; padding: 10px; background: rgba(147, 51, 234, 0.03); border: 1px solid rgba(147, 51, 234, 0.1); border-radius: 8px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 0.75rem; color: #a855f7; text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 6px; font-weight: 800;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
                            Bundle Contents
                        </h4>
                        
                        <div style="position: relative; margin-bottom: 8px;">
                            <div style="display: flex; gap: 6px;">
                                <div style="position: relative; flex: 1;">
                                    <input id="swal-bundle-search" type="text" class="swal-mini-input" placeholder="Search name, barcode, or S/N..." autocomplete="off" style="height: 30px !important;">
                                    <div id="swal-bundle-search-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #1a2f4d; border: 1px solid var(--accent); border-radius: 4px; z-index: 1000; max-height: 150px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-top: 2px;">
                                        <!-- Search results will appear here -->
                                    </div>
                                </div>
                                <button type="button" id="swal-bundle-add-btn" disabled style="padding: 0 12px; background: rgba(147, 51, 234, 0.3); color: rgba(255,255,255,0.5); border: none; border-radius: 4px; font-size: 0.7rem; font-weight: 800; cursor: not-allowed;">ADD</button>
                            </div>
                        </div>

                        <div id="swal-bundle-items-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                             <div style="grid-column: span 2; text-align: center; padding: 12px; color: var(--text-muted); font-style: italic; font-size: 0.75rem; background: rgba(0,0,0,0.05); border-radius: 6px; border: 1px dashed var(--border);">No items added</div>
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#2563eb',
            didOpen: () => {
                const taxTypeSelect = document.getElementById('swal-tax-type') as HTMLSelectElement;
                const excInput = document.getElementById('swal-exc') as HTMLInputElement;
                const incInput = document.getElementById('swal-inc') as HTMLInputElement;
                const marginInput = document.getElementById('swal-margin') as HTMLInputElement;
                const retailInput = document.getElementById('swal-retail') as HTMLInputElement;
                const discountTypeSelect = document.getElementById('swal-discount-type') as HTMLSelectElement;
                const discountValueInput = document.getElementById('swal-discount-value') as HTMLInputElement;
                const barcodeInput = document.getElementById('swal-barcode') as HTMLInputElement;
                const generateBarcodeBtn = document.getElementById('swal-generate-barcode');

                if (generateBarcodeBtn && barcodeInput) {
                    generateBarcodeBtn.addEventListener('click', () => {
                        if (!barcodeInput.value) {
                            barcodeInput.value = generateRandomBarcode();
                        }
                    });
                }
                const discountResultDiv = document.getElementById('swal-discount-result') as HTMLDivElement;
                const bundleCheckbox = document.getElementById('swal-bundle') as HTMLInputElement;
                const bundleText = document.getElementById('swal-bundle-text') as HTMLSpanElement;
                const bundleSection = document.getElementById('swal-bundle-section') as HTMLDivElement;
                const bundleItemsList = document.getElementById('swal-bundle-items-list') as HTMLDivElement;
                const bundleSearchInput = document.getElementById('swal-bundle-search') as HTMLInputElement;
                const bundleSearchResults = document.getElementById('swal-bundle-search-results') as HTMLDivElement;
                const bundleAddBtn = document.getElementById('swal-bundle-add-btn') as HTMLButtonElement;
                let selectedProductId: number | null = null;
                let currentSearchResults: Product[] = [];

                const updateSearchBtn = (enabled: boolean) => {
                    if (enabled) {
                        bundleAddBtn.disabled = false;
                        bundleAddBtn.style.background = '#9333ea';
                        bundleAddBtn.style.color = 'white';
                        bundleAddBtn.style.cursor = 'pointer';
                    } else {
                        bundleAddBtn.disabled = true;
                        bundleAddBtn.style.background = 'rgba(147, 51, 234, 0.3)';
                        bundleAddBtn.style.color = 'rgba(255,255,255,0.5)';
                        bundleAddBtn.style.cursor = 'not-allowed';
                    }
                };

                const renderBundleItems = () => {
                    if (selectedItems.length === 0) {
                        bundleItemsList.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 12px; color: var(--text-muted); font-style: italic; font-size: 0.75rem; background: rgba(0,0,0,0.05); border-radius: 6px; border: 1px dashed var(--border);">No items added</div>';
                        return;
                    }

                    bundleItemsList.innerHTML = selectedItems.map((item, index) => `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 0.75rem; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                                <div style="font-size: 0.65rem; color: var(--text-muted);">₱${item.price.toLocaleString()}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="number" class="bundle-item-qty swal-mini-input" data-index="${index}" value="${item.quantity}" min="1" style="width: 36px !important; height: 22px !important; text-align: center; font-size: 0.7rem !important;">
                                <button type="button" class="bundle-item-remove" data-index="${index}" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; cursor: pointer; padding: 3px; border-radius: 3px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>
                    `).join('');

                    // Add listeners for newly rendered elements
                    bundleItemsList.querySelectorAll('.bundle-item-qty').forEach(input => {
                        input.addEventListener('change', (ev) => {
                            const idx = parseInt((ev.target as HTMLInputElement).dataset.index!);
                            const val = parseInt((ev.target as HTMLInputElement).value) || 1;
                            selectedItems[idx].quantity = val;
                        });
                    });

                    bundleItemsList.querySelectorAll('.bundle-item-remove').forEach(btn => {
                        btn.addEventListener('click', (ev) => {
                            const idx = parseInt((ev.currentTarget as HTMLButtonElement).dataset.index!);
                            selectedItems.splice(idx, 1);
                            renderBundleItems();
                        });
                    });
                };

                // Initial render for existing items
                if (selectedItems.length > 0) {
                    renderBundleItems();
                }

                if (bundleCheckbox && bundleText && bundleSection) {
                    bundleCheckbox.addEventListener('change', (ev: Event) => {
                        const target = ev.target as HTMLInputElement;
                        if (target.checked) {
                            bundleText.innerText = 'ON';
                            bundleText.style.color = 'var(--accent)';
                            bundleSection.style.display = 'block';
                        } else {
                            bundleText.innerText = 'OFF';
                            bundleText.style.color = 'var(--text-muted)';
                            bundleSection.style.display = 'none';
                        }
                    });
                }

                if (bundleSearchInput && bundleSearchResults) {
                    let searchTimeout: any;

                    bundleSearchInput.addEventListener('input', (e) => {
                        const term = (e.target as HTMLInputElement).value.trim();
                        selectedProductId = null;
                        updateSearchBtn(false);

                        clearTimeout(searchTimeout);
                        if (term.length < 1) {
                            bundleSearchResults.style.display = 'none';
                            return;
                        }

                        searchTimeout = setTimeout(async () => {
                            try {
                                const response = await axios.get('/api/products/search', {
                                    params: { q: term, limit: 10 }
                                });
                                // Filter out current product to avoid self-bundling
                                const matches: Product[] = (response.data.products || []).filter((p: Product) => p.id !== product.id);
                                currentSearchResults = matches;

                                if (matches.length > 0) {
                                    bundleSearchResults.innerHTML = matches.map(p => `
                                        <div class="search-result-item" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" style="padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; transition: background 0.2s;">
                                            <div style="font-weight: 700; color: #fff;">${p.name}</div>
                                            <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; justify-content: space-between;">
                                                <span>₱${p.price.toLocaleString()}</span>
                                                <span style="font-size: 0.6rem; opacity: 0.7;">${p.barcode || ''}</span>
                                            </div>
                                        </div>
                                    `).join('');
                                    bundleSearchResults.style.display = 'block';

                                    bundleSearchResults.querySelectorAll('.search-result-item').forEach(item => {
                                        item.addEventListener('click', () => {
                                            const id = parseInt((item as HTMLElement).dataset.id!);
                                            const name = (item as HTMLElement).dataset.name!;
                                            bundleSearchInput.value = name;
                                            selectedProductId = id;
                                            bundleSearchResults.style.display = 'none';
                                            updateSearchBtn(true);
                                        });
                                        item.addEventListener('mouseover', () => { (item as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; });
                                        item.addEventListener('mouseout', () => { (item as HTMLElement).style.background = 'transparent'; });
                                    });
                                } else {
                                    bundleSearchResults.innerHTML = '<div style="padding: 10px; font-size: 0.75rem; color: var(--text-muted); text-align: center;">No products found</div>';
                                    bundleSearchResults.style.display = 'block';
                                }
                            } catch (err) {
                                console.error('Bundle search error:', err);
                            }
                        }, 300);
                    });

                    document.addEventListener('click', (e) => {
                        if (!bundleSearchInput.contains(e.target as Node) && !bundleSearchResults.contains(e.target as Node)) {
                            bundleSearchResults.style.display = 'none';
                        }
                    });
                }

                if (bundleAddBtn) {
                    bundleAddBtn.addEventListener('click', () => {
                        const pid = selectedProductId;
                        if (!pid) return;

                        const productToAdd = currentSearchResults.find(p => p.id === pid);
                        if (!productToAdd) return;

                        // Check if already added
                        const existing = selectedItems.find(i => i.productId === pid);
                        if (existing) {
                            existing.quantity += 1;
                        } else {
                            selectedItems.push({
                                productId: pid,
                                name: productToAdd.name,
                                price: productToAdd.price,
                                quantity: 1
                            });
                        }

                        renderBundleItems();
                        bundleSearchInput.value = '';
                        selectedProductId = null;
                        updateSearchBtn(false);
                    });
                }

                let currentDiscountPrice: number | null = product.discountPrice;

                const calculateDiscount = () => {
                    const retail = parseFloat(retailInput.value) || 0;
                    const type = discountTypeSelect.value;
                    const val = parseFloat(discountValueInput.value) || 0;

                    if (type === 'none' || val <= 0) {
                        currentDiscountPrice = null;
                        discountResultDiv.innerText = 'No Discount';
                        discountResultDiv.style.opacity = '0.5';
                        return;
                    }

                    let discounted = retail;
                    if (type === 'percent') {
                        discounted = retail - (retail * (val / 100));
                    } else if (type === 'subtract') {
                        discounted = retail - val;
                    }

                    currentDiscountPrice = Math.max(0, discounted);
                    discountResultDiv.innerText = `₱${currentDiscountPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    discountResultDiv.style.opacity = '1';
                };

                const calculate = () => {
                    const taxType = taxTypeSelect.value;
                    const exc = parseFloat(excInput.value) || 0;
                    const margin = parseFloat(marginInput.value) || 0;

                    let inc = exc;
                    if (taxType === 'inclusive') {
                        inc = exc * 1.12;
                    }

                    const retail = inc + (inc * (margin / 100));

                    incInput.value = inc.toFixed(2);
                    retailInput.value = retail.toFixed(2);
                };

                const imageInput = document.getElementById('swal-image-input') as HTMLInputElement;
                const imagePreview = document.getElementById('swal-image-preview') as HTMLImageElement;
                const imagePlaceholder = document.getElementById('swal-image-placeholder');

                imageInput?.addEventListener('change', (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const url = URL.createObjectURL(file);
                        if (imagePreview) {
                            imagePreview.src = url;
                            imagePreview.style.width = '100%';
                            imagePreview.style.height = '100%';
                            imagePreview.style.objectFit = 'cover';
                        } else if (imagePlaceholder) {
                            // Convert placeholder to image if it was empty
                            const img = document.createElement('img');
                            img.id = 'swal-image-preview';
                            img.src = url;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            imagePlaceholder.replaceWith(img);
                        }
                    }
                });

                const calculateMargin = () => {
                    const retail = parseFloat(retailInput.value) || 0;
                    const inc = parseFloat(incInput.value) || 0;

                    if (inc !== 0) {
                        const margin = ((retail - inc) / inc) * 100;
                        marginInput.value = margin.toFixed(2);
                    } else {
                        marginInput.value = "0";
                    }
                };

                taxTypeSelect.addEventListener('change', () => { calculate(); calculateDiscount(); });
                excInput.addEventListener('input', () => { calculate(); calculateDiscount(); });
                marginInput.addEventListener('input', () => { calculate(); calculateDiscount(); });
                retailInput.addEventListener('input', () => { calculateMargin(); calculateDiscount(); });
                discountTypeSelect.addEventListener('change', calculateDiscount);
                discountValueInput.addEventListener('input', calculateDiscount);

                // Initial discount setup if exists
                if (product.discountPrice) {
                    discountTypeSelect.value = 'subtract';
                    discountValueInput.value = (product.price - product.discountPrice).toFixed(2);
                    calculateDiscount();
                }
            },
            preConfirm: () => {
                const retailPrice = parseFloat((document.getElementById('swal-retail') as HTMLInputElement).value);

                // Get discount price from our calculated state
                const discountType = (document.getElementById('swal-discount-type') as HTMLSelectElement).value;
                const discountVal = parseFloat((document.getElementById('swal-discount-value') as HTMLInputElement).value) || 0;
                let finalDiscountPrice: number | null = null;

                if (discountType !== 'none' && discountVal > 0) {
                    const retail = isNaN(retailPrice) ? 0 : retailPrice;
                    if (discountType === 'percent') {
                        finalDiscountPrice = retail - (retail * (discountVal / 100));
                    } else {
                        finalDiscountPrice = retail - discountVal;
                    }
                    finalDiscountPrice = Math.max(0, finalDiscountPrice);
                }

                return {
                    name: (document.getElementById('swal-name') as HTMLInputElement).value,
                    price: isNaN(retailPrice) ? 0 : retailPrice,
                    discountPrice: finalDiscountPrice,
                    stockQty: parseInt((document.getElementById('swal-stock') as HTMLInputElement).value),
                    isBundle: (document.getElementById('swal-bundle') as HTMLInputElement).checked,
                    description: (document.getElementById('swal-description') as HTMLTextAreaElement).value,
                    serialNumber: (document.getElementById('swal-serial') as HTMLInputElement).value,
                    barcode: (document.getElementById('swal-barcode') as HTMLInputElement).value,
                    bundleItems: selectedItems,
                    image: (document.getElementById('swal-image-input') as HTMLInputElement).files?.[0] || null,
                };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData();
                formData.append('name', formValues.name);
                formData.append('price', String(formValues.price));
                if (formValues.discountPrice !== undefined) {
                    formData.append('discountPrice', formValues.discountPrice === null ? '' : String(formValues.discountPrice));
                }
                formData.append('stockQty', String(formValues.stockQty));
                formData.append('isBundle', String(formValues.isBundle));
                if (formValues.isBundle && formValues.bundleItems && formValues.bundleItems.length > 0) {
                    formData.append('bundleItems', JSON.stringify(formValues.bundleItems));
                }
                formData.append('description', formValues.description);
                formData.append('serialNumber', formValues.serialNumber);
                if (formValues.barcode) {
                    formData.append('barcode', formValues.barcode);
                }
                formData.append('categoryId', String(product.categoryId));
                if (formValues.image) {
                    formData.append('image', formValues.image);
                }

                await axios.put(`/api/products/${product.id}`, formData);

                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchProducts();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error updating product', background: '#132743', color: '#e8ecf4' });
            }
        }
    };

    const handlePrintBarcode = (product: Product) => {
        Swal.fire({
            title: '<span style="font-weight: 800; color: #fff; font-size: 1.8rem;">Print Barcodes</span>',
            html: `
                <div style="text-align: left; padding: 1.5rem 1rem 0.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
                    <style>
                        .swal-premium-input { 
                            background: #1e293b !important; 
                            border: 1px solid #334155 !important; 
                            color: #f8fafc !important; 
                            border-radius: 12px !important; 
                            padding: 0.75rem 1rem !important; 
                            width: 100% !important; 
                            font-size: 1rem !important;
                            transition: all 0.2s ease !important;
                            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1) !important;
                            margin: 0 !important;
                        }
                        .swal-premium-input:focus {
                            border-color: #3b82f6 !important;
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
                            outline: none !important;
                        }
                        .swal-label-premium {
                            display: block; 
                            font-weight: 700; 
                            font-size: 0.75rem; 
                            color: #94a3b8; 
                            text-transform: uppercase; 
                            letter-spacing: 0.075em; 
                            margin-bottom: 0.6rem;
                            margin-left: 0.2rem;
                        }
                        .swal2-confirm, .swal2-cancel {
                            border-radius: 10px !important;
                            font-weight: 600 !important;
                            padding: 0.8rem 2rem !important;
                            transition: transform 0.2s ease, filter 0.2s ease !important;
                        }
                        .swal2-confirm:hover, .swal2-cancel:hover {
                            transform: translateY(-1px);
                            filter: brightness(1.1);
                        }
                    </style>
                    <div>
                        <label class="swal-label-premium">Quantity</label>
                        <input id="swal-print-qty" type="number" value="1" min="1" step="1" class="swal-premium-input">
                    </div>
                    <div>
                        <label class="swal-label-premium">Label Size</label>
                        <select id="swal-print-size" class="swal-premium-input">
                            <option value="small">Small (40x25mm)</option>
                            <option value="medium" selected>Medium (50x35mm)</option>
                            <option value="big">Big (70x45mm)</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Generate Labels',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#334155',
            background: '#0f172a',
            color: '#f8fafc',
            padding: '2rem',
            customClass: {
                confirmButton: 'premium-swal-button',
                cancelButton: 'premium-swal-button'
            },
            didOpen: () => {
                const qtyInput = document.getElementById('swal-print-qty') as HTMLInputElement;
                if (qtyInput) {
                    qtyInput.focus();
                    qtyInput.select();
                }
            },
            preConfirm: () => {
                const qty = parseInt((document.getElementById('swal-print-qty') as HTMLInputElement).value) || 1;
                const size = (document.getElementById('swal-print-size') as HTMLSelectElement).value;
                return { qty, size };
            }
        })
            .then((result) => {
                if (result.isConfirmed) {
                    const { qty, size } = result.value;
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;

                    let width = 180, height = 120, fontSize = 11, imgWidth = 140;
                    if (size === 'small') { width = 140; height = 90; fontSize = 9; imgWidth = 110; }
                    if (size === 'big') { width = 240; height = 160; fontSize = 14; imgWidth = 190; }

                    const labelsHtml = Array(qty).fill(0).map(() => `
                    <div style="width: ${width}px; height: ${height}px; padding: 10px; border: 1px dashed #ccc; text-align: center; font-family: 'Inter', system-ui, -apple-system, sans-serif; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; background: white; color: black; box-sizing: border-box; overflow: hidden;">
                        <div style="font-weight: 800; font-size: ${fontSize}px; line-height: 1.1; margin-bottom: 6px; width: 100%; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #000; text-transform: uppercase;">${product.name}</div>
                        <div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 0; padding: 2px 0;">
                            <img src="/api/barcode/generate/${product.barcode}?t=${Date.now()}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;" />
                        </div>
                    </div>
                `).join('');

                    printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print Barcodes - ${product.name}</title>
                            <style>
                                @page { margin: 0; }
                                body { margin: 0; padding: 10px; background: white; }
                                .grid {
                                    display: grid;
                                    grid-template-columns: repeat(auto-fill, ${width}px);
                                    gap: 15px;
                                    justify-content: center;
                                }
                                @media print {
                                    .grid { gap: 0; }
                                    body { padding: 0; }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="grid">
                                ${labelsHtml}
                            </div>
                            <script>
                                window.onload = () => {
                                    setTimeout(() => {
                                        window.print();
                                        window.close();
                                    }, 500);
                                };
                            </script>
                        </body>
                    </html>
                `);
                    printWindow.document.close();
                }
            });
    };

    const handleArchive = async (product: Product) => {
        const result = await Swal.fire({
            title: activeTab === 'active' ? 'Archive Product?' : 'Restore Product?',
            text: activeTab === 'active'
                ? `Are you sure you want to archive "${product.name}" ? `
                : `Are you sure you want to restore "${product.name}" ? `,
            icon: activeTab === 'active' ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#1e3a5f',
            confirmButtonText: activeTab === 'active' ? 'Archive' : 'Restore',
            background: '#132743',
            color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                if (activeTab === 'active') {
                    await axios.delete(`/api/products/${product.id}`);
                } else {
                    await axios.put(`/api/products/restore/${product.id}`);
                }

                // Fetch products for current page to fill the gap from next page
                fetchProducts(page);

                Swal.fire({
                    icon: 'success',
                    title: activeTab === 'active' ? 'Archived!' : 'Restored!',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', background: '#132743', color: '#e8ecf4' });
            }
        }
    };

    const handleDeletePermanent = async (product: Product) => {
        const result = await Swal.fire({
            title: 'Delete Permanently?',
            text: `This will remove "${product.name}" forever from the database.This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1e3a5f',
            confirmButtonText: 'Yes, Delete Forever',
            background: '#132743',
            color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/products/permanent-delete/${product.id}`);

                // Fetch products for current page to fill the gap
                fetchProducts(page);

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Product has been permanently removed.',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } catch (err: any) {
                const errorMsg = err.response?.data?.error || 'Failed to permanently delete product.';
                const details = err.response?.data?.details || '';
                Swal.fire({
                    icon: 'error',
                    title: 'Delete Failed',
                    text: errorMsg,
                    footer: details ? `<div style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${details}</div>` : '',
                    background: '#132743',
                    color: '#e8ecf4'
                });
            }
        }
    };

    const handleBulkArchive = async () => {
        if (selectedIds.length === 0) return;
        const result = await Swal.fire({
            title: activeTab === 'active' ? 'Bulk Archive?' : 'Bulk Restore?',
            text: activeTab === 'active'
                ? `Archive ${selectedIds.length} products?`
                : `Restore ${selectedIds.length} products?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            confirmButtonText: activeTab === 'active' ? 'Archive Selected' : 'Restore Selected',
            background: '#132743', color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                if (activeTab === 'active') {
                    await axios.post('/api/products/bulk-delete', { ids: selectedIds });
                } else {
                    await axios.post('/api/products/bulk-restore', { ids: selectedIds });
                }

                fetchProducts(page);
                setSelectedIds([]);
                Swal.fire({
                    icon: 'success',
                    title: activeTab === 'active' ? 'Archived!' : 'Restored!',
                    background: '#132743', color: '#e8ecf4', timer: 1500
                });
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', background: '#132743', color: '#e8ecf4' });
            }
        }
    };

    const handleBulkDeletePermanent = async () => {
        if (selectedIds.length === 0) return;
        const result = await Swal.fire({
            title: `Delete ${selectedIds.length} Permanently?`,
            text: `This will remove these products forever from the database. This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#1e3a5f',
            confirmButtonText: 'Yes, Delete All Forever',
            background: '#132743',
            color: '#e8ecf4',
        });

        if (result.isConfirmed) {
            try {
                await axios.post('/api/products/bulk-delete-permanent', { ids: selectedIds });
                fetchProducts(page);
                setSelectedIds([]);
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Selected products have been permanently removed.',
                    background: '#132743',
                    color: '#e8ecf4',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } catch (err: any) {
                const errorMsg = err.response?.data?.error || 'Failed to permanently delete products.';
                const details = err.response?.data?.details || '';
                Swal.fire({
                    icon: 'error',
                    title: 'Bulk Delete Failed',
                    text: errorMsg,
                    footer: details ? `<div style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${details}</div>` : '',
                    background: '#132743',
                    color: '#e8ecf4'
                });
            }
        }
    };

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const templateData = [
            {
                'Name': 'Product Name Here',
                'Description': 'Brief description of the product',
                'Category': 'Category Name',
                'Price': 99.99,
                'Stock': 100,
                'Barcode': '123456789012',
                'Serial Number': 'SN-123456'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        if (format === 'xlsx') {
            XLSX.writeFile(wb, "AZTECH_Inventory_Template.xlsx");
        } else {
            XLSX.writeFile(wb, "AZTECH_Inventory_Template.csv", { bookType: 'csv' });
        }
    };

    const triggerImportFlow = async () => {
        // Step 1: Unified Dialog with Instructions, Templates, and File Picker
        const { value: file, isConfirmed } = await Swal.fire({
            title: 'Import Inventory',
            width: '600px',
            background: '#132743',
            color: '#e8ecf4',
            html: `
                <div class="import-dialog">
                    <div class="import-instructions">
                        <p>Excel / CSV Format Requirements</p>
                        <ul>
                            <li>Use <strong>.xlsx</strong> or <strong>.csv</strong> files only.</li>
                            <li>Required columns: <strong>Name, Category, Price, Stock</strong>.</li>
                            <li>Optional columns: <strong>Description, Barcode, Serial Number</strong>.</li>
                            <li>Price and Stock must be numerical values.</li>
                        </ul>
                    </div>
                    
                    <div class="import-templates">
                        <button id="dl-xlsx" class="template-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            .XLSX Template
                        </button>
                        <button id="dl-csv" class="template-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                            .CSV Template
                        </button>
                    </div>

                    <div id="drop-zone" class="import-upload-zone">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent" style="opacity: 0.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        <p>Click to select or drag and drop your file here</p>
                        <input type="file" id="import-file-input" style="display: none" accept=".xlsx, .xls, .csv" />
                    </div>

                    <div id="file-info" class="selected-file-info" style="display: none">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span id="file-name-text" class="selected-file-name"></span>
                        <button id="remove-file" class="btn-icon-tiny" style="color: var(--red)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirm & Upload',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            didOpen: () => {
                const dropZone = document.getElementById('drop-zone');
                const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
                const dlXlsx = document.getElementById('dl-xlsx');
                const dlCsv = document.getElementById('dl-csv');
                const fileInfo = document.getElementById('file-info');
                const fileNameText = document.getElementById('file-name-text');
                const removeFile = document.getElementById('remove-file');

                dlXlsx!.onclick = () => downloadTemplate('xlsx');
                dlCsv!.onclick = () => downloadTemplate('csv');

                dropZone!.onclick = () => fileInput.click();

                fileInput.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                        fileNameText!.innerText = file.name;
                        fileInfo!.style.display = 'flex';
                        dropZone!.style.display = 'none';
                    }
                };

                removeFile!.onclick = (e) => {
                    e.stopPropagation();
                    fileInput.value = '';
                    fileInfo!.style.display = 'none';
                    dropZone!.style.display = 'block';
                };
            },
            preConfirm: () => {
                const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
                const file = fileInput.files?.[0];
                if (!file) {
                    Swal.showValidationMessage('Please select a file first');
                    return false;
                }
                return file;
            }
        });

        if (!isConfirmed || !file) return;

        // Step 2: Final Confirmation & Progress
        const confirmUpload = await Swal.fire({
            title: 'Ready to Upload?',
            text: `Confirming processing for "${file.name}". This will update your inventory.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Start Upload',
            background: '#132743',
            color: '#e8ecf4',
            confirmButtonColor: '#22c55e',
        });

        if (confirmUpload.isConfirmed) {
            handleUploadProcess(file);
        }
    };

    const handleUploadProcess = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

                if (data.length === 0) {
                    Swal.fire({ icon: 'error', title: 'Empty File', background: '#132743', color: '#e8ecf4' });
                    return;
                }

                // Show Real-time Progress Dialog
                Swal.fire({
                    title: 'Uploading Inventory...',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    background: '#132743',
                    color: '#e8ecf4',
                    html: `
                        <div class="upload-progress-wrapper">
                            <div class="upload-progress-container">
                                <div id="bulk-progress-bar" class="upload-progress-bar"></div>
                            </div>
                            <div class="upload-status-text">
                                <span id="bulk-status-msg">Processing items...</span>
                                <span id="bulk-percentage" class="upload-percentage">0%</span>
                            </div>
                        </div>
                    `,
                    didOpen: async () => {
                        const progressBar = document.getElementById('bulk-progress-bar');
                        const progressText = document.getElementById('bulk-percentage');
                        const statusMsg = document.getElementById('bulk-status-msg');

                        const mapped = data.map((item: any) => ({
                            name: (item.product_name || item.Name || item.name || '').toString().trim(),
                            description: (item.Description || item.description || '').toString(),
                            categoryName: (item.Category || item.category || 'General').toString(),
                            price: item.price || item.Price || 0,
                            discountPrice: item.discounted || item.discountPrice || null,
                            stockQty: item.stocks || item.Stock || item.stock || 0,
                            barcode: (item.barcode || item.Barcode || '').toString().trim(),
                            serialNumber: (item['Serial Number'] || item.serialNumber || '').toString().trim()
                        })).filter(p => p.name !== '');

                        if (mapped.length === 0) {
                            const firstItem = data[0] || {};
                            const keys = Object.keys(firstItem).join(', ');
                            Swal.fire({
                                icon: 'warning',
                                title: 'No Valid Products Found',
                                text: `We couldn't find any products in your file. Please ensure your Excel/CSV has a "Name" column. Found columns: ${keys}`,
                                background: '#132743', color: '#e8ecf4'
                            });
                            return;
                        }

                        try {
                            const CHUNK_SIZE = 25;
                            const totalItems = mapped.length;
                            const totalChunks = Math.ceil(totalItems / CHUNK_SIZE);

                            for (let i = 0; i < totalChunks; i++) {
                                const start = i * CHUNK_SIZE;
                                const end = Math.min(start + CHUNK_SIZE, totalItems);
                                const chunk = mapped.slice(start, end);

                                const currentProgress = Math.round((i / totalChunks) * 100);
                                if (progressBar) progressBar.style.width = `${currentProgress}%`;
                                if (progressText) progressText.innerText = `${currentProgress}%`;
                                if (statusMsg) statusMsg.innerText = `Processing items ${start + 1} to ${end}...`;

                                await axios.post('/api/products/import', { products: chunk });
                            }

                            if (progressBar) progressBar.style.width = '100%';
                            if (progressText) progressText.innerText = '100%';
                            if (statusMsg) statusMsg.innerText = 'Import Complete!';

                            setTimeout(() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Success!',
                                    text: `Imported ${totalItems} items successfully.`,
                                    background: '#132743', color: '#e8ecf4'
                                });
                                fetchProducts(1);
                            }, 500);
                        } catch (err: any) {
                            console.error('Import error:', err);
                            Swal.fire({
                                icon: 'error',
                                title: 'Upload Failed',
                                text: err.response?.data?.error || 'A network error occurred during import.',
                                background: '#132743',
                                color: '#e8ecf4'
                            });
                        }
                    }
                });

            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Parse Error', text: 'Error reading file format.', background: '#132743', color: '#e8ecf4' });
            }
        };
        reader.readAsBinaryString(file);
    };



    const handleClearInventory = async () => {
        if (totalRecords === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data',
                text: 'The inventory is already empty.',
                background: '#132743',
                color: '#e8ecf4'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Clear All Inventory Data?',
            html: `
                <p style="margin-bottom: 15px;">This will permanently delete items, categories, and transactions. <b>This action cannot be undone!</b></p>
                <div class="swal2-input-group" style="margin-top: 15px;">
                    <input type="password" id="confirmPassword" class="swal2-input" placeholder="Enter your password to confirm" style="width: 80%; margin: 0 auto; display: block;">
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete Everything!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            background: '#132743',
            color: '#e8ecf4',
            preConfirm: () => {
                const password = (document.getElementById('confirmPassword') as HTMLInputElement).value;
                if (!password) {
                    Swal.showValidationMessage('Password is required');
                    return false;
                }
                return password;
            }
        });

        if (result.isConfirmed) {
            const password = result.value;
            try {
                Swal.fire({
                    title: 'Clearing Data...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    background: '#132743',
                    color: '#e8ecf4'
                });

                await axios.post('/api/products/clear-inventory', { password });

                await Swal.fire({
                    icon: 'success',
                    title: 'Database Wiped',
                    text: 'All inventory data has been successfully cleared.',
                    background: '#132743',
                    color: '#e8ecf4'
                });

                fetchProducts(1);
                fetchCategories();
            } catch (err: any) {
                console.error('Clear failed:', err);
                const errorMsg = err.response?.data?.error || 'Could not clear the database.';
                const details = err.response?.data?.details || '';

                Swal.fire({
                    icon: 'error',
                    title: 'Process Failed',
                    text: errorMsg,
                    footer: details ? `<div style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${details}</div>` : '',
                    background: '#132743',
                    color: '#e8ecf4'
                });
            }
        }
    };

    const exportToExcel = () => {
        const data = products.map(p => ({
            'Name': p.name,
            'Description': p.description,
            'Category': p.category?.name,
            'Price': p.price,
            'Stock': p.stockQty,
            'Barcode': p.barcode,
            'Serial Number': p.serialNumber || '',
            'Date Added': new Date(p.createdAt).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `AZTECH_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="page inventory-page">
            <div className="page-header">
                <div>
                    <h1>Inventory</h1>
                    <p>Manage your computer enterprises products</p>
                </div>
                <div className="header-actions">
                    <button className={`btn btn-secondary ${showAnalytics ? 'active' : ''}`} onClick={() => setShowAnalytics(!showAnalytics)}>
                        <TrendingUp size={18} /> Analytics
                    </button>
                    <button className="btn btn-secondary" onClick={triggerImportFlow}>
                        <Upload size={18} /> Import Excel
                    </button>
                    <button className="btn btn-secondary" onClick={exportToExcel}>
                        <Download size={18} /> Export Excel
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={handleClearInventory}>
                            <Trash2 size={18} /> Clear All Data
                        </button>
                    )}
                    {activeTab === 'active' && (
                        <button className="btn btn-primary" onClick={handleAddProductModally}>
                            <Plus size={18} /> Add Product
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                    className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none',
                        color: activeTab === 'active' ? 'var(--accent-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'active' ? '2px solid var(--accent-light)' : 'none',
                        cursor: 'pointer', fontWeight: 600
                    }}
                >
                    Active Products
                </button>
                <button
                    className={`tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
                    onClick={() => setActiveTab('archived')}
                    style={{
                        padding: '10px 20px', background: 'none', border: 'none',
                        color: activeTab === 'archived' ? 'var(--accent-light)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'archived' ? '2px solid var(--accent-light)' : 'none',
                        cursor: 'pointer', fontWeight: 600
                    }}
                >
                    Archived
                </button>
            </div>

            {showAnalytics && (
                <div className="card analytics-card" style={{ marginBottom: '24px', animation: 'fadeIn 0.3s ease', padding: '24px' }}>
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={20} className="text-cyan" />
                            <h3 style={{ margin: 0 }}>Stock Movement (Weekly Sold Units)</h3>
                        </div>
                        <span className="chart-badge inventory">Inventory Analytics</span>
                    </div>
                    <div style={{ height: '200px', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorInventory" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#132743', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--cyan)' }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value: any) => [`${value} Units`, 'Quantity Sold']}
                                />
                                <Area type="monotone" dataKey="units" stroke="var(--cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorInventory)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="inventory-stats">
                <div className="stat-card">
                    <Boxes className="stat-icon" />
                    <div>
                        <span className="stat-label">Total Products</span>
                        <div className="stat-value">{totalStats.totalItems}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <TrendingUp className="stat-icon" />
                    <div>
                        <span className="stat-label">Total Stock</span>
                        <div className="stat-value">{totalStats.totalStock}</div>
                    </div>
                </div>
                <div className="stat-card accent">
                    <DollarSign className="stat-icon" />
                    <div>
                        <span className="stat-label">Inventory Value</span>
                        <div className="stat-value">₱{totalStats.totalValue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} className="text-muted" />
                    <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="filters-group">
                    <div className="filter-select">
                        <Filter size={18} />
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div className="filter-select">
                        <ListFilter size={18} />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="stock-asc">Stock: Low to High</option>
                            <option value="stock-desc">Stock: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : (
                <div className="card fade-in" key={activeTab}>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <button className="btn-icon-tiny" onClick={() => ((selectedIds?.length || 0) === (products?.length || 0) ? setSelectedIds([]) : setSelectedIds(products?.map(p => p.id) || []))}>
                                            {(selectedIds?.length || 0) === (products?.length || 0) && (products?.length || 0) > 0 ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th>Barcode</th>
                                    <th>Product Name</th>
                                    <th>Serial Number</th>
                                    <th>Stocks</th>
                                    <th>Discounted</th>
                                    <th>Price</th>
                                    <th>Date Added</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(products || []).map((product) => (
                                    <tr key={product.id} className={(selectedIds || []).includes(product.id) ? 'row-selected' : ''}>
                                        <td>
                                            <button className="btn-icon-tiny" onClick={() => (selectedIds.includes(product.id) ? setSelectedIds(selectedIds.filter(idx => idx !== product.id)) : setSelectedIds([...selectedIds, product.id]))}>
                                                {selectedIds.includes(product.id) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{product.barcode}</td>
                                        <td>
                                            <div className="product-cell">
                                                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="product-thumb" /> : <div className="product-thumb-placeholder"><Package size={16} /></div>}
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div className="font-semibold" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }} title={product.name}>{product.name}</div>
                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                                        {!!product.isBundle && <span className="chart-badge inventory" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>BUNDLE</span>}
                                                        {!!product.discountPrice && <span className="chart-badge sales" style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>PROMO</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{product.serialNumber || '-'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className={product.stockQty <= 10 ? 'text-danger font-bold' : ''}>{product.stockQty}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{product.discountPrice ? <span className="text-green font-bold">₱{product.discountPrice.toLocaleString()}</span> : <span className="text-muted">-</span>}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>₱{product.price.toLocaleString()}</td>
                                        <td style={{ fontSize: '0.8rem', opacity: 0.7, whiteSpace: 'nowrap' }}>{new Date(product.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '-')}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="table-actions">
                                                <button className="btn-icon-sm" onClick={() => handleViewProduct(product)} title="Quick View"><Eye size={14} /></button>
                                                <button className="btn-icon-sm" onClick={() => handlePrintBarcode(product)} title="Print Barcode"><Barcode size={14} /></button>
                                                {activeTab === 'active' ? (
                                                    <>
                                                        <button className="btn-icon-sm" onClick={() => handleEditProductModally(product)} title="Edit"><Edit2 size={14} /></button>
                                                        <button className="btn-icon-sm" style={{ color: 'var(--accent-light)' }} onClick={() => handleArchive(product)} title="Archive"><Archive size={14} /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn-icon-sm" style={{ color: 'var(--green)' }} onClick={() => handleArchive(product)} title="Restore"><RotateCcw size={14} /></button>
                                                        <button className="btn-icon-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeletePermanent(product)} title="Delete Permanent"><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '20px', borderTop: '1px solid var(--border)' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Previous
                            </button>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Page <strong style={{ color: 'var(--accent-light)' }}>{page}</strong> of <strong>{totalPages}</strong>
                                <span style={{ margin: '0 5px', opacity: 0.3 }}>|</span>
                                Go to:
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    defaultValue={page}
                                    onBlur={(e) => {
                                        const p = parseInt(e.target.value);
                                        if (p >= 1 && p <= totalPages && p !== page) {
                                            handlePageChange(p);
                                        } else {
                                            e.target.value = page.toString();
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const p = parseInt((e.target as HTMLInputElement).value);
                                            if (p >= 1 && p <= totalPages && p !== page) {
                                                handlePageChange(p);
                                            } else {
                                                (e.target as HTMLInputElement).value = page.toString();
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '50px',
                                        height: '28px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        color: 'white',
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        outline: 'none'
                                    }}
                                />
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(selectedIds?.length || 0) > 0 && (
                <div className="bulk-selection-bar">
                    <span>{selectedIds?.length || 0} items selected</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>Deselect</button>
                        <button className="btn btn-primary btn-sm" onClick={handleBulkArchive}>
                            {activeTab === 'active' ? 'Archive Selected' : 'Restore Selected'}
                        </button>
                        {activeTab === 'archived' && (
                            <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white' }} onClick={handleBulkDeletePermanent}>
                                Delete Selected Forever
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
orphanage: false
