import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FaHeart, 
  FaUsers, 
  FaShieldAlt, 
  FaChartLine, 
  FaMobileAlt,
  FaGlobe,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaPlay,
  FaStar,
  FaQuoteLeft,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope
} from 'react-icons/fa';

const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { getGradientClasses, getAnimationClasses } = useTheme();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Dr. Sarah Ahmed",
      role: "Emergency Physician",
      hospital: "Aga Khan Hospital",
      content: "BloodLink has revolutionized our emergency response. We can now find compatible donors within minutes, saving countless lives.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 2,
      name: "Ahmed Hassan",
      role: "Blood Donor",
      location: "Karachi",
      content: "I've donated blood 5 times through BloodLink. The process is so smooth and I know I'm making a real difference.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 3,
      name: "Fatima Khan",
      role: "Patient's Family",
      location: "Lahore",
      content: "When my father needed urgent blood, BloodLink connected us with a donor in just 30 minutes. Truly life-saving!",
      rating: 5,
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    }
  ];

  // Statistics data
  const stats = [
    { number: "10,000+", label: "Lives Saved", icon: FaHeart },
    { number: "50,000+", label: "Active Donors", icon: FaUsers },
    { number: "500+", label: "Partner Hospitals", icon: FaShieldAlt },
    { number: "99.9%", label: "Success Rate", icon: FaCheckCircle }
  ];

  // Features data
  const features = [
    {
      icon: FaClock,
      title: "Real-time Matching",
      description: "Find compatible donors instantly with our advanced matching algorithm"
    },
    {
      icon: FaShieldAlt,
      title: "Verified Donors",
      description: "All donors are medically verified and background checked for safety"
    },
    {
      icon: FaMobileAlt,
      title: "Mobile First",
      description: "Access BloodLink anywhere, anytime with our responsive mobile app"
    },
    {
      icon: FaChartLine,
      title: "Analytics Dashboard",
      description: "Track your impact and view detailed statistics of your contributions"
    }
  ];

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background with gradient */}
        <div className={`absolute inset-0 ${getGradientClasses().blood}`} />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 hero-pattern opacity-20" />
        
        {/* Floating hearts animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            >
              <FaHeart className="text-2xl" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-shadow-lg">
              🩸 BloodLink
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-shadow">
              Connecting Lives Through Blood Donation
            </p>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-shadow">
              Join thousands of heroes who are saving lives every day. 
              Find donors instantly, donate safely, and make a real difference in your community.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn btn-lg bg-white text-blood-600 hover:bg-neutral-100 transform hover:scale-105 transition-all duration-200"
                >
                  Go to Dashboard
                  <FaArrowRight className="ml-2" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/register"
                    className="btn btn-lg bg-white text-blood-600 hover:bg-neutral-100 transform hover:scale-105 transition-all duration-200"
                  >
                    Become a Donor
                    <FaHeart className="ml-2" />
                  </Link>
                  <Link
                    to="/auth/login"
                    className="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-blood-600 transform hover:scale-105 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Play button for demo video */}
            <div className="mt-8">
              <button className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 transform hover:scale-110">
                <FaPlay className="text-white text-xl ml-1" />
              </button>
              <p className="text-sm mt-2 opacity-80">Watch Demo</p>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
          </div>
        </motion.div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blood-100 rounded-full mb-4">
                  <stat.icon className="text-blood-600 text-2xl" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-blood-600 mb-2">
                  {stat.number}
                </h3>
                <p className="text-neutral-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              Why Choose BloodLink?
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              We've built the most advanced blood donation platform with cutting-edge technology 
              and a focus on saving lives.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="card p-8 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blood-100 rounded-full mb-6">
                  <feature.icon className="text-blood-600 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Getting started with BloodLink is simple. Follow these easy steps to begin saving lives.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Register & Verify",
                description: "Create your account and complete medical verification to ensure safety.",
                icon: "👤"
              },
              {
                step: "02",
                title: "Get Matched",
                description: "Our AI instantly matches you with compatible blood requests in your area.",
                icon: "🔍"
              },
              {
                step: "03",
                title: "Save Lives",
                description: "Respond to requests, donate safely, and track your life-saving impact.",
                icon: "❤️"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blood-600 text-white rounded-full text-2xl font-bold mb-4">
                    {step.step}
                  </div>
                  <div className="text-4xl mb-4">{step.icon}</div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-neutral-600">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              About BloodLink
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              We're on a mission to save lives by connecting blood donors with those in need, 
              making the process simple, fast, and reliable.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                Our Mission
              </h3>
              <p className="text-neutral-600 mb-6">
                BloodLink was created to address the critical shortage of blood donations 
                and the difficulty in finding compatible donors during emergencies. We believe 
                that no one should lose their life due to a lack of blood availability.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FaCheckCircle className="text-blood-600 text-xl" />
                  <span className="text-neutral-700">Real-time donor matching</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FaCheckCircle className="text-blood-600 text-xl" />
                  <span className="text-neutral-700">Verified medical records</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FaCheckCircle className="text-blood-600 text-xl" />
                  <span className="text-neutral-700">Emergency response system</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blood-50 to-blood-100 p-8 rounded-2xl"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-blood-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaHeart className="text-white text-3xl" />
                </div>
                <h4 className="text-xl font-bold text-neutral-900 mb-4">
                  Join Our Community
                </h4>
                <p className="text-neutral-600 mb-6">
                  Be part of a community that saves lives every day. Your donation 
                  could be the difference between life and death for someone in need.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blood-600">500+</div>
                    <div className="text-sm text-neutral-600">Lives Saved</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blood-600">1000+</div>
                    <div className="text-sm text-neutral-600">Active Donors</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-neutral-50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              What People Say
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Hear from the heroes who are making a difference in their communities.
            </p>
          </motion.div>

          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="card p-8 md:p-12 text-center">
              <FaQuoteLeft className="text-blood-600 text-4xl mb-6 mx-auto" />
              
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-xl md:text-2xl text-neutral-700 mb-8 italic">
                  "{testimonials[currentTestimonial].content}"
                </p>
                
                <div className="flex items-center justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 text-xl" />
                  ))}
                </div>
                
                <div className="flex items-center justify-center">
                  <img
                    src={testimonials[currentTestimonial].image}
                    alt={testimonials[currentTestimonial].name}
                    className="w-16 h-16 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-neutral-900">
                      {testimonials[currentTestimonial].name}
                    </h4>
                    <p className="text-neutral-600">
                      {testimonials[currentTestimonial].role}
                      {testimonials[currentTestimonial].hospital && (
                        <span> • {testimonials[currentTestimonial].hospital}</span>
                      )}
                      {testimonials[currentTestimonial].location && (
                        <span> • {testimonials[currentTestimonial].location}</span>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial indicators */}
              <div className="flex justify-center mt-8 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentTestimonial ? 'bg-blood-600' : 'bg-neutral-300'
                    }`}
                    onClick={() => setCurrentTestimonial(index)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              Ready to Save Lives?
            </h2>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              Join thousands of heroes who are making a difference. Every donation counts, 
              every life matters.
            </p>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/auth/register"
                  className="btn btn-lg btn-primary transform hover:scale-105 transition-all duration-200"
                >
                  Start Saving Lives Today
                  <FaHeart className="ml-2" />
                </Link>
                <Link
                  to="/auth/login"
                  className="btn btn-lg btn-outline transform hover:scale-105 transition-all duration-200"
                >
                  Sign In
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              Get in Touch
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Have questions? Need help? We're here to assist you every step of the way.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">
                Contact Information
              </h3>
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                    <FaPhone className="text-blood-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Phone</h4>
                    <p className="text-neutral-600">+92 300 123 4567</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                    <FaEnvelope className="text-blood-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Email</h4>
                    <p className="text-neutral-600">support@bloodlink.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                    <FaMapMarkerAlt className="text-blood-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Address</h4>
                    <p className="text-neutral-600">Karachi, Pakistan</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-neutral-50 p-8 rounded-2xl"
            >
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">
                Send us a Message
              </h3>
              <form className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Your Email"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Your Message"
                    rows={4}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blood-600 text-white py-3 px-6 rounded-lg hover:bg-blood-700 transition-colors duration-200 font-medium"
                >
                  Send Message
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">🩸 BloodLink</h3>
              <p className="text-neutral-400 mb-4">
                Connecting lives through blood donation. Making a difference, one drop at a time.
              </p>
              <div className="flex space-x-4">
                <FaGlobe className="text-2xl text-neutral-400 hover:text-white cursor-pointer transition-colors" />
                <FaMobileAlt className="text-2xl text-neutral-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/auth/register" className="hover:text-white transition-colors">Become a Donor</Link></li>
                <li><Link to="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><a href="#help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-neutral-400">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2" />
                  <span>Karachi, Pakistan</span>
                </div>
                <div className="flex items-center">
                  <FaPhone className="mr-2" />
                  <span>+92 300 1234567</span>
                </div>
                <div className="flex items-center">
                  <FaEnvelope className="mr-2" />
                  <span>info@bloodlink.com</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 mt-12 pt-8 text-center text-neutral-400">
            <p>&copy; 2024 BloodLink. All rights reserved. Made with ❤️ for saving lives.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
