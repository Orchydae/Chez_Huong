import { useState } from 'react';
import { Search, User } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
    const [isSignedIn, setIsSignedIn] = useState(false);

    return (
        <nav className="navbar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: 'transparent', borderRadius: '100px', padding: '50px' }}>
            <div className="logo-placeholder" style={{ width: '150px' }}>
                <div className="logo logo-fixed" style={{ color: 'white' }}>
                    <img src="/chezhuonglogo.svg" alt="Chez Huong Logo" style={{ height: '60px' }} />
                </div>
            </div>

            <div className="search-container">
                <div className="search-pill">
                    <input type="text" className="search-input" placeholder="J'ai envie de...." />
                    <Search size={18} color="white" />
                </div>
            </div>

            <div className="nav-links">
                <div className="navbar-pill" style={{ cursor: 'pointer' }} onClick={() => setIsSignedIn(!isSignedIn)}>
                    <User size={18} />
                    <span>{isSignedIn ? "user.name" : "Sign in"}</span>
                </div>
            </div>
        </nav>
    );
}
