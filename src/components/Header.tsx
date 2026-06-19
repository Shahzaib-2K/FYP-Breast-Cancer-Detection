import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Microscope } from 'lucide-react';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen((open) => !open);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-bar">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo" aria-label="Breast Cancer Detection home">
              <span className="logo-mark" aria-hidden>
                <Microscope className="logo-mark-icon" strokeWidth={2} />
              </span>
              <div className="logo-text">
                <span className="logo-title">Breast Cancer Detection</span>
                <span className="logo-subtitle">FAST-NU · Karachi</span>
              </div>
            </Link>

            <nav
              id="primary-nav"
              className={`nav ${isMenuOpen ? 'nav-open' : ''}`}
              aria-label="Main"
            >
              <ul className="nav-list">
                <li>
                  <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive('/') ? 'page' : undefined}
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/demo"
                    className={`nav-link ${isActive('/demo') ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive('/demo') ? 'page' : undefined}
                  >
                    Demo
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className={`nav-link ${isActive('/team') ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive('/team') ? 'page' : undefined}
                  >
                    Team
                  </Link>
                </li>
              </ul>
            </nav>

            <button
              type="button"
              className="menu-toggle"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="primary-nav"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={22} strokeWidth={2} aria-hidden /> : <Menu size={22} strokeWidth={2} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
