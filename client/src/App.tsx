import { ChefHat, ArrowRight, PlayCircle, Star, Users, Clock } from 'lucide-react';

function App() {
  return (
    <>
      <div className="bg-glow"></div>

      <div className="container">
        <nav className="navbar">
          <div className="logo">
            <ChefHat size={32} color="var(--accent-primary)" />
            <span>Chez<span style={{ color: 'var(--accent-primary)' }}>Huong</span></span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link">Recipes</a>
            <a href="#" className="nav-link">Meal Plans</a>
            <a href="#" className="nav-link">About</a>
            <button className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.875rem' }}>Sign In</button>
          </div>
        </nav>

        <main className="hero">
          <div className="hero-grid">
            <div className="hero-content">
              <span className="hero-tag">A Culinary Journey</span>
              <h1 className="hero-title">
                Discover the <span className="gradient-text">Art</span> of Cooking
              </h1>
              <p className="hero-description">
                Elevate your home cooking with curated, premium recipes from world-class chefs. Uncover the secrets to extraordinary flavors every single day.
              </p>

              <div className="hero-actions">
                <button className="btn btn-primary">
                  Explore Recipes
                  <ArrowRight size={20} />
                </button>
                <button className="btn btn-secondary">
                  <PlayCircle size={20} />
                  Watch Video
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="recipe-card-mockup">
                <div className="mockup-image">
                  <ChefHat size={64} color="var(--glass-border)" />
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Seared Scallops</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>With cauliflower purée & caper raisin dressing.</p>

                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-label">Time</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} color="var(--accent-primary)" />
                      <span className="stat-value" style={{ fontSize: '1rem' }}>45m</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Difficulty</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star size={16} color="var(--accent-primary)" />
                      <span className="stat-value" style={{ fontSize: '1rem' }}>Medium</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Serves</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="var(--accent-primary)" />
                      <span className="stat-value" style={{ fontSize: '1rem' }}>2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
