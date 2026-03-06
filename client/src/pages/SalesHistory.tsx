import { useEffect, useState } from 'react';
import { Clock, Eye, Search, ShoppingCart, Receipt } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface TransactionItem {
    id: number;
    quantity: number;
    price: number;
    subtotal: number;
    product: { name: string };
}

interface Transaction {
    id: number;
    totalAmount: number;
    discount: number;
    createdAt: string;
    cashier: { name: string; email: string };
    items: TransactionItem[];
}

export default function SalesHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await axios.get('/api/transactions');
            setTransactions(res.data);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = transactions.filter(
        (txn) =>
            txn.cashier.name.toLowerCase().includes(search.toLowerCase()) ||
            txn.id.toString().includes(search)
    );

    const viewReceipt = (txn: Transaction) => {
        const itemsHtml = txn.items
            .map(
                (item) =>
                    `<tr><td style="text-align:left;padding:4px 8px">${item.product.name}</td><td style="padding:4px 8px">${item.quantity}</td><td style="padding:4px 8px">₱${item.price.toLocaleString()}</td><td style="text-align:right;padding:4px 8px">₱${item.subtotal.toLocaleString()}</td></tr>`
            )
            .join('');

        Swal.fire({
            title: `Receipt #${txn.id}`,
            html: `
                <div style="text-align:left;font-size:0.9rem">
                    <p style="margin-bottom:4px"><strong>Cashier:</strong> ${txn.cashier.name}</p>
                    <p style="margin-bottom:12px"><strong>Date:</strong> ${new Date(txn.createdAt).toLocaleString()}</p>
                    <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
                        <thead><tr style="border-bottom:1px solid #1e3a5f">
                            <th style="text-align:left;padding:4px 8px">Item</th>
                            <th style="padding:4px 8px">Qty</th>
                            <th style="padding:4px 8px">Price</th>
                            <th style="text-align:right;padding:4px 8px">Subtotal</th>
                        </tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    <hr style="border-color:#1e3a5f;margin:12px 0" />
                    ${txn.discount > 0 ? `<p>Discount: <span style="color:#ef4444">-₱${txn.discount.toLocaleString()}</span></p>` : ''}
                    <p style="font-size:1.1rem;font-weight:700"><strong>Total: ₱${txn.totalAmount.toLocaleString()}</strong></p>
                </div>
            `,
            width: 500,
            background: '#132743',
            color: '#e8ecf4',
            confirmButtonColor: '#2563eb',
        });
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Sales History</h1>
                    <p>{transactions.length} transactions</p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by cashier or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <Receipt size={56} />
                    <h3>No transactions found</h3>
                    <p>Sales will appear here after checkout</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cashier</th>
                                    <th>Items</th>
                                    <th>Discount</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((txn) => (
                                    <tr key={txn.id}>
                                        <td>#{txn.id}</td>
                                        <td>{txn.cashier.name}</td>
                                        <td>{txn.items.length} items</td>
                                        <td>{txn.discount > 0 ? <span className="text-red">-₱{txn.discount.toLocaleString()}</span> : '—'}</td>
                                        <td className="text-green">₱{txn.totalAmount.toLocaleString()}</td>
                                        <td>
                                            <span className="date-cell">
                                                <Clock size={14} />
                                                {new Date(txn.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-icon btn-view" title="View Receipt" onClick={() => viewReceipt(txn)}>
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
