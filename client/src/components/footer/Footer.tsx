import { Send } from 'lucide-react';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer-section">
            <div className="container">
                <div className="footer-content">
                    {/* Left Side: Newsletter & Logo */}
                    <div className="footer-left">
                        <div className="newsletter-wrapper">
                            <span className="newsletter-label">Infolettre</span>
                            <div className="newsletter-input-container">
                                <input
                                    type="email"
                                    placeholder="Entre ton adresse courriel"
                                    className="newsletter-input"
                                />
                                <button className="newsletter-submit">
                                    <Send size={18} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        <div className="footer-logo">
                            <h2>Chez Hương</h2>
                        </div>
                    </div>

                    {/* Right Side: Links */}
                    <div className="footer-right">
                        <nav className="footer-nav">
                            <a href="#propos">À propos</a>
                            <a href="#recettes">Recettes</a>
                        </nav>
                    </div>
                </div>
            </div>
        </footer>
    );
}
