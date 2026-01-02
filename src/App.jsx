import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function App() {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Visuomind...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-screen">Error: {error.message}</div>
  }

  return (
    <div className="app-container">
      {user ? <Dashboard /> : <Auth />}

      <footer className="app-footer">
        <p>Build by Krushna with ❤️</p>
      </footer>
    </div>
  );
}
