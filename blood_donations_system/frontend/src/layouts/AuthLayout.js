import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaHeart, FaArrowLeft } from 'react-icons/fa';

const AuthLayout = ({ children }) => {
  const { getGradientClasses } = useTheme();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 ${getGradientClasses().blood} relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 hero-pattern opacity-20" />
        
        {/* Floating Hearts */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white opacity-20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <FaHeart className="text-2xl" />
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-start items-center text-white p-12 pt-20">
          <div className="text-center max-w-lg mx-auto transform translate-x-8 md:translate-x-12">
            {/* Animated Logo */}
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-8 mx-auto animate-pulse">
              <FaHeart className="text-4xl" />
            </div>
            
            {/* Main Title */}
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              🩸 BloodLink
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              Connecting Lives Through Blood Donation
            </p>
            
            {/* Features List */}
            <div className="space-y-4 text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold mb-4 text-center">Why Choose BloodLink?</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-3 group">
                  <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                  <span className="group-hover:text-white/90 transition-colors duration-200">Real-time donor matching</span>
                </div>
                <div className="flex items-center justify-center space-x-3 group">
                  <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                  <span className="group-hover:text-white/90 transition-colors duration-200">Verified medical profiles</span>
                </div>
                <div className="flex items-center justify-center space-x-3 group">
                  <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                  <span className="group-hover:text-white/90 transition-colors duration-200">Emergency response system</span>
                </div>
                <div className="flex items-center justify-center space-x-3 group">
                  <div className="w-2 h-2 bg-white rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                  <span className="group-hover:text-white/90 transition-colors duration-200">Life-saving impact tracking</span>
                </div>
              </div>
            </div>
            
            {/* Call to Action */}
            <div className="mt-8 text-center">
              <p className="text-sm opacity-75 mb-4">
                Join thousands of life-savers
              </p>
              <div className="flex justify-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold">500+</div>
                  <div className="opacity-75">Lives Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">1000+</div>
                  <div className="opacity-75">Active Donors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Mobile Header */}
        <div className="lg:hidden text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-blood-600 hover:text-blood-700 transition-colors">
            <FaArrowLeft className="text-sm" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Desktop Back Button */}
        <div className="hidden lg:block absolute top-8 left-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-blood-600 hover:text-blood-700 transition-colors">
            <FaArrowLeft className="text-sm" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Auth Content */}
        <div className="max-w-md mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
