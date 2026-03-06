import { useState, useRef, useEffect } from 'react';
import { Camera, X, Search, Package, Zap, Clock } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Product {
    id: number;
    name: string;
    price: number;
    discountPrice: number | null;
    barcode: string;
    imageUrl: string | null;
    stockQty: number;
    category: { name: string };
}

export default function PriceScanner() {
    const [scanning, setScanning] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showCarousel, setShowCarousel] = useState(false);
    const [kioskMode, setKioskMode] = useState(false);
    const [carouselSettings, setCarouselSettings] = useState<{
        carouselSpeed: number;
        carouselTimeout: number;
        carouselEnabled: boolean;
        carouselImages: string[];
        carouselImageFit: 'contain' | 'cover';
        carouselImageSize: number;
    }>({
        carouselImages: [],
        carouselSpeed: 5000,
        carouselTimeout: 30000,
        carouselEnabled: false,
        carouselImageFit: 'contain',
        carouselImageSize: 50
    });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const inactivityTimer = useRef<any>(null);

    useEffect(() => {
        fetchSettings();
        resetInactivityTimer();

        const clockInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        const handleActivity = () => {
            if (showCarousel) setShowCarousel(false);
            resetInactivityTimer();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
                setKioskMode(prev => !prev);
                e.preventDefault();
            }
        };

        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
            clearTimeout(inactivityTimer.current);
            clearInterval(clockInterval);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [carouselSettings.carouselEnabled, carouselSettings.carouselImages.length, carouselSettings.carouselTimeout]);

    useEffect(() => {
        let interval: any;
        if (carouselSettings.carouselImages.length > 1 && (showCarousel || kioskMode)) {
            interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % carouselSettings.carouselImages.length);
            }, carouselSettings.carouselSpeed);
        }
        return () => clearInterval(interval);
    }, [showCarousel, kioskMode, carouselSettings]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data) {
                const data = res.data;
                setCarouselSettings({
                    carouselSpeed: data.carouselSpeed || 5000,
                    carouselTimeout: data.carouselTimeout || 30000,
                    carouselEnabled: data.carouselEnabled === 1,
                    carouselImages: JSON.parse(data.carouselImages || '[]'),
                    carouselImageFit: data.carouselImageFit || 'contain',
                    carouselImageSize: data.carouselImageSize || 50
                });
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer.current);
        if (carouselSettings.carouselEnabled && carouselSettings.carouselImages.length > 0) {
            inactivityTimer.current = setTimeout(() => {
                setShowCarousel(true);
            }, carouselSettings.carouselTimeout);
        }
    };

    const startScanner = async () => {
        setScanning(true);
        setProduct(null);
        try {
            const html5Qr = new Html5Qrcode('price-scanner-view');
            scannerRef.current = html5Qr;
            await html5Qr.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 300, height: 200 } },
                async (decoded) => {
                    await html5Qr.stop();
                    setScanning(false);
                    fetchProduct(decoded);
                },
                () => { }
            );
        } catch {
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            setScanning(false);
        }
    };

    const fetchProduct = async (query: string) => {
        setLoading(true);
        try {
            const res = await axios.get('/api/products/search', { params: { q: query } });
            const products = res.data.products || res.data;
            if (products.length > 0) {
                setProduct(products[0]);
                setSearch('');
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Not Found',
                    text: `No product found for: ${query}`,
                    background: '#132743',
                    color: '#e8ecf4',
                    confirmButtonColor: '#2563eb'
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search) return;
        fetchProduct(search);
    };

    return (
        <div className={`price-scanner-page ${kioskMode ? 'kiosk-active' : ''}`} style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--bg-primary)'
        }}>
            {/* Carousel Fullscreen Overlay (Screen Saver) */}
            {showCarousel && carouselSettings.carouselImages.length > 0 && (
                <div
                    className="scanner-carousel-overlay fade-in"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(13, 25, 41, 0.7)',
                        backdropFilter: 'blur(20px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                    onClick={() => {
                        setShowCarousel(false);
                        resetInactivityTimer();
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            display: 'flex',
                            height: '100%',
                            width: `${carouselSettings.carouselImages.length * 100}%`,
                            transform: `translateX(-${(currentImageIndex * 100) / carouselSettings.carouselImages.length}%)`,
                            transition: 'transform 0.8s ease-in-out'
                        }}>
                            {carouselSettings.carouselImages.map((img, idx) => (
                                <div key={idx} style={{
                                    width: `${100 / carouselSettings.carouselImages.length}%`,
                                    height: '100%',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <img
                                        src={img}
                                        alt={`Slide ${idx}`}
                                        style={{
                                            width: `${carouselSettings.carouselImageSize}%`,
                                            height: `${carouselSettings.carouselImageSize}%`,
                                            objectFit: carouselSettings.carouselImageFit,
                                            transition: 'all 0.4s ease-out'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflowY: 'auto',
                position: 'relative'
            }}>
                {!kioskMode && (
                    <div className="page-header" style={{ width: '100%', maxWidth: '800px', marginBottom: '40px', textAlign: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
                                <h1 style={{ margin: 0 }}>Price Check</h1>
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '6px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-light)', fontWeight: 800, fontSize: '1.1rem' }}>
                                        <Clock size={16} />
                                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Scan barcode or search by name (Ctrl+Shift+H for Kiosk)</p>
                        </div>
                    </div>
                )}

                <div className="scanner-layout" style={{ width: '100%', maxWidth: '600px' }}>
                    {!kioskMode && (
                        <form onSubmit={handleSearch} className="manual-barcode-form" style={{ marginBottom: '30px' }}>
                            <div className="search-box" style={{ background: 'var(--bg-card)', padding: '5px 15px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Search size={20} className="text-muted" />
                                <input
                                    type="text"
                                    placeholder="Enter product name or barcode..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', padding: '12px 0', flex: 1, outline: 'none', fontSize: '1rem' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>Check</button>
                            </div>
                        </form>
                    )}

                    <div className="scanner-display-area" style={{ textAlign: 'center' }}>
                        {scanning && (
                            <div className="scanner-viewport-container" style={{ borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--accent)', boxShadow: '0 0 30px rgba(37, 99, 235, 0.3)', marginBottom: '20px' }}>
                                <div id="price-scanner-view" style={{ minHeight: '300px', background: '#000' }} />
                            </div>
                        )}

                        {!scanning && !product && !loading && (
                            <div className="scanner-placeholder" style={{ padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                <Zap size={64} className="pulse-icon" style={{ color: 'var(--accent-light)', marginBottom: '20px' }} />
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Ready to Scan</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Position barcode in front of camera or use search</p>
                                {kioskMode && !scanning && (
                                    <button
                                        className="btn btn-primary mt-6"
                                        onClick={startScanner}
                                        style={{ marginTop: '20px', padding: '12px 30px', fontSize: '1.1rem' }}
                                    >
                                        <Camera size={22} style={{ marginRight: '10px' }} /> Start Scanner
                                    </button>
                                )}
                            </div>
                        )}

                        {loading && (
                            <div className="scanner-placeholder" style={{ padding: '60px 20px' }}>
                                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                                <p>Finding product details...</p>
                            </div>
                        )}

                        {product && (
                            <div className="product-info-card fade-in" style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '30px', border: '1px solid var(--border)', textAlign: 'left', boxShadow: 'var(--shadow-lg)' }}>
                                <div style={{ display: 'flex', gap: '25px', marginBottom: '30px', alignItems: 'center' }}>
                                    <div style={{ width: '120px', height: '120px', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                <Package size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'white' }}>{product.name}</h2>
                                        <p style={{ color: 'var(--accent-light)', fontWeight: 600, margin: '5px 0' }}>{product.category.name}</p>
                                        <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>{product.barcode}</code>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Price</span>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                            {product.discountPrice ? (
                                                <>
                                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>₱{product.discountPrice.toLocaleString()}</span>
                                                    <span style={{ textDecoration: 'line-through', color: 'var(--red)', fontSize: '1rem' }}>₱{product.price.toLocaleString()}</span>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>₱{product.price.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>Stock Status</span>
                                        <div style={{
                                            padding: '8px 15px',
                                            borderRadius: '8px',
                                            display: 'inline-block',
                                            background: product.stockQty > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: product.stockQty > 0 ? 'var(--green)' : 'var(--red)',
                                            fontWeight: 700
                                        }}>
                                            {product.stockQty > 0 ? `${product.stockQty} In Stock` : 'Out of Stock'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-secondary w-full"
                                    onClick={() => setProduct(null)}
                                    style={{ width: '100%', marginTop: '25px', padding: '12px' }}
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
