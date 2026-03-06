import { useEffect, useState, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, Package, Camera, X, CreditCard, TrendingUp, ListFilter } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    discountPrice: number | null;
    barcode: string;
    imageUrl: string | null;
    stockQty: number;
    isBundle: boolean;
    category: { name: string };
    bundleItems?: { id: number; quantity: number; product: Product }[];
}

interface CartItem {
    product: Product;
    quantity: number;
}

export default function POS() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [discount, setDiscount] = useState(0);
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showPriceList, setShowPriceList] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isPosOpen, setIsPosOpen] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<{ barcode: string, time: number }>({ barcode: '', time: 0 });

    useEffect(() => {
        if (showAnalytics) {
            fetchChartData();
        }
    }, [showAnalytics]);

    useEffect(() => {
        fetchSettings();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || '');
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setIsPosOpen(res.data.isPosOpen);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const fetchChartData = async () => {
        try {
            const res = await axios.get('/api/transactions/stats/charts', { params: { interval: 'day' } });
            setChartData(res.data);
        } catch (err) {
            console.error('Failed to fetch chart data', err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [search, sortBy]);

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const fetchProducts = async () => {
        try {
            const params: any = { sortBy, limit: 200 };
            if (search) params.q = search;
            const res = await axios.get('/api/products/search', { params });
            // Handle paginated response structure
            const fetchedProducts = res.data.products || res.data;
            setProducts(fetchedProducts);
        } catch (err) {
            console.error('Failed to fetch products', err);
        }
    };

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stockQty) {
                    Swal.fire({ icon: 'warning', title: 'Out of Stock', text: 'Cannot add more items than available in stock.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                    return prev;
                }
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            setSearch(''); // Auto-clear search after adding
            return [...prev, { product, quantity: 1 }];
        });
    };

    const showProductDetails = (product: Product) => {
        const price = product.discountPrice !== null ? product.discountPrice : product.price;
        const savings = product.discountPrice !== null ? product.price - product.discountPrice : 0;

        Swal.fire({
            title: product.name,
            width: '600px',
            html: `
                <div class="product-details-modal" style="text-align: left; color: var(--text-primary); display: flex; gap: 16px;">
                    <!-- Sidebar: Image & Metadata -->
                    <div style="width: 160px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
                        <div style="width: 100%; aspect-ratio: 1; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            ${product.imageUrl ?
                    `<img src="${product.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.2" style="opacity: 0.2;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`
                }
                        </div>
                        
                        <div style="padding: 8px; background: rgba(0,0,0,0.15); border-radius: 6px; border: 1px solid var(--border);">
                            <span style="display: block; font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px; font-weight: 700;">Barcode</span>
                            <span style="font-family: monospace; font-weight: 800; font-size: 0.75rem; color: #fff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.barcode}</span>
                        </div>
                        
                        <div style="padding: 8px; background: rgba(0,0,0,0.15); border-radius: 6px; border: 1px solid var(--border);">
                            <span style="display: block; font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px; font-weight: 700;">Category</span>
                            <span style="font-weight: 800; font-size: 0.75rem; color: #fff; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.category.name}</span>
                        </div>
                    </div>

                    <!-- Main Info Column -->
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="padding: 10px; background: rgba(34, 197, 94, 0.04); border: 1px solid rgba(34, 197, 94, 0.1); border-radius: 8px;">
                                <span style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px; font-weight: 700;">POS Price</span>
                                <div style="font-size: 1.5rem; font-weight: 900; color: var(--green); line-height: 1;">₱${price.toLocaleString()}</div>
                                ${savings > 0 ? `<div style="font-size: 0.7rem; color: #ef4444; margin-top: 4px; font-weight: 800;">Save ₱${savings.toLocaleString()}</div>` : ''}
                            </div>
                            
                            <div style="padding: 10px; background: rgba(6, 182, 212, 0.04); border: 1px solid rgba(6, 182, 212, 0.1); border-radius: 8px;">
                                <span style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px; font-weight: 700;">Availability</span>
                                <div style="font-size: 1.25rem; font-weight: 900; color: ${product.stockQty <= 5 ? '#ef4444' : 'var(--cyan)'}; line-height: 1.1;">
                                    ${product.stockQty} <span style="font-size: 0.8rem; font-weight: 600;">Units</span>
                                </div>
                                <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; font-weight: 700;">In Stock</div>
                            </div>
                        </div>

                        <div style="padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border); min-height: 50px;">
                            <span style="display: block; font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; font-weight: 700;">Product Description</span>
                            <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.6); line-height: 1.4; max-height: 70px; overflow-y: auto; padding-right: 5px;">${product.description || 'No description provided.'}</p>
                        </div>

                        ${product.isBundle && product.bundleItems && product.bundleItems.length > 0 ? `
                            <div style="padding-top: 5px;">
                                <span style="display: block; font-size: 0.6rem; color: #a855f7; text-transform: uppercase; margin-bottom: 8px; font-weight: 800; letter-spacing: 0.5px;">Bundle Contents</span>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                    ${product.bundleItems.map(item => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(147, 51, 234, 0.05); border-radius: 6px; border: 1px solid rgba(147, 51, 234, 0.1);">
                                            <span style="font-size: 0.7rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px; color: #fff;">${item.product.name}</span>
                                            <span style="color: #a855f7; font-weight: 900; font-size: 0.7rem;">x${item.quantity}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add to Cart',
            cancelButtonText: 'Close',
            confirmButtonColor: 'var(--accent)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            customClass: {
                popup: 'premium-swal-popup',
                confirmButton: 'premium-confirm-btn',
                cancelButton: 'premium-cancel-btn'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                addToCart(product);
            }
        });
    };

    const getItemPrice = (product: Product) => {
        return product.discountPrice !== null ? product.discountPrice : product.price;
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id !== productId) return item;
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null;
                    if (newQty > item.product.stockQty) return item;
                    return { ...item, quantity: newQty };
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const addCustomItem = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add Custom Service / Item',
            html: `
                <div style="text-align: left;">
                    <label style="display: block; font-size: 0.8rem; margin-bottom: 4px;">Description</label>
                    <input id="custom-desc" class="swal2-input" placeholder="e.g. Custom PC Build Labor" style="margin-top: 0; width: 100%;">
                    <label style="display: block; font-size: 0.8rem; margin-top: 12px; margin-bottom: 4px;">Price (₱)</label>
                    <input id="custom-price" type="number" class="swal2-input" placeholder="0.00" style="margin-top: 0; width: 100%;">
                </div>
            `,
            focusConfirm: false,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            showCancelButton: true,
            confirmButtonText: 'Add to Cart',
            preConfirm: () => {
                const description = (document.getElementById('custom-desc') as HTMLInputElement).value;
                const price = parseFloat((document.getElementById('custom-price') as HTMLInputElement).value);
                if (!description || isNaN(price)) {
                    Swal.showValidationMessage('Please enter both description and price');
                    return false;
                }
                return { description, price };
            }
        });

        if (formValues) {
            const customProduct: Product = {
                id: Date.now(), // Temporary ID for custom items
                name: formValues.description,
                description: 'Custom Service/Item',
                price: formValues.price,
                discountPrice: null,
                barcode: 'CUSTOM',
                imageUrl: null,
                stockQty: 99999, // Allow any quantity
                isBundle: false,
                category: { name: 'Custom' }
            };
            setCart([...cart, { product: customProduct, quantity: 1 }]);
        }
    };

    const showQuotationBuilder = async () => {
        let builderItems: any[] = [...cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: getItemPrice(item.product),
            quantity: item.quantity,
            barcode: item.product.barcode,
            isCustom: item.product.barcode === 'CUSTOM'
        }))];
        let clientName = "";
        let notes = "";

        const updateBuilderUI = () => {
            const listEl = document.getElementById('builder-items-list');
            const totalEl = document.getElementById('builder-total');
            if (!listEl || !totalEl) return;

            const total = builderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalEl.innerText = `₱${total.toLocaleString()}`;

            listEl.innerHTML = builderItems.length === 0
                ? '<div style="padding: 20px; text-align: center; opacity: 0.5;">No items added yet.</div>'
                : builderItems.map((item, idx) => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02);">
                        <div style="flex: 1; min-width: 0; margin-right: 12px;">
                            <div style="font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                            <div style="font-size: 0.8rem; opacity: 0.6;">₱${item.price.toLocaleString()} x ${item.quantity}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="font-weight: 800; color: var(--green); font-size: 1rem;">₱${(item.price * item.quantity).toLocaleString()}</div>
                            <button class="remove-item-btn" data-idx="${idx}" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;">×</button>
                        </div>
                    </div>
                `).join('');

            // Re-attach remove listeners
            document.querySelectorAll('.remove-item-btn').forEach(btn => {
                (btn as HTMLElement).onclick = (e: MouseEvent) => {
                    const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || "0");
                    builderItems.splice(idx, 1);
                    updateBuilderUI();
                };
            });
        };

        const { value: result } = await Swal.fire({
            title: 'QUOTATION BUILDER',
            width: '850px',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            showCancelButton: true,
            confirmButtonText: 'Save & Print',
            cancelButtonText: 'Close',
            confirmButtonColor: 'var(--accent)',
            html: `
                <div style="width: 100%; display: flex; flex-direction: column; gap: 20px; text-align: left; font-family: inherit; box-sizing: border-box; overflow: hidden;">
                    <!-- Top Section: Adding Items -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">1. Add Items to Quote</label>
                        
                        <!-- Product Selection -->
                        <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                            <div style="flex: 1;">
                                <select id="builder-product-pick" style="width: 100%; height: 42px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 0 10px; font-size: 0.85rem;">
                                    <option value="">-- Choose Product --</option>
                                    ${products.map(p => `<option value="${p.id}">${p.name} (${p.barcode}) - ₱${(p.discountPrice || p.price).toLocaleString()}</option>`).join('')}
                                </select>
                            </div>
                            <button id="builder-add-prod" style="height: 42px; padding: 0 20px; background: var(--accent); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; white-space: nowrap;">Add Product</button>
                        </div>

                        <!-- Custom Service -->
                        <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                            <input id="builder-custom-name" placeholder="Service / Labor Name" style="flex: 1; height: 42px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 0 12px; font-size: 0.85rem;">
                            <input id="builder-custom-price" type="number" placeholder="Price" style="width: 120px; height: 42px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 0 12px; font-size: 0.85rem;">
                            <button id="builder-add-custom" style="width: 42px; height: 42px; background: #a855f7; color: white; border: none; border-radius: 6px; font-size: 20px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                        </div>
                    </div>

                    <!-- Main Grid Section -->
                    <div style="display: flex; gap: 24px; width: 100%; min-height: 350px;">
                        <!-- Left Pillar: Details -->
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: var(--text-muted); letter-spacing: 0.05em;">2. Quotation Details</label>
                                <input id="builder-client" placeholder="Client Name (Optional)" style="width: 100%; height: 42px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 0 12px; font-size: 0.85rem; margin-bottom: 12px;">
                                <textarea id="builder-notes" placeholder="Project Notes (Specs, Timeline, etc.)" style="width: 100%; height: 180px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-size: 0.85rem; resize: none;"></textarea>
                            </div>
                        </div>

                        <!-- Right Pillar: Summary -->
                        <div style="flex: 1.2; display: flex; flex-direction: column; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; color: var(--text-muted); letter-spacing: 0.05em;">Current Items Preview</label>
                            
                            <div id="builder-items-list" style="flex: 1; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px; max-height: 250px;">
                                <!-- Dynamic List -->
                            </div>

                            <div style="padding-top: 15px; border-top: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 700; color: var(--text-muted); font-size: 0.9rem;">GRAND TOTAL</span>
                                <span id="builder-total" style="font-size: 2rem; font-weight: 900; color: var(--accent);">₱0</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                updateBuilderUI();

                // Add product button
                (document.getElementById('builder-add-prod') as HTMLElement).onclick = () => {
                    const select = document.getElementById('builder-product-pick') as HTMLSelectElement;
                    const prodId = parseInt(select.value);
                    if (!prodId) return;
                    const p = products.find(prod => prod.id === prodId);
                    if (p) {
                        const existing = builderItems.find(item => item.id === p.id && !item.isCustom);
                        if (existing) {
                            existing.quantity += 1;
                        } else {
                            builderItems.push({
                                id: p.id,
                                name: p.name,
                                price: p.discountPrice || p.price,
                                quantity: 1,
                                barcode: p.barcode,
                                isCustom: false
                            });
                        }
                        updateBuilderUI();
                        select.value = "";
                    }
                };

                // Add custom button
                (document.getElementById('builder-add-custom') as HTMLElement).onclick = () => {
                    const nameInput = document.getElementById('builder-custom-name') as HTMLInputElement;
                    const priceInput = document.getElementById('builder-custom-price') as HTMLInputElement;
                    const name = nameInput.value;
                    const price = parseFloat(priceInput.value);
                    if (!name || isNaN(price)) return;

                    builderItems.push({
                        id: Date.now(),
                        name: name,
                        price: price,
                        quantity: 1,
                        barcode: 'CUSTOM',
                        isCustom: true
                    });
                    updateBuilderUI();
                    nameInput.value = "";
                    priceInput.value = "";
                };
            },
            preConfirm: () => {
                if (builderItems.length === 0) {
                    Swal.showValidationMessage('Please add at least one item');
                    return false;
                }
                return {
                    clientName: (document.getElementById('builder-client') as HTMLInputElement).value || "Walk-in Customer",
                    notes: (document.getElementById('builder-notes') as HTMLTextAreaElement).value,
                    items: builderItems
                };
            }
        });

        if (result) {
            setLoading(true);
            try {
                const res = await axios.post('/api/quotations', {
                    clientName: result.clientName,
                    notes: result.notes,
                    items: result.items.map((item: any) => ({
                        productId: item.isCustom ? null : item.id,
                        description: item.name,
                        quantity: item.quantity,
                        price: item.price
                    }))
                });
                handlePrintQuotation(res.data);
                Swal.fire({ icon: 'success', title: 'Quotation Saved & Printed', background: 'var(--bg-card)', color: 'var(--text-primary)', timer: 2000, showConfirmButton: false });
            } catch (err: any) {
                console.error(err);
                Swal.fire({ icon: 'error', title: 'Failed to Save', text: err.response?.data?.error || 'Server error', background: 'var(--bg-card)', color: 'var(--text-primary)' });
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePrintQuotation = (q: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsHtml = q.items.map((item: any) => `
            <tr>
                <td style="padding: 5px 0;">${item.description}</td>
                <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 5px 0; text-align: right;">₱${item.price.toLocaleString()}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Quotation #${q.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #000; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .header h1 { margin: 0; font-size: 1.2rem; }
                        .details { font-size: 0.8rem; margin-bottom: 15px; }
                        .items { width: 100%; font-size: 0.8rem; border-collapse: collapse; margin-bottom: 15px; }
                        .totals { border-top: 1px dashed #000; padding-top: 10px; font-size: 0.9rem; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .total-main { font-weight: bold; font-size: 1.1rem; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 0.7rem; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>AZTECH</h1>
                        <p>QUOTATION</p>
                        <p>Tel: (02) 123-4567</p>
                    </div>
                    <div class="details">
                        <p>Quotation #: ${q.id}</p>
                        <p>Client: ${q.clientName || 'Walk-in Customer'}</p>
                        <p>Date: ${new Date(q.createdAt).toLocaleString()}</p>
                        <p>Staff: ${q.cashier?.name || 'Staff'}</p>
                        ${q.notes ? `<p style="margin-top: 10px; border-top: 1px dotted #ccc; padding-top: 5px;"><strong>Notes:</strong> ${q.notes}</p>` : ''}
                    </div>
                    <table class="items">
                        <thead>
                            <tr style="border-bottom: 1px solid #000;">
                                <th style="text-align: left;">Description</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="total-row"><span>Subtotal</span><span>₱${q.totalAmount + q.discount}</span></div>
                        ${q.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-₱${q.discount}</span></div>` : ''}
                        <div class="total-row total-main"><span>TOTAL</span><span>₱${q.totalAmount.toLocaleString()}</span></div>
                    </div>
                    <div class="footer">
                        <p>This is a quotation only, not a receipt.</p>
                        <p>Prices are valid for 7 days.</p>
                        <p>Thank you for choosing AZTECH!</p>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const showQuotationHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/quotations');
            const quotations = res.data;

            if (quotations.length === 0) {
                Swal.fire({ title: 'No Quotations', text: 'You haven\'t saved any quotations yet.', icon: 'info', background: '#132743', color: '#e8ecf4' });
                return;
            }

            const { value: selectedId } = await Swal.fire({
                title: 'Quotation History',
                width: '700px',
                html: `
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                                    <th style="padding: 10px;">ID</th>
                                    <th style="padding: 10px;">Client</th>
                                    <th style="padding: 10px;">Total</th>
                                    <th style="padding: 10px;">Date</th>
                                    <th style="padding: 10px; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${quotations.map((q: any) => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 10px;">#${q.id}</td>
                                        <td style="padding: 10px; font-weight: 700;">${q.clientName}</td>
                                        <td style="padding: 10px; color: var(--green);">₱${q.totalAmount.toLocaleString()}</td>
                                        <td style="padding: 10px; opacity: 0.7;">${new Date(q.createdAt).toLocaleDateString()}</td>
                                        <td style="padding: 10px; text-align: right;">
                                            <button class="print-q-btn" data-id="${q.id}" style="background: var(--accent); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Print</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                didOpen: () => {
                    document.querySelectorAll('.print-q-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = (e.target as HTMLElement).getAttribute('data-id');
                            const q = quotations.find((quote: any) => quote.id == id);
                            if (q) handlePrintQuotation(q);
                        });
                    });
                }
            });
        } catch (err) {
            console.error('Failed to fetch quotations', err);
        } finally {
            setLoading(false);
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item.product) * item.quantity, 0);
    const total = Math.max(0, subtotal - discount);

    const startScanner = async () => {
        setScanning(true);
        try {
            const html5Qr = new Html5Qrcode('barcode-scanner');
            scannerRef.current = html5Qr;
            await html5Qr.start(
                { facingMode: 'environment' },
                { fps: 15, qrbox: { width: 250, height: 150 } },
                async (decoded) => {
                    const now = Date.now();
                    // 2 second cooldown for same barcode
                    if (lastScanRef.current.barcode === decoded && (now - lastScanRef.current.time) < 2000) {
                        return;
                    }

                    lastScanRef.current = { barcode: decoded, time: now };

                    try {
                        const res = await axios.get('/api/products/search', { params: { barcode: decoded } });
                        const foundProducts = res.data.products || res.data;
                        if (foundProducts.length > 0) {
                            const product = foundProducts[0];
                            setSearch(''); // Clear filter for next action
                            addToCart(product);

                            // Visual/Audio feedback could go here
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 1500,
                                timerProgressBar: true,
                                background: '#132743',
                                color: '#e8ecf4',
                            });
                            Toast.fire({
                                icon: 'success',
                                title: `Added: ${product.name}`
                            });
                        } else {
                            // Non-blocking error toast
                            const Toast = Swal.mixin({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000,
                                background: '#fef2f2',
                                color: '#991b1b',
                            });
                            Toast.fire({
                                icon: 'error',
                                title: `Not found: ${decoded}`
                            });
                        }
                    } catch (err) {
                        console.error('Barcode lookup error:', err);
                    }
                },
                () => { }
            );
        } catch (err) {
            console.error('Scanner start error:', err);
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            setScanning(false);
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const items = cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
            }));

            const res = await axios.post('/api/transactions', { items, discount });
            const completedTxn = res.data;

            Swal.fire({
                icon: 'success',
                title: 'Sale Complete!',
                text: `Total: ₱${total.toLocaleString()}`,
                showCancelButton: true,
                confirmButtonText: 'Print Receipt',
                cancelButtonText: 'No Thanks',
                background: '#132743',
                color: '#e8ecf4',
                confirmButtonColor: '#2563eb',
            }).then((result) => {
                if (result.isConfirmed) {
                    handlePrintReceipt(completedTxn);
                }
            });

            setCart([]);
            setDiscount(0);
            fetchProducts();
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Checkout Failed',
                text: err.response?.data?.error || 'Failed to process sale',
                background: '#132743',
                color: '#e8ecf4',
                confirmButtonColor: '#2563eb',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrintReceipt = (txn: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsHtml = txn.items.map((item: any) => `
            <tr>
                <td style="padding: 5px 0;">${item.product.name}</td>
                <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
                <td style="padding: 5px 0; text-align: right;">₱${item.price.toLocaleString()}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt #${txn.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #000; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .header h1 { margin: 0; font-size: 1.2rem; }
                        .details { font-size: 0.8rem; margin-bottom: 15px; }
                        .items { width: 100%; font-size: 0.8rem; border-collapse: collapse; margin-bottom: 15px; }
                        .totals { border-top: 1px dashed #000; padding-top: 10px; font-size: 0.9rem; }
                        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .total-main { font-weight: bold; font-size: 1.1rem; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 0.7rem; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>AZTECH</h1>
                        <p>Computer Enterprises Inc.</p>
                        <p>Tel: (02) 123-4567</p>
                    </div>
                    <div class="details">
                        <p>Receipt #: ${txn.id}</p>
                        <p>Date: ${new Date(txn.createdAt).toLocaleString()}</p>
                        <p>Cashier: ${txn.cashier?.name || 'Staff'}</p>
                    </div>
                    <table class="items">
                        <thead>
                            <tr style="border-bottom: 1px solid #000;">
                                <th style="text-align: left;">Item</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="total-row"><span>Subtotal</span><span>₱${txn.totalAmount + txn.discount}</span></div>
                        ${txn.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-₱${txn.discount}</span></div>` : ''}
                        <div class="total-row total-main"><span>TOTAL</span><span>₱${txn.totalAmount.toLocaleString()}</span></div>
                    </div>
                    <div class="footer">
                        <p>Thank you for shopping at AZTECH!</p>
                        <p>Please keep this receipt for warranty.</p>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="pos-page">
            <div className="pos-products">
                {showAnalytics && (
                    <div className="card analytics-card" style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={18} className="text-green" />
                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Today's Sales Trend</h3>
                            </div>
                            <span className="chart-badge sales" style={{ fontSize: '0.6rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>POS ACTIVITY</span>
                        </div>
                        <div style={{ height: '120px', marginTop: '12px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSalesPOS" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#132743', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }}
                                        itemStyle={{ color: 'var(--green)' }}
                                        labelStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="var(--green)" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesPOS)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                <div className="pos-search-bar">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-select" style={{ minWidth: "160px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <ListFilter size={18} className="text-muted" />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "0 35px 0 0", fontSize: "0.85rem", flex: 1 }}>
                            <option value="name-asc">A to Z</option>
                            <option value="name-desc">Z to A</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                    </div>
                    <button
                        className={`btn ${showAnalytics ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        title="Sales Analytics"
                    >
                        <TrendingUp size={18} />
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={showQuotationHistory}
                        title="Quotation History"
                    >
                        <ShoppingCart size={18} /> History
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowPriceList(true)}
                        title="View Pricelist"
                    >
                        <ListFilter size={18} /> Prices
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={showQuotationBuilder}
                        title="Quotation Builder"
                        style={{ color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                    >
                        <Plus size={18} /> Quote
                    </button>
                    <button
                        className={`btn ${scanning ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={scanning ? stopScanner : startScanner}
                    >
                        {scanning ? <X size={18} /> : <Camera size={18} />}
                        {scanning ? 'Stop' : 'Scan'}
                    </button>
                </div>

                {scanning && (
                    <div className="scanner-container">
                        <div id="barcode-scanner" />
                    </div>
                )}

                {(() => {
                    const availableProducts = products.filter(p => p.stockQty > 0);
                    const outOfStockProducts = products.filter(p => p.stockQty <= 0);

                    return (
                        <>
                            {availableProducts.length > 0 && (
                                <div className="pos-product-section">
                                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px', paddingLeft: '4px' }}>Available Items</h3>
                                    <div className="pos-product-grid">
                                        {availableProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                className="pos-product-btn"
                                                onClick={() => showProductDetails(product)}
                                            >
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} />
                                                ) : (
                                                    <div className="pos-product-icon">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                                <span className="pos-product-name">{product.name}</span>
                                                <div className="pos-product-pricing">
                                                    {product.discountPrice ? (
                                                        <>
                                                            <span className="pos-product-price-old">₱{product.price.toLocaleString()}</span>
                                                            <span className="pos-product-price-new">₱{product.discountPrice.toLocaleString()}</span>
                                                        </>
                                                    ) : (
                                                        <span className="pos-product-price">₱{product.price.toLocaleString()}</span>
                                                    )}
                                                </div>
                                                <span className="pos-product-stock">{product.stockQty} in stock</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {outOfStockProducts.length > 0 && (
                                <div className="pos-product-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--border)' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'var(--red)', marginBottom: '12px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                        Out of Stock Items
                                    </h3>
                                    <div className="pos-product-grid">
                                        {outOfStockProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                className="pos-product-btn"
                                                disabled
                                                style={{ opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(1)' }}
                                            >
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} />
                                                ) : (
                                                    <div className="pos-product-icon">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                                <span className="pos-product-name">{product.name}</span>
                                                <div className="pos-product-pricing">
                                                    {product.discountPrice ? (
                                                        <>
                                                            <span className="pos-product-price-old">₱{product.price.toLocaleString()}</span>
                                                            <span className="pos-product-price-new">₱{product.discountPrice.toLocaleString()}</span>
                                                        </>
                                                    ) : (
                                                        <span className="pos-product-price">₱{product.price.toLocaleString()}</span>
                                                    )}
                                                </div>
                                                <span className="pos-product-stock" style={{ color: 'var(--red)' }}>0 in stock</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {products.length === 0 && !loading && (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No products found matching your search.
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            <div className="pos-cart">
                <div className="pos-cart-header">
                    <ShoppingCart size={20} />
                    <h2>Cart</h2>
                    <span className="cart-count">{cart.length}</span>
                </div>

                <div className="pos-cart-items">
                    {cart.length === 0 ? (
                        <div className="empty-cart">
                            <ShoppingCart size={40} />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.product.id} className="cart-item">
                                <div className="cart-item-info">
                                    <span className="cart-item-name">{item.product.name}</span>
                                    <span className="cart-item-price">₱{getItemPrice(item.product).toLocaleString()}</span>
                                </div>
                                <div className="cart-item-controls">
                                    <button onClick={() => updateQuantity(item.product.id, -1)}>
                                        <Minus size={14} />
                                    </button>
                                    <span className="cart-item-qty">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product.id, 1)}>
                                        <Plus size={14} />
                                    </button>
                                    <button className="cart-item-remove" onClick={() => removeFromCart(item.product.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="cart-item-subtotal">
                                    ₱{(getItemPrice(item.product) * item.quantity).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="pos-cart-footer">
                    <div className="cart-discount">
                        <label>Discount (₱)</label>
                        <input
                            type="number"
                            min="0"
                            value={discount || ''}
                            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </div>

                    <div className="cart-totals">
                        <div className="cart-total-row">
                            <span>Subtotal</span>
                            <span>₱{subtotal.toLocaleString()}</span>
                        </div>
                        {discount > 0 && (
                            <div className="cart-total-row discount-row">
                                <span>Discount</span>
                                <span>-₱{discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="cart-total-row total-row">
                            <span>Total</span>
                            <span>₱{total.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        className="btn-checkout"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || loading}
                    >
                        {loading ? (
                            <span className="spinner-small" />
                        ) : (
                            <>
                                <CreditCard size={20} /> Checkout
                            </>
                        )}
                    </button>
                </div>

                {!isPosOpen && userRole !== 'ADMIN' && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(8px)',
                        zIndex: 2000, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center'
                    }}>
                        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '400px' }}>
                            <X size={64} style={{ color: 'var(--red)', marginBottom: '20px' }} />
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>POS is Closed</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>The Point of Sale system is currently offline. Please contact an administrator to open it.</p>
                            <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard'}>Return to Dashboard</button>
                        </div>
                    </div>
                )}

                {showPriceList && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(10, 22, 40, 0.95)', backdropFilter: 'blur(10px)',
                        zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                    }}>
                        <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <ListFilter size={24} className="text-accent" /> Product Pricelist
                                </h2>
                                <button className="btn btn-secondary" onClick={() => setShowPriceList(false)}><X size={20} /> Close</button>
                            </div>

                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                                        <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '12px' }}>Code</th>
                                            <th style={{ padding: '12px' }}>Product Name</th>
                                            <th style={{ padding: '12px' }}>Category</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Standard</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Promo/Bundle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                                <td style={{ padding: '12px', fontFamily: 'monospace', opacity: 0.6 }}>{p.barcode}</td>
                                                <td style={{ padding: '12px', fontWeight: 600 }}>{p.name}</td>
                                                <td style={{ padding: '12px', opacity: 0.8 }}>{p.category.name}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', textDecoration: p.discountPrice ? 'line-through' : 'none', opacity: p.discountPrice ? 0.4 : 1 }}>₱{p.price.toLocaleString()}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>
                                                    {p.discountPrice ? `₱${p.discountPrice.toLocaleString()}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
