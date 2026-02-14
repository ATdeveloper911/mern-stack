import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FaHeart, FaBars, FaTimes } from 'react-icons/fa';
import { useState } from 'react';

const LandingLayout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { toggleTheme, theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Features', href: '#features' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (href) => {
    if (href === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blood-600 rounded-full flex items-center justify-center">
                <FaHeart className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-neutral-900">BloodLink</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="text-neutral-600 hover:text-blood-600 transition-colors duration-200"
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-neutral-600">
                    Welcome, {user?.firstName}
                  </span>
                  <Link
                    to="/dashboard"
                    className="btn btn-primary"
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="text-neutral-600 hover:text-blood-600 transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/register"
                    className="btn btn-primary"
                  >
                    Get Started
                  </Link>
                </>
              )}
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors duration-200"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-neutral-200">
              <div className="flex flex-col space-y-4">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="text-neutral-600 hover:text-blood-600 transition-colors duration-200 text-left"
                  >
                    {item.name}
                  </button>
                ))}
                
                <div className="pt-4 border-t border-neutral-200">
                  {isAuthenticated ? (
                    <div className="flex flex-col space-y-2">
                      <span className="text-neutral-600 text-sm">
                        Welcome, {user?.firstName}
                      </span>
                      <Link
                        to="/dashboard"
                        className="btn btn-primary w-full"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Link
                        to="/auth/login"
                        className="text-neutral-600 hover:text-blood-600 transition-colors duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/auth/register"
                        className="btn btn-primary w-full"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </div>
                  )}
                  
                  {/* Mobile Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="mt-2 p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors duration-200 w-full"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default LandingLayout;
