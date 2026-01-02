import { db, auth } from "../firebase";
import { collection, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";

export default function SavedDashboards({ onLoad, onBack, type }) {
    const user = auth.currentUser;
    const isHistory = type === 'auto';

    const [snapshot, loading, error] = useCollection(
        query(
            collection(db, "dashboards"),
            where("uid", "==", user?.uid),
            where("type", "==", type), // 'auto' (history) or 'manual' (saved)
            orderBy("createdAt", "desc")
        )
    );

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this item?")) {
            await deleteDoc(doc(db, "dashboards", id));
        }
    };

    if (loading) return <div className="loading-state">Loading...</div>;
    if (error) return <div className="error-msg">Error: {error.message}</div>;

    return (
        <div className="history-container">
            <div className="history-header">
                <button className="btn-back" onClick={onBack}>Back</button>
                <h2>{isHistory ? "Upload History" : "Saved Dashboards"}</h2>
            </div>

            {(!snapshot || snapshot.empty) ? (
                <div className="empty-state">
                    {isHistory ? "No upload history found." : "No saved dashboards found."}
                </div>
            ) : (
                <div className="history-grid">
                    {snapshot.docs.map(doc => {
                        const data = doc.data();
                        const date = new Date(data.createdAt).toLocaleString();

                        return (
                            <div key={doc.id} className="history-card" onClick={() => onLoad(data.data)}>
                                <div className="history-info">
                                    <h3>{data.name || "Untitled"}</h3>
                                    <p>{date}</p>
                                </div>
                                <button
                                    className="btn-delete"
                                    onClick={(e) => handleDelete(e, doc.id)}
                                    title="Delete"
                                >
                                    Delete
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
