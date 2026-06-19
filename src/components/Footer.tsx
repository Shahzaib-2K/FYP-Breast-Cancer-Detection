import React from 'react';
import { Microscope, Mail, MapPin, GraduationCap, HeartPulse } from 'lucide-react';
import './Footer.css';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-mark" aria-hidden>
                  <Microscope className="footer-logo-icon" />
                </span>
                <div className="footer-logo-text">
                  <span className="footer-logo-title">Breast Cancer Detection</span>
                  <span className="footer-logo-subtitle">FAST National University · Karachi</span>
                </div>
              </div>
              <div className="footer-disclaimer-box footer-disclaimer-box--in-brand">
                <p className="footer-disclaimer">
                  <strong>Notice.</strong> This application is a research and educational prototype only. It
                  is not a medical device, not validated for clinical use, and must not be used for
                  diagnosis, screening, or treatment decisions.
                </p>
              </div>
            </div>

            <div className="footer-project footer-panel">
              <h2 className="footer-heading">Project</h2>
              <ul className="footer-meta-list">
                <li>
                  <GraduationCap size={14} aria-hidden />
                  <div>
                    <span className="footer-meta-label">Programme</span>
                    <span className="footer-meta-value">CS &amp; AI · Final Year Project</span>
                  </div>
                </li>
                <li>
                  <HeartPulse size={14} aria-hidden />
                  <div>
                    <span className="footer-meta-label">Focus</span>
                    <span className="footer-meta-value">Health tech · Responsible AI</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="footer-contact-block footer-panel">
              <h2 className="footer-heading">Contact</h2>
              <address className="footer-address">
                <a className="footer-contact-link" href="mailto:project@fastnu.edu.pk">
                  <Mail size={15} aria-hidden />
                  <span>project@fastnu.edu.pk</span>
                </a>
                <p className="footer-contact-line">
                  <MapPin size={15} aria-hidden />
                  <span>Karachi, Pakistan</span>
                </p>
              </address>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              &copy; {year} National University of Computer and Emerging Sciences (FAST-NU). All
              rights reserved.
            </p>
            <p className="footer-bottom-meta">
              <span>React · TypeScript</span>
              <span className="footer-dot" aria-hidden>
                ·
              </span>
              <span>API: FastAPI · PyTorch</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
