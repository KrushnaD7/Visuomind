import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useState } from "react";

export default function Auth() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const login = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
        }
    };

    const signup = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
        }
    };

    const googleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Visuomind Login</h1>
                <p className="subtitle">Welcome back to your dashboard</p>

                {error && <p className="error-msg">{error}</p>}

                <input
                    className="input-field"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <input
                    className="input-field"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <div className="button-group">
                    <button className="btn btn-primary" onClick={login}>Login</button>
                    <button className="btn btn-secondary" onClick={signup}>Sign Up</button>
                </div>

                <div className="divider">OR</div>

                <button className="btn btn-google" onClick={googleLogin}>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
