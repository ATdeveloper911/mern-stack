import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUp,
  Bot,
  Compass,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  ShieldCheck,
  Sparkles,
  Twitter,
  Users,
  Wallet
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setIsScrolled(y > 50);

      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, y / scrollHeight)) : 0;
      setScrollProgress(progress);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToId = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const motionInView = useMemo(
    () => ({
      initial: { opacity: 0, y: 30 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.22 },
      transition: { duration: 0.7, ease: 'easeOut' }
    }),
    []
  );

  return (
    <div className="landing-v2">
      <header className={`lp-nav ${isScrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <button type="button" className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo/main_logo.jpeg" alt="Smart Travel Planner" className="lp-logo-nav" />
            <span className="lp-brand-text">Smart Travel Planner</span>
          </button>

          <nav className="lp-nav-links" aria-label="Landing navigation">
            <button type="button" className="lp-nav-link" onClick={() => scrollToId('destinations')}>
              Destinations
            </button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToId('ai-planner')}>
              AI Planner
            </button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToId('budget')}>
              Budget
            </button>
            <button type="button" className="lp-nav-link" onClick={() => scrollToId('community')}>
              Community
            </button>
          </nav>

          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-ghost">
              Login
            </Link>
            <Link to="/register" className="lp-btn lp-btn-solid">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* --- MODIFIED HERO SECTION START --- */}
      <section
        className="lp-hero"
        style={{
          // Using a high-quality landscape image
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=80')"
        }}
      >
        <div className="lp-hero-overlay" />
        <div className="lp-shell lp-hero-inner">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lp-hero-content"
          >
            <div className="lp-hero-kicker">
              <span className="lp-pill lp-pill-glass">🇵🇰 Pakistan-First</span>
              <span className="lp-pill lp-pill-glass">✨ AI-Powered</span>
              <span className="lp-pill lp-pill-glass">💰 Smart Budget</span>
            </div>
            
            <h1 className="lp-hero-title">
              Explore the <span className="text-highlight">Unseen Beauty</span> of Pakistan.
            </h1>
            
            <p className="lp-hero-subtitle">
              Don't just travel—experience. From the hidden valleys of Gilgit to the coastal highways of Gwadar, build smarter itineraries and discover the real Pakistan.
            </p>
            
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn lp-btn-solid lp-btn-lg lp-hero-btn-primary">
                Start Your Journey
              </Link>
              <button type="button" className="lp-btn lp-btn-glass lp-btn-lg" onClick={() => scrollToId('destinations')}>
                Explore Features
              </button>
            </div>

            <div className="lp-hero-metrics">
              <div className="lp-metric">
                <div className="lp-metric-value">Hybrid</div>
                <div className="lp-metric-label">Smart Budgeting</div>
              </div>
              <div className="lp-metric">
                <div className="lp-metric-value">AI</div>
                <div className="lp-metric-label">Buddy Bot Planner</div>
              </div>
              <div className="lp-metric">
                <div className="lp-metric-value">100%</div>
                <div className="lp-metric-label">Local Focus</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* --- MODIFIED HERO SECTION END --- */}

      <main className="lp-main">
        <section id="destinations" className="lp-section">
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-section-title">
              <div className="lp-eyebrow">Destinations</div>
            </motion.div>
            <div className="split-section">
              <motion.div {...motionInView} className="split-copy">
                <h2 className="lp-h2">Discover the Undiscovered.</h2>
                <p className="lp-p">
                  Find hidden lakes, quiet valleys, and underrated cultural stops — curated for Pakistan travel and tuned to real
                  seasons.
                </p>
                <p className="lp-p">
                  Explore routes that match your travel style — family trips, friend groups, or solo escapes — with practical
                  context you can actually use.
                </p>
                <ul className="lp-list">
                  <li className="lp-list-item">
                    <MapPin className="lp-li-icon" aria-hidden="true" />
                    Explore north, coastal routes, and weekend escapes
                  </li>
                  <li className="lp-list-item">
                    <Compass className="lp-li-icon" aria-hidden="true" />
                    Get practical travel context, not just copy-paste tips
                  </li>
                  <li className="lp-list-item">
                    <Globe className="lp-li-icon" aria-hidden="true" />
                    Plan around weather, timing, and on-ground realities
                  </li>
                </ul>
                <div className="split-actions">
                  <Link to="/register" className="lp-btn lp-btn-solid">
                    Build a Trip
                  </Link>
                  <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollToId('ai-planner')}>
                    Next: AI Planner
                  </button>
                </div>
              </motion.div>

              <motion.div {...motionInView} className="split-media">
                <div
                  className="split-image"
                  role="img"
                  aria-label="Mountain valley and lake in Pakistan"
                  style={{
                    backgroundImage:
                      "url('https://www.thetravellingsloth.com/wp-content/uploads/2023/03/IMG_9389-1024x768.jpeg')"
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section id="ai-planner" className="lp-section lp-section-alt">
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-section-title">
              <div className="lp-eyebrow">AI Planner</div>
            </motion.div>
            <div className="split-section split-reverse">
              <motion.div {...motionInView} className="split-media">
                <div
                  className="split-image"
                  role="img"
                  aria-label="Abstract tech interface for travel planning"
                  style={{
                    backgroundImage:
                      "url('https://a.storyblok.com/f/277218/1200x686/25da3dd052/ai-and-future-of-business-planning.webp/m/1000x656/filters:format(webp)')"
                  }}
                />
              </motion.div>

              <motion.div {...motionInView} className="split-copy">
                <h2 className="lp-h2">Your AI Travel Companion.</h2>
                <p className="lp-p">Ask smarter questions, get clearer routes, and build a trip plan in minutes.</p>
                <p className="lp-p">
                  Buddy Bot helps you plan faster — shape day-by-day itineraries, compare options, and stay confident about
                  timing, weather, and routes.
                </p>
                <div className="lp-mini-grid">
                  <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.18 }} className="lp-mini-card">
                    <Bot className="lp-mini-icon" aria-hidden="true" />
                    <div>
                      <div className="lp-mini-title">Buddy Bot</div>
                      <div className="lp-mini-text">Ask anything: seasons, routes, must-see spots.</div>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.18 }} className="lp-mini-card">
                    <Sparkles className="lp-mini-icon" aria-hidden="true" />
                    <div>
                      <div className="lp-mini-title">Smart Itineraries</div>
                      <div className="lp-mini-text">Get structure without losing flexibility.</div>
                    </div>
                  </motion.div>
                </div>
                <div className="split-actions">
                  <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollToId('budget')}>
                    Next: Budget
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="budget" className="lp-section">
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-section-title">
              <div className="lp-eyebrow">Budget</div>
            </motion.div>
            <div className="split-section">
              <motion.div {...motionInView} className="split-copy">
                <h2 className="lp-h2">Smart Money Map.</h2>
                <p className="lp-p">
                  Get a grounded estimate using Hybrid Smart Calculation — then adjust it to match your exact travel style.
                </p>
                <p className="lp-p">
                  See clear category breakdowns and avoid surprise costs — perfect for group trips and longer routes.
                </p>
                <ul className="lp-list">
                  <li className="lp-list-item">
                    <Wallet className="lp-li-icon" aria-hidden="true" />
                    Transparent category breakdowns: travel, stay, food, activities
                  </li>
                  <li className="lp-list-item">
                    <ShieldCheck className="lp-li-icon" aria-hidden="true" />
                    Robust fallbacks so you always get an estimate
                  </li>
                </ul>
                <div className="split-actions">
                  <Link to="/register" className="lp-btn lp-btn-solid">
                    Try Smart Budgeting
                  </Link>
                  <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollToId('community')}>
                    Next: Community
                  </button>
                </div>
              </motion.div>

              <motion.div {...motionInView} className="split-media">
                <div
                  className="split-image"
                  role="img"
                  aria-label="Budget planning with currency and calculator"
                  style={{
                    backgroundImage:
                      "url('https://www.adobe.com/acrobat/guides/media_1d8e61a7e3a9fc57c7a5c619819e21473166bbbae.jpg?width=750&format=jpg&optimize=medium')"
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="community"
          className="lp-section lp-section-bg"
          style={{
            backgroundImage:
              "url('https://visitinpakistan.com/wp-content/uploads/2024/04/Discovering-Pakistan-Top-Tourist-Attractions.jpg ')"
          }}
        >
          <div className="lp-section-bg-overlay" />
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-section-head lp-section-head-center">
              <div className="lp-eyebrow">Why Choose Us?</div>
              <h2 className="lp-h2">A calmer way to plan. A better way to travel.</h2>
              <p className="lp-p">
                Built for real Pakistan travel — flexible itineraries, grounded budgets, and tools that keep planning simple.
              </p>
            </motion.div>

            <div className="lp-feature-grid">
              {/* Card 1 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <MapPin className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Pakistan-first</div>
                </div>
                <div className="lp-feature-text">Curated destination insights built around local travel realities.</div>
              </motion.div>

              {/* Card 2 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <Bot className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Practical AI</div>
                </div>
                <div className="lp-feature-text">Buddy Bot helps you structure plans without fluff or hallucinations.</div>
              </motion.div>

              {/* Card 3 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <Wallet className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Smart Budget</div>
                </div>
                <div className="lp-feature-text">Hybrid estimation with clear breakdowns and manual control.</div>
              </motion.div>

              {/* Card 4 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <Users className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Group Ready</div>
                </div>
                <div className="lp-feature-text">Plan trips with friends and families — and keep the math simple.</div>
              </motion.div>

              {/* Card 5 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <ShieldCheck className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Reliable UX</div>
                </div>
                <div className="lp-feature-text">Clear UX, predictable flows, and resilient calculations.</div>
              </motion.div>

              {/* Card 6 */}
              <motion.div {...motionInView} whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.18 }} className="lp-feature-card">
                <div className="lp-feature-header">
                  <Sparkles className="lp-feature-icon" aria-hidden="true" />
                  <div className="lp-feature-title">Premium Feel</div>
                </div>
                <div className="lp-feature-text">A polished landing experience — made to feel trustworthy.</div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-cta">
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-cta-inner">
              <div>
                <h2 className="lp-h2">Start your journey today.</h2>
                <p className="lp-p">Create an account to unlock planning tools, smart budgets, and AI guidance.</p>
              </div>
              <div className="lp-cta-actions">
                <Link to="/register" className="lp-btn lp-btn-solid lp-btn-lg">
                  Start Your Journey
                </Link>
                <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">
                  Login
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section
          className="lp-parallax"
          style={{
            backgroundImage:
              "url('https://inerun.com/img/destination-marketing.jpg')"
          }}
        >
          <div className="lp-parallax-overlay" />
          <div className="lp-shell">
            <motion.div {...motionInView} className="lp-quote">
              <div className="lp-quote-mark">“</div>
              <div className="lp-quote-text">Travel is the only thing you buy that makes you richer.</div>
              <div className="lp-quote-mark">”</div>
            </motion.div>
          </div>
        </section>
      </main>

  

      <footer className="lp-footer">
        <div className="lp-shell">
          <div className="lp-footer-grid">
            <div className="lp-footer-col">
              <div className="lp-footer-brand">
                <img src="/logo/main_logo.jpeg" alt="Smart Travel Planner" className="lp-logo-footer" />
                <span className="lp-footer-brand-text">Smart Travel Planner</span>
              </div>
              <div className="lp-footer-text">
                A Pakistan-first travel platform for calmer planning — discover destinations, build itineraries, and budget with
                confidence.
              </div>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-title">Quick Links</div>
              <button type="button" className="lp-footer-link" onClick={() => scrollToId('destinations')}>
                Destinations
              </button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToId('ai-planner')}>
                AI Planner
              </button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToId('budget')}>
                Budget
              </button>
              <button type="button" className="lp-footer-link" onClick={() => scrollToId('community')}>
                Community
              </button>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-title">Resources</div>
              <a className="lp-footer-link" href="#" onClick={(e) => e.preventDefault()}>
                Blog
              </a>
              <a className="lp-footer-link" href="#" onClick={(e) => e.preventDefault()}>
                Travel Guide
              </a>
              <a className="lp-footer-link" href="#" onClick={(e) => e.preventDefault()}>
                FAQs
              </a>
            </div>

            <div className="lp-footer-col">
              <div className="lp-footer-title">Socials</div>
              <div className="lp-social-row" aria-label="Social links">
                <a
                  className="lp-social-link lp-social-instagram"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Instagram"
                >
                  <Instagram className="lp-social-icon" aria-hidden="true" />
                </a>
                <a className="lp-social-link lp-social-x" href="#" onClick={(e) => e.preventDefault()} aria-label="X">
                  <Twitter className="lp-social-icon" aria-hidden="true" />
                </a>
                <a
                  className="lp-social-link lp-social-linkedin"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-label="LinkedIn"
                >
                  <Linkedin className="lp-social-icon" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div className="lp-footer-meta">© {new Date().getFullYear()} Smart Travel Planner. All rights reserved.</div>
            <div className="lp-footer-meta">Made with ❤️ for Pakistan travel.</div>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className={`lp-scroll-indicator ${isScrolled ? 'lp-scroll-indicator-show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <svg className="lp-scroll-ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle className="lp-scroll-ring-track" cx="24" cy="24" r="20" />
          <circle
            className="lp-scroll-ring-progress"
            cx="24"
            cy="24"
            r="20"
            style={{
              strokeDasharray: `${2 * Math.PI * 20}`,
              strokeDashoffset: `${(1 - scrollProgress) * 2 * Math.PI * 20}`
            }}
          />
        </svg>
        <span className="lp-scroll-icon" aria-hidden="true">
          <ArrowUp size={18} />
        </span>
      </button>
    </div>
  );
};

export default LandingPage;