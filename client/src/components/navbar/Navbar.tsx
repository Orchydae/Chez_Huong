import { useState, useRef, useEffect } from 'react';
import { Search, User, ChevronDown, PlusCircle, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginModal from '../auth/LoginModal';
import './Navbar.css';

export default function Navbar() {
    const { auth, logout } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
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
                    {auth.user ? (
                        /* Logged in: profile pill with dropdown */
                        <div className="profile-wrapper" ref={dropdownRef}>
                            <div
                                className="navbar-pill"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setShowDropdown((prev) => !prev)}
                            >
                                <User size={18} />
                                <span>{auth.user.firstName}</span>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                            </div>

                            {showDropdown && (
                                <div className="profile-dropdown">
                                    {(auth.user.role === 'ADMIN' || auth.user.role === 'WRITER') && (
                                        <Link
                                            to="/recipes/create"
                                            className="dropdown-item"
                                            onClick={() => setShowDropdown(false)}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <PlusCircle size={16} />
                                            <span>Créer une recette</span>
                                        </Link>
                                    )}

                                    <div className="dropdown-separator" />

                                    <button
                                        className="dropdown-item dropdown-item--danger"
                                        onClick={() => { logout(); setShowDropdown(false); }}
                                    >
                                        <LogOut size={16} />
                                        <span>Se déconnecter</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Not logged in: open modal */
                        <div className="navbar-pill" style={{ cursor: 'pointer' }} onClick={() => setShowLogin(true)}>
                            <User size={18} />
                            <span>Sign in</span>
                        </div>
                    )}
                </div>
            </nav>

            {/* Login modal */}
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        </>
    );
}
