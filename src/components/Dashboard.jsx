import { useState } from "react";
import { LayoutDashboard, Sun, Moon, Save, ChevronLeft } from "lucide-react";
import FileUpload from "./FileUpload";
import SavedDashboards from "./SavedDashboards";
import DataSummary from "./DataSummary";
import RecommendedCharts from "./RecommendedCharts";
import ManualExplorer from "./ManualExplorer";
import ProfileMenu from "./ProfileMenu";
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { processData } from "../utils/DataProcessor";
import { getRecommendations } from "../utils/RecommendationEngine";
import { useTheme } from "../utils/useTheme";

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [view, setView] = useState('dashboard'); // dashboard, history, saved, settings
    const [source, setSource] = useState(null); // null, 'history', 'saved'
    const [activeTab, setActiveTab] = useState('columns');

    const { theme, toggleTheme } = useTheme();
    const user = auth.currentUser;

    // Manual Save
    const saveDashboard = async () => {
        if (!data.length) return alert("Nothing to save!");

        setIsSaving(true);
        try {
            await addDoc(collection(db, "dashboards"), {
                uid: user?.uid,
                data: data.slice(0, 1000),
                createdAt: Date.now(),
                name: `Dashboard ${new Date().toLocaleString()}`,
                type: 'manual'
            });
            alert("Dashboard saved successfully!");
            setSource('saved');
        } catch (err) {
            console.error("Error saving: ", err);
            alert(`Error saving: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto Save (Triggered on Upload)
    const handleUpload = (rawData) => {
        const processed = processData(rawData);
        if (!processed) return alert("Could not process data");

        // Generate Recommendations
        const recs = getRecommendations(processed.data, processed.columns);

        setData(processed.data);
        setAnalysis(processed);
        setRecommendations(recs);
        setSource(null);

        if (user) {
            addDoc(collection(db, "dashboards"), {
                uid: user.uid,
                data: processed.data.slice(0, 1000),
                createdAt: Date.now(),
                name: `Auto-Save ${new Date().toLocaleString()}`,
                type: 'auto'
            }).catch(err => console.error("Auto-save failed", err));
        }
    };

    const handleLoadFromStorage = (savedData, fromSource) => {
        const processed = processData(savedData);
        if (processed) {
            const recs = getRecommendations(processed.data, processed.columns);
            setData(processed.data);
            setAnalysis(processed);
            setRecommendations(recs);
        } else {
            setData(savedData);
        }
        setSource(fromSource);
        setView('dashboard');
    };

    const handleBack = () => {
        setData([]);
        setAnalysis(null);
        setRecommendations([]);
        setSource(null);
        if (source === 'history') setView('history');
        else if (source === 'saved') setView('saved');
        else setView('dashboard');
    };


    const goHome = () => {
        if (data.length > 0 && !confirm("This will clear your current analysis. Continue?")) return;
        setData([]);
        setAnalysis(null);
        setRecommendations([]);
        setSource(null);
        setView('dashboard');
        setActiveTab('columns');
    };

    return (
        <div className="dashboard-layout">
            <header className="navbar">
                <div className="logo-section" onClick={goHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary-color)', padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}>
                        <LayoutDashboard size={24} color="white" />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                        Visuomind
                    </span>
                </div>

                <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {view === 'dashboard' && data.length > 0 && source !== 'saved' && (
                        <button
                            className="btn btn-primary"
                            onClick={saveDashboard}
                            disabled={isSaving}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                        >
                            <Save size={18} />
                            <span>Save</span>
                        </button>
                    )}

                    <button
                        className="btn-icon"
                        onClick={toggleTheme}
                        title="Toggle Theme"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

                    <ProfileMenu setView={setView} goHome={goHome} user={user} />
                </div>
            </header>

            <main className="main-content">
                {/* Back Button for sub-views, moved to content area top */}
                {view !== 'dashboard' && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="btn-back" onClick={() => setView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ChevronLeft size={16} /> Back to Dashboard
                        </button>
                    </div>
                )}
                {/* Back Button for active dashboard with data? */}
                {view === 'dashboard' && data.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="btn-back" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ChevronLeft size={16} /> Close & Clear
                        </button>
                    </div>
                )}
                {view === 'dashboard' && (
                    <>
                        {data.length === 0 ? (
                            <section className="landing-view fade-in">
                                <div className="hero-section">
                                    <h1 className="hero-title">Data Visualization Platform</h1>
                                    <p className="hero-subtitle">
                                        Upload datasets to instantly generate insights, trends, and relationships.
                                    </p>
                                </div>

                                <FileUpload setData={() => { }} onUpload={handleUpload} />

                                <div className="features-section">
                                    <h3 className="section-label">What Visuomind Can Do</h3>
                                    <div className="features-grid">
                                        {/* Card 1: Column Insights */}
                                        <div className="feature-card">
                                            <div className="feature-icon-wrapper">
                                                <LayoutDashboard size={24} className="feature-icon" />
                                            </div>
                                            <h4>Understand Your Data</h4>
                                            <p>Automatic distributions, ranges, and summaries for each column.</p>
                                            <div className="mini-chart-preview histogram-preview">
                                                <div className="bar" style={{ height: '40%' }}></div>
                                                <div className="bar" style={{ height: '70%' }}></div>
                                                <div className="bar" style={{ height: '50%' }}></div>
                                                <div className="bar" style={{ height: '80%' }}></div>
                                                <div className="bar" style={{ height: '60%' }}></div>
                                            </div>
                                        </div>

                                        {/* Card 2: Smart Insights */}
                                        <div className="feature-card">
                                            <div className="feature-icon-wrapper">
                                                <Sun size={24} className="feature-icon" />
                                            </div>
                                            <h4>Discover Key Insights</h4>
                                            <p>Automatically highlights the most important relationships.</p>
                                            <div className="mini-chart-preview scatter-preview">
                                                <div className="dot" style={{ left: '20%', top: '60%' }}></div>
                                                <div className="dot" style={{ left: '40%', top: '40%' }}></div>
                                                <div className="dot" style={{ left: '60%', top: '30%' }}></div>
                                                <div className="dot" style={{ left: '80%', top: '10%' }}></div>
                                                <div className="trend-line"></div>
                                            </div>
                                        </div>

                                        {/* Card 3: Explore Relationships */}
                                        <div className="feature-card">
                                            <div className="feature-icon-wrapper">
                                                <ChevronLeft size={24} className="feature-icon rotate-90" />
                                            </div>
                                            <h4>Explore Relationships</h4>
                                            <p>Compare variables using strict BI rules to avoid misleading charts.</p>
                                            <div className="mini-chart-preview comparison-preview">
                                                <div className="line-chart-path"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ) : null}

                        {data.length > 0 && analysis && (
                            <div className="dashboard-content">
                                {source && (
                                    <div className="active-data-banner">
                                        <p>Viewing data from <strong>{source === 'history' ? "Upload History" : "Saved Dashboards"}</strong></p>
                                    </div>
                                )}

                                {/* Analytical Layers Tabs */}
                                <div className="tabs-container fade-in">
                                    <button
                                        className={`tab-btn ${activeTab === 'columns' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('columns')}
                                    >
                                        Column Insights
                                    </button>
                                    <button
                                        className={`tab-btn ${activeTab === 'smart' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('smart')}
                                    >
                                        System Insights
                                    </button>
                                    <button
                                        className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('explore')}
                                    >
                                        Explore Relationships
                                    </button>
                                </div>

                                <div className="tab-content fade-in">
                                    {activeTab === 'columns' && (
                                        <div className="layer-view">
                                            {/* Univariate */}
                                            <DataSummary analysis={analysis} data={data} />
                                        </div>
                                    )}

                                    {activeTab === 'smart' && (
                                        <div className="layer-view">
                                            {/* Multivariate */}
                                            <RecommendedCharts recommendations={recommendations} data={data} />
                                        </div>
                                    )}

                                    {activeTab === 'explore' && (
                                        <div className="layer-view">
                                            {/* Bivariate */}
                                            <ManualExplorer data={data} columns={analysis.columns} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {view === 'history' && (
                    <SavedDashboards
                        type="auto"
                        onLoad={(d) => handleLoadFromStorage(d, 'history')}
                        onBack={() => setView('dashboard')}
                    />
                )}

                {view === 'saved' && (
                    <SavedDashboards
                        type="manual"
                        onLoad={(d) => handleLoadFromStorage(d, 'saved')}
                        onBack={() => setView('dashboard')}
                    />
                )}

                {view === 'settings' && (
                    <div className="settings-view fade-in">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>Settings</h2>
                            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Manage your preferences and account</p>
                        </div>

                        <div className="settings-card">
                            {/* Account Section */}
                            <div className="settings-section">
                                <h3>Account</h3>
                                <div className="settings-row">
                                    <div className="profile-preview">
                                        <div className="avatar-large">
                                            {user?.displayName ? user.displayName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
                                        </div>
                                        <div className="settings-info">
                                            <h4>{user?.displayName || "User"}</h4>
                                            <p>{user?.email}</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline" onClick={() => auth.signOut()} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                        Sign Out
                                    </button>
                                </div>
                            </div>

                            {/* Appearance Section */}
                            <div className="settings-section">
                                <h3>Appearance</h3>
                                <div className="settings-row">
                                    <div className="settings-info">
                                        <h4>Dark Mode</h4>
                                        <p>Toggle between light and dark themes</p>
                                    </div>
                                    <button
                                        className={`theme-toggle-large ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={toggleTheme}
                                        aria-label="Toggle Dark Mode"
                                    >
                                        <div className="theme-toggle-custom-handle" />
                                    </button>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="settings-section">
                                <h3>About</h3>
                                <div className="settings-row">
                                    <div className="settings-info">
                                        <h4>Visuomind Version</h4>
                                        <p>v1.2.0 (Stable)</p>
                                    </div>
                                    <span className="badge category">Up to Date</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
