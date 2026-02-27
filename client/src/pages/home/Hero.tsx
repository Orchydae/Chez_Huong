import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import './Hero.css';

export default function Hero() {
    const [isHoveringProverb, setIsHoveringProverb] = useState(false);

    return (
        <main className="hero-section">
            <div className="hero-background"></div>

            <div className="hero-container">
                {/* Row 1 */}
                <div className="hero-row-1">
                    {/* Column 1: Vertical Text */}
                    <div className="hero-col-1">
                        <button className="vertical-text-btn" title="Pas encore disponible">À propos</button>
                        <button className="vertical-text-btn" title="Pas encore disponible">Recettes</button>
                    </div>

                    {/* Column 2: Main Content */}
                    <div className="hero-col-2">
                        <h1 className="hero-title">Chez Hương</h1>

                        <div
                            className="proverb-container"
                            onMouseEnter={() => setIsHoveringProverb(true)}
                            onMouseLeave={() => setIsHoveringProverb(false)}
                        >
                            <p
                                key={isHoveringProverb ? 'fr' : 'vi'}
                                className="hero-proverb blur-animate"
                            >
                                {isHoveringProverb ? "Il faut manger avant de philosopher." : "Có thực mới vực được đạo."}
                            </p>
                        </div>

                        <p className="hero-description">
                            Des recettes personnelles, héritage d’un secret qui perdure. Des repas nourrissants et réconfortants, piliers d’un mode de vie sain.
                        </p>

                        <button className="hero-button" disabled title="Pas encore disponible">
                            <span>S'abonner</span>
                            <ArrowUpRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Row 2 (Currently empty, reserved for future content per requirements if needed, or to establish the grid structure) */}
                <div className="hero-row-2">
                </div>
            </div>
        </main>
    );
}
