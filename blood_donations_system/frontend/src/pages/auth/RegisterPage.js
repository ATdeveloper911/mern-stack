import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FaEye, FaEyeSlash, FaHeart, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';

const RegisterPage = () => {
  const { register, isRegistering } = useAuth();
  const { getGradientClasses } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'donor',
    bloodType: '',
    dateOfBirth: '',
    gender: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Pakistan'
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    medicalHistory: {
      hasChronicDisease: false,
      hasInfectiousDisease: false,
      hasBloodDisorder: false,
      isPregnant: false,
      isBreastfeeding: false,
      recentSurgery: false,
      recentVaccination: false,
      medications: '',
      allergies: '',
      lastDonationDate: ''
    },
    agreeToTerms: false,
    agreeToPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const [systemAdminExists, setSystemAdminExists] = useState(false);
  const roles = [
    { value: 'donor', label: 'Blood Donor', description: 'I want to donate blood and save lives' },
    { value: 'recipient', label: 'Recipient', description: 'I may need blood donations in the future' },
    { value: 'system_admin', label: 'System Administrator', description: 'I will manage the blood donation system' }
  ];

  // Fetch whether system admin exists (public endpoint)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await userAPI.systemAdminExists();
        const exists = res?.data?.data?.exists === true;
        if (mounted) setSystemAdminExists(exists);
        // If admin exists and role currently selected is system_admin, reset to donor
        if (exists && formData.role === 'system_admin') {
          setFormData(prev => ({ ...prev, role: 'donor' }));
        }
      } catch (e) {
        // Silent fail - default to showing options
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email is invalid';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (formData.phone.length < 10) {
          newErrors.phone = 'Phone number must be at least 10 digits';
        }
        if (!formData.role) newErrors.role = 'Please select your role';
        break;
      
      case 2:
        if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
        if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
        if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
        if (!formData.address.zipCode.trim()) newErrors['address.zipCode'] = 'Zip code is required';
        if (!formData.emergencyContact.name.trim()) newErrors['emergencyContact.name'] = 'Emergency contact name is required';
        if (!formData.emergencyContact.phone.trim()) {
          newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
        } else if (formData.emergencyContact.phone.length < 10) {
          newErrors['emergencyContact.phone'] = 'Emergency contact phone must be at least 10 digits';
        }
        if (!formData.emergencyContact.relationship.trim()) newErrors['emergencyContact.relationship'] = 'Emergency contact relationship is required';
        break;
      
      case 3:
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      
      case 4:
        if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
        if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = 'You must agree to the privacy policy';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      await register(formData);
      // Navigation is handled in the auth context
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Personal Information</h3>
              <p className="text-neutral-600">Tell us about yourself</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Enter your first name"
                  disabled={isRegistering}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Enter your last name"
                  disabled={isRegistering}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your email"
                disabled={isRegistering}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your phone number"
                disabled={isRegistering}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                I want to be a *
              </label>
              <div className="space-y-3">
                {roles
                  .filter(r => r.value !== 'system_admin' || !systemAdminExists)
                  .map((role) => (
                  <label key={role.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleChange}
                      className="mt-1"
                      disabled={isRegistering}
                    />
                    <div>
                      <div className="font-medium text-neutral-900">{role.label}</div>
                      <div className="text-sm text-neutral-600">{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Medical & Location Information</h3>
              <p className="text-neutral-600">Help us match you with the right opportunities and provide your contact details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Blood Type *
                </label>
                <select
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.bloodType ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  disabled={isRegistering}
                >
                  <option value="">Select your blood type</option>
                  {bloodTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.bloodType && <p className="mt-1 text-sm text-red-600">{errors.bloodType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  disabled={isRegistering}
                />
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gender *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Male', 'Female', 'Other'].map(gender => (
                  <label key={gender} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      name="gender"
                      value={gender.toLowerCase()}
                      checked={formData.gender === gender.toLowerCase()}
                      onChange={handleChange}
                      disabled={isRegistering}
                    />
                    <span>{gender}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                  errors['address.street'] ? 'border-red-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your street address"
                disabled={isRegistering}
              />
              {errors['address.street'] && <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors['address.city'] ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Enter your city"
                  disabled={isRegistering}
                />
                {errors['address.city'] && <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors['address.state'] ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Enter your state"
                  disabled={isRegistering}
                />
                {errors['address.state'] && <p className="mt-1 text-sm text-red-600">{errors['address.state']}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Zip Code *
              </label>
              <input
                type="text"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                  errors['address.zipCode'] ? 'border-red-500' : 'border-neutral-300'
                }`}
                placeholder="Enter your zip code"
                disabled={isRegistering}
              />
              {errors['address.zipCode'] && <p className="mt-1 text-sm text-red-600">{errors['address.zipCode']}</p>}
            </div>

            <div className="border-t pt-6 mt-6">
              <h4 className="text-lg font-semibold text-neutral-900 mb-4">Emergency Contact</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                      errors['emergencyContact.name'] ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Enter emergency contact name"
                    disabled={isRegistering}
                  />
                  {errors['emergencyContact.name'] && <p className="mt-1 text-sm text-red-600">{errors['emergencyContact.name']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                      errors['emergencyContact.phone'] ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Enter emergency contact phone"
                    disabled={isRegistering}
                  />
                  {errors['emergencyContact.phone'] && <p className="mt-1 text-sm text-red-600">{errors['emergencyContact.phone']}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Relationship *
                </label>
                <input
                  type="text"
                  name="emergencyContact.relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors['emergencyContact.relationship'] ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="e.g., Father, Mother, Spouse, Sibling"
                  disabled={isRegistering}
                />
                {errors['emergencyContact.relationship'] && <p className="mt-1 text-sm text-red-600">{errors['emergencyContact.relationship']}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Security</h3>
              <p className="text-neutral-600">Create a secure password</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Create a strong password"
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isRegistering}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              
              {/* Password strength indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          formData.password.length >= level * 2
                            ? formData.password.length >= 8
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Password strength: {formData.password.length >= 8 ? 'Strong' : 'Weak'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isRegistering}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              
              {/* Password match indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center space-x-2">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <FaCheck className="text-green-500" />
                      <span className="text-sm text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <FaTimes className="text-red-500" />
                      <span className="text-sm text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Terms & Conditions</h3>
              <p className="text-neutral-600">Please review and accept our terms</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1"
                  disabled={isRegistering}
                />
                <span className="text-sm text-neutral-600">
                  I agree to the{' '}
                  <a href="#terms" className="text-blood-600 hover:text-blood-700">
                    Terms of Service
                  </a>{' '}
                  and understand that I am responsible for providing accurate medical information.
                </span>
              </label>
              {errors.agreeToTerms && <p className="text-sm text-red-600">{errors.agreeToTerms}</p>}

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleChange}
                  className="mt-1"
                  disabled={isRegistering}
                />
                <span className="text-sm text-neutral-600">
                  I agree to the{' '}
                  <a href="#privacy" className="text-blood-600 hover:text-blood-700">
                    Privacy Policy
                  </a>{' '}
                  and consent to the processing of my personal data for the purpose of blood donation matching.
                </span>
              </label>
              {errors.agreeToPrivacy && <p className="text-sm text-red-600">{errors.agreeToPrivacy}</p>}
            </div>

            <div className="p-4 bg-blood-50 rounded-lg">
              <h4 className="font-medium text-blood-800 mb-2">Important Medical Information</h4>
              <ul className="text-sm text-blood-700 space-y-1">
                <li>• You must be at least 18 years old to donate blood</li>
                <li>• You must weigh at least 50kg (110 lbs)</li>
                <li>• You must be in good health and free from infectious diseases</li>
                <li>• You must not have donated blood in the last 56 days</li>
                <li>• You must provide accurate medical history</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-blood-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <FaHeart className="text-blood-600 text-2xl" />
        </motion.div>
        
        <h2 className="text-3xl font-bold text-neutral-900 mb-2">
          Join BloodLink
        </h2>
        <p className="text-neutral-600">
          Become a hero and save lives today
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-neutral-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <motion.div
            className="bg-blood-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Form */}
      <motion.form
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isRegistering}
            className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isRegistering}
              className="px-6 py-3 bg-blood-600 text-white rounded-lg hover:bg-blood-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <motion.button
              type="submit"
              disabled={isRegistering}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
                isRegistering
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : `${getGradientClasses().blood} text-white hover:shadow-lg transform hover:scale-105`
              }`}
              whileHover={!isRegistering ? { scale: 1.02 } : {}}
              whileTap={!isRegistering ? { scale: 0.98 } : {}}
            >
              {isRegistering ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </motion.button>
          )}
        </div>
      </motion.form>

      {/* Sign In Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-center mt-8"
      >
        <p className="text-neutral-600">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="text-blood-600 hover:text-blood-700 font-medium transition-colors"
          >
            Sign in here
          </Link>
        </p>
      </motion.div>

      {/* Back to Home Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-center mt-4"
      >
        <Link
          to="/"
          className="inline-flex items-center text-neutral-500 hover:text-neutral-700 text-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default RegisterPage;
