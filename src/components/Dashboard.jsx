import { useState } from "react";
import FileUpload from "./FileUpload";
import ChartRenderer from "./ChartRenderer";
import SavedDashboards from "./SavedDashboards";
import ProfileMenu from "./ProfileMenu";
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'saved', 'settings'
    const [source, setSource] = useState(null); // null (upload), 'history', 'saved'

    const user = auth.currentUser;

    // Manual Save (User clicks button)
    const saveDashboard = async () => {
        if (!data.length) return alert("Nothing to save!");

        setIsSaving(true);
        try {
            await addDoc(collection(db, "dashboards"), {
                uid: user?.uid,
                data: data.slice(0, 500),
                createdAt: Date.now(),
                name: `Dashboard ${new Date().toLocaleString()}`,
                type: 'manual'
            });
            alert("Dashboard saved successfully!");
            setSource('saved'); // Update source to hide button
        } catch (err) {
            console.error("Error saving: ", err);
            alert(`Error saving: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto Save (Triggered on Upload)
    const handleAutoSave = async (newData) => {
        setSource(null); // Fresh upload
        if (!user) return;
        try {
            await addDoc(collection(db, "dashboards"), {
                uid: user.uid,
                data: newData.slice(0, 500),
                createdAt: Date.now(),
                name: `Auto-Save ${new Date().toLocaleString()}`,
                type: 'auto'
            });
            console.log("Auto-saved to history");
        } catch (err) {
            console.error("Auto-save failed", err);
        }
    };

    const handleLoadFromStorage = (savedData, fromSource) => {
        setData(savedData);
        setSource(fromSource);
        setView('dashboard');
    };

    const handleBack = () => {
        if (source === 'history') {
            setData([]);
            setView('history');
        } else if (source === 'saved') {
            setData([]);
            setView('saved');
        } else {
            // Fresh upload, just clear
            setData([]);
        }
        setSource(null);
    };

    return (
        <div className="dashboard-layout">
            <header className="navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {view === 'dashboard' && data.length > 0 && (
                        <button className="btn-back" onClick={handleBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            ← Back
                        </button>
                    )}
                    <div className="logo" onClick={() => setView('dashboard')}>Visuomind</div>
                </div>

                <div className="nav-actions">
                    {/* Show Save btn if data exists AND source is NOT 'saved' (i.e. upload or history) */}
                    {view === 'dashboard' && data.length > 0 && source !== 'saved' && (
                        <button className="btn btn-outline" onClick={saveDashboard} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Dashboard"}
                        </button>
                    )}
                    <ProfileMenu setView={setView} user={user} />
                </div>
            </header>

            <main className="main-content">
                {view === 'dashboard' && (
                    <>
                        <section className="control-panel">
                            {data.length === 0 && (
                                <>
                                    <h2>Upload Data</h2>
                                    <FileUpload setData={setData} onUpload={handleAutoSave} />
                                </>
                            )}
                        </section>

                        {data.length > 0 && (
                            <section className="visualization-panel">
                                {source && (
                                    <div className="active-data-banner" style={{ marginBottom: '1rem' }}>
                                        <p>Viewing data from <strong>{source === 'history' ? "Upload History" : "Saved Dashboards"}</strong></p>
                                    </div>
                                )}
                                <ChartRenderer data={data} />
                            </section>
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
                    <div className="empty-state">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
                            <button className="btn-back" onClick={() => setView('dashboard')}>← Back</button>
                            <h3 style={{ margin: 0 }}>⚙️ Settings</h3>
                        </div>
                        <p>User preferences coming soon...</p>
                    </div>
                )}
            </main>
        </div>
    );
}
