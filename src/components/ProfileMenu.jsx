import { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function ProfileMenu({ setView, user }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = (view) => {
        setView(view);
        setIsOpen(false);
    };

    const handleLogout = () => {
        signOut(auth);
    };

    const getInitials = () => {
        if (user.displayName) return user.displayName[0].toUpperCase();
        if (user.email) return user.email[0].toUpperCase();
        return "U";
    };

    return (
        <div className="profile-menu" ref={menuRef}>
            <div className="avatar" onClick={() => setIsOpen(!isOpen)}>
                {getInitials()}
            </div>

            {isOpen && (
                <div className="dropdown">
                    <div className="dropdown-header">
                        <strong>{user.displayName || "User"}</strong>
                        <span>{user.email}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button onClick={() => handleAction('dashboard')}>🏠 Home</button>
                    <button onClick={() => handleAction('saved')}>💾 Saved Dashboards</button>
                    <button onClick={() => handleAction('history')}>📜 Upload History</button>
                    <button onClick={() => handleAction('settings')}>⚙️ Settings</button>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="text-danger">🚪 Logout</button>
                </div>
            )}
        </div>
    );
}
