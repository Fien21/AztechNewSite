import { useEffect, useState } from 'react';
import { Save, Image as ImageIcon, Trash2, Upload, Settings as SettingsIcon, Play, Pause, Clock, Zap } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface SettingsData {
    id: number;
    isPosOpen: boolean;
    carouselSpeed: number;
    carouselTimeout: number;
    carouselEnabled: boolean;
    carouselImages: string; // JSON string
    carouselClockPosition: 'top-right' | 'top-left' | 'center' | 'bottom-center';
    carouselImageFit: 'contain' | 'cover';
    carouselImageSize: number;
}

export default function Settings() {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setSettings(res.data);
            setImages(JSON.parse(res.data.carouselImages || '[]'));
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const updateData = {
                ...settings,
                carouselImages: JSON.stringify(images)
            };
            await axios.patch('/api/settings', updateData);
            Swal.fire({
                icon: 'success',
                title: 'Settings Saved',
                background: '#132743',
                color: '#e8ecf4',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Failed to save settings', err);
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: 'Could not update settings.',
                background: '#132743',
                color: '#e8ecf4',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post('/api/settings/carousel-upload', formData);
            setImages(prev => [...prev, res.data.url]);
        } catch (err) {
            console.error('Upload failed', err);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: 'Image could not be uploaded.',
                background: '#132743',
                color: '#e8ecf4',
            });
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    if (loading || !settings) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div>
                    <h1>System Settings</h1>
                    <p>Manage global configuration and display displays</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSaveSettings}
                    disabled={saving}
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* General Settings */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SettingsIcon size={20} className="text-accent" />
                        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>General Configuration</h2>
                    </div>
                    <div className="card-body" style={{ padding: '20px' }}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.isPosOpen}
                                    onChange={(e) => setSettings({ ...settings, isPosOpen: e.target.checked })}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>POS System Open</span>
                            </label>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '30px' }}>
                                When disabled, cashiers will be unable to process new transactions.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Carousel Settings */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ImageIcon size={20} className="text-secondary" />
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Price Scanner Carousel Management</h2>
                    </div>
                    <div className="card-body" style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                        {/* Left Column: Controls */}
                        <div>
                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.carouselEnabled}
                                        onChange={(e) => setSettings({ ...settings, carouselEnabled: e.target.checked })}
                                        style={{ width: '22px', height: '22px' }}
                                    />
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ENABLE INACTIVITY CAROUSEL</span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        <Clock size={14} /> Timeout (ms)
                                    </label>
                                    <input
                                        type="number"
                                        className="swal-mini-input"
                                        value={settings.carouselTimeout}
                                        onChange={(e) => setSettings({ ...settings, carouselTimeout: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>Idle time before start</span>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        <Play size={14} /> Speed (ms)
                                    </label>
                                    <input
                                        type="number"
                                        className="swal-mini-input"
                                        value={settings.carouselSpeed}
                                        onChange={(e) => setSettings({ ...settings, carouselSpeed: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>Slide transition speed</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        <Clock size={14} /> Clock Position
                                    </label>
                                    <select
                                        className="swal-mini-input"
                                        value={settings.carouselClockPosition}
                                        onChange={(e) => setSettings({ ...settings, carouselClockPosition: e.target.value as any })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                    >
                                        <option value="center">Center</option>
                                        <option value="top-right">Top Right</option>
                                        <option value="top-left">Top Left</option>
                                        <option value="bottom-center">Bottom Center</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        <ImageIcon size={14} /> Image Fit
                                    </label>
                                    <select
                                        className="swal-mini-input"
                                        value={settings.carouselImageFit}
                                        onChange={(e) => setSettings({ ...settings, carouselImageFit: e.target.value as any })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                    >
                                        <option value="contain">Contain (Full Image)</option>
                                        <option value="cover">Cover (Fill Screen)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Zap size={14} className="text-accent" /> Image Size Toggle
                                    </div>
                                    <span style={{ color: 'var(--accent-light)', fontWeight: 800 }}>{settings.carouselImageSize}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={settings.carouselImageSize}
                                    onChange={(e) => setSettings({ ...settings, carouselImageSize: parseInt(e.target.value) })}
                                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    <span>Mini (1%)</span>
                                    <span>Full (100%)</span>
                                </div>
                            </div>

                            <div className="image-management-section">
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: '15px', color: 'var(--text-secondary)' }}>Carousel Images</label>
                                <div className="image-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '12px' }}>
                                    {images.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1/1', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                            <img src={img} alt="carousel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                                className="btn-icon btn-danger"
                                                style={{ position: 'absolute', top: '4px', right: '4px', padding: '5px', borderRadius: '6px' }}
                                                onClick={() => removeImage(idx)}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label style={{
                                        border: '2px dashed var(--border)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        aspectRatio: '1/1',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: 'var(--text-muted)',
                                        transition: 'all 0.2s'
                                    }} className="hover:bg-accent-light/10 hover:border-accent-light">
                                        {uploading ? <div className="spinner mini" /> : <Upload size={24} />}
                                        <span style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600 }}>Upload</span>
                                        <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Live Preview */}
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <Play size={18} className="text-green" />
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>LIVE CAROUSEL PREVIEW</span>
                            </div>

                            {images.length > 0 ? (
                                <div style={{
                                    position: 'relative',
                                    height: '240px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    background: 'linear-gradient(135deg, #0d1929 0%, #152c4a 100%)', // Stylized scanner-like background
                                    border: '2px solid var(--border)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}>
                                    {/* Glassmorphism Overlay Container */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'rgba(13, 25, 41, 0.4)',
                                        backdropFilter: 'blur(10px)',
                                        zIndex: 1
                                    }}>
                                        <CarouselPreview
                                            slides={images}
                                            speed={settings.carouselSpeed}
                                            fit={settings.carouselImageFit}
                                            clockPos={settings.carouselClockPosition}
                                            size={settings.carouselImageSize}
                                        />
                                    </div>
                                    {/* Mock Scanner UI Background Elements */}
                                    <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem' }}>AZTECH POS SERVER</div>
                                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: 'rgba(255,255,255,0.1)', fontSize: '0.6rem' }}>scanner active...</div>
                                </div>
                            ) : (
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '15px',
                                    border: '2px dashed var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    textAlign: 'center',
                                    padding: '20px'
                                }}>
                                    <div>
                                        <ImageIcon size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                        <p>Upload images to see the live scanner banner preview</p>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '15px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-light)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                                    <Zap size={16} /> Carousel Management Tools
                                </h3>
                                <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.8, margin: 0 }}>
                                    <li><strong>Auto-Activation:</strong> Carousel starts automatically after the specified <em>Timeout</em>.</li>
                                    <li><strong>Image Ratio:</strong> Use <strong>16:9</strong> or <strong>landscape</strong> images for best fit.</li>
                                    <li><strong>File Size:</strong> Keep images under <strong>2MB</strong> each for smooth transitions.</li>
                                    <li><strong>Interruption:</strong> Clicking the screen saver or scanning a product hides it instantly.</li>
                                    <li><strong>Kiosk Mode:</strong> Works seamlessly with <em>Ctrl+Shift+H</em> for a full-screen shop experience.</li>
                                </ul>
                            </div>

                            <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '10px', borderLeft: '4px solid var(--green)' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                                    <strong>Display Note:</strong> The carousel now acts as a <strong>Fullscreen Screen Saver</strong> overlay with a high z-index.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Small preview component logic
function CarouselPreview({ slides, speed, fit, clockPos, size }: {
    slides: string[],
    speed: number,
    fit: 'contain' | 'cover',
    clockPos: 'top-right' | 'top-left' | 'center' | 'bottom-center',
    size: number
}) {
    const [index, setIndex] = useState(0);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        if (slides.length <= 1) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % slides.length);
        }, speed || 5000);
        return () => clearInterval(interval);
    }, [slides.length, speed]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getClockStyle = (): React.CSSProperties => {
        switch (clockPos) {
            case 'center':
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            case 'top-right':
                return { top: '10px', right: '10px' };
            case 'top-left':
                return { top: '10px', left: '10px' };
            case 'bottom-center':
            default:
                return { bottom: '10px', left: '50%', transform: 'translateX(-50%)' };
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                display: 'flex',
                height: '100%',
                width: `${slides.length * 100}%`,
                transform: `translateX(-${(index * 100) / slides.length}%)`,
                transition: 'transform 0.8s ease-in-out'
            }}>
                {slides.map((s, i) => (
                    <div key={i} style={{
                        width: `${100 / slides.length}%`,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img
                            src={s}
                            style={{
                                width: `${size}%`,
                                height: `${size}%`,
                                objectFit: fit,
                                transition: 'all 0.3s ease'
                            }}
                            alt="preview"
                        />
                    </div>
                ))}
            </div>
            {/* Mock Clock - Styled with Glassmorphism for Preview */}
            <div style={{
                position: 'absolute',
                background: 'rgba(0,0,0,0.4)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '10px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                zIndex: 10,
                transition: 'all 0.5s ease',
                ...getClockStyle()
            }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1 }}>
                    {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
            </div>
        </div>
    );
}
