import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaDownload,
  FaUserMd,
  FaUser,
  FaUserShield,
  FaHeart,
  FaHandHoldingHeart,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaLock
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

const UserManagement = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  // Check roles early - needed for queries and rendering
  // Use direct role check to ensure accuracy
  const isMedicalAdmin = user?.role === 'medical_admin';
  const isSystemAdmin = user?.role === 'system_admin';
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Fetch users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery(
    ['users', { searchTerm, roleFilter, statusFilter, sortBy, sortOrder, page: currentPage }],
    async () => {
      console.log('Making API call to get users...');
      const params = {
        search: searchTerm,
        role: roleFilter !== 'all' ? roleFilter : undefined, // Medical admin can view all users
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 10
      };
      console.log('API params:', params);
      const response = await adminAPI.getUsers(params);
      console.log('API response:', response);
      console.log('API response.data:', response.data);
      // Axios returns response object, extract the data property
      return response.data;
    },
    {
      enabled: true,
      retry: 1,
      onError: (error) => {
        console.error('Users query error:', error);
        toast.error(`Failed to load users: ${error?.response?.data?.message || error.message}`);
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => adminAPI.deleteUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowDeleteModal(false);
        setSelectedUser(null);
      },
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ userId, userData }) => adminAPI.updateUser(userId, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowEditModal(false);
        setEditingUser(null);
      },
    }
  );

  // Create user mutation
  const createUserMutation = useMutation(
    (userData) => adminAPI.createUser(userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowAddUserModal(false);
        toast.success('User created successfully');
      },
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to create user';
        const errors = error?.response?.data?.errors;
        if (errors && Array.isArray(errors) && errors.length) {
          const first = errors[0];
          toast.error(`${message}: ${first.field || ''} ${first.message || ''}`.trim());
        } else {
          toast.error(message);
        }
      }
    }
  );

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination || {};
  const totalPages = pagination.totalPages || pagination.pages || (pagination.total && pagination.limit ? Math.ceil(pagination.total / pagination.limit) : 1);

  // Debug logging
  console.log('UserManagement Debug:', {
    usersData,
    users,
    pagination,
    totalPages,
    usersLoading,
    searchTerm,
    roleFilter,
    statusFilter
  });

  // Get role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case 'system_admin':
        return FaUserShield;
      case 'medical_admin':
        return FaUserMd;
      case 'donor':
        return FaHeart;
      case 'recipient':
        return FaHandHoldingHeart;
      default:
        return FaUser;
    }
  };

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'system_admin':
        return 'bg-red-100 text-red-800';
      case 'medical_admin':
        return 'bg-blue-100 text-blue-800';
      case 'donor':
        return 'bg-green-100 text-green-800';
      case 'recipient':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get user status based on user properties
  const getUserStatus = (user) => {
    if (user.isBlocked) return 'suspended';
    if (!user.isEmailVerified) return 'pending';
    if (user.isActive === false) return 'inactive';
    return 'active';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortBy !== field) return FaSort;
    return sortOrder === 'asc' ? FaSortUp : FaSortDown;
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // Handle delete user
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Handle view user - fetch full user details
  const handleViewUser = async (user) => {
    try {
      // Fetch full user details from API to ensure we have all nested data
      const response = await adminAPI.getUser(user._id);
      setSelectedUser(response.data.data.user);
      setShowUserModal(true);
    } catch (error) {
      // If API call fails, use the user from table
      console.error('Failed to fetch user details:', error);
      setSelectedUser(user);
      setShowUserModal(true);
    }
  };

  // Handle update user
  const handleUpdateUser = (userData) => {
    updateUserMutation.mutate({
      userId: editingUser._id,
      userData
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    deleteUserMutation.mutate(selectedUser._id);
  };

  // Handle block/unblock user
  const handleBlockUser = (user) => {
    const isBlocked = !user.isBlocked;
    adminAPI.blockUser(user._id, { 
      isBlocked, 
      reason: isBlocked ? 'Blocked by admin' : 'Unblocked by admin' 
    }).then(() => {
      queryClient.invalidateQueries('users');
    });
  };

  // Handle role change
  const handleRoleChange = (user, newRole) => {
    adminAPI.changeUserRole(user._id, { 
      role: newRole, 
      reason: `Role changed to ${newRole}` 
    }).then(() => {
      queryClient.invalidateQueries('users');
    });
  };

  // Handle password reset
  const handlePasswordReset = (user) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (newPassword && newPassword.length >= 6) {
      adminAPI.resetUserPassword(user._id, { 
        newPassword, 
        reason: 'Password reset by admin' 
      }).then(() => {
        alert('Password reset successfully');
      });
    }
  };

  // Handle export users
  const handleExportUsers = () => {
    adminAPI.exportUsers({
      search: searchTerm,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sortBy,
      sortOrder
    }).then((response) => {
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  // Handle add user
  const handleAddUser = () => {
    setShowAddUserModal(true);
  };

  if (usersLoading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  if (usersError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load users</div>
          <div className="text-neutral-600 mb-4">
            {usersError?.response?.data?.message || usersError?.message || 'Unknown error'}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {isMedicalAdmin ? 'User Verification' : 'User Management'}
          </h1>
          <p className="text-neutral-600 mt-1">
            {isMedicalAdmin 
              ? 'View and verify medical eligibility of users'
              : 'Manage users, roles, and permissions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {isSystemAdmin && (
            <>
              <button 
                onClick={handleExportUsers}
                className="btn btn-outline flex items-center space-x-2"
              >
                <FaDownload />
                <span>Export Users</span>
              </button>
              
              <button 
                onClick={handleAddUser}
                className="btn btn-primary flex items-center space-x-2"
              >
                <FaPlus />
                <span>Add User</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="system_admin">System Admin</option>
              <option value="medical_admin">Medical Admin</option>
              <option value="donor">Donor</option>
              <option value="recipient">Recipient</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Sort By
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Blood Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Joined
                </th>
                {isSystemAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Change Role
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={isSystemAdmin ? 7 : 6} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center">
                      <FaUsers className="h-12 w-12 text-neutral-300 mb-4" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  
                  return (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-neutral-50"
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blood-100 flex items-center justify-center">
                            <RoleIcon className="h-5 w-5 text-blood-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(getUserStatus(user))}>
                        {getUserStatus(user)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {user.bloodType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    {isSystemAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="text-sm border border-neutral-300 rounded px-2 py-1 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                          disabled={user.role === 'system_admin' && user._id !== user._id}
                        >
                          <option value="donor">Donor</option>
                          <option value="recipient">Recipient</option>
                          <option value="medical_admin">Medical Admin</option>
                          <option value="system_admin">System Admin</option>
                        </select>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View User"
                        >
                          <FaEye />
                        </button>
                        {isSystemAdmin && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Edit User"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleBlockUser(user)}
                              className={`p-1 ${user.isBlocked ? 'text-green-600 hover:text-green-900' : 'text-yellow-600 hover:text-yellow-900'}`}
                              title={user.isBlocked ? 'Unblock User' : 'Block User'}
                            >
                              {user.isBlocked ? <FaCheckCircle /> : <FaTimesCircle />}
                            </button>
                            <button
                              onClick={() => handlePasswordReset(user)}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="Reset Password"
                            >
                              <FaLock />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete User"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                        {/* Medical Admin: View only - no actions */}
                      </div>
                    </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-neutral-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* View User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="xl"
      >
        {selectedUser && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 pb-4 border-b border-neutral-200">
              <div className="h-16 w-16 rounded-full bg-blood-100 flex items-center justify-center">
                {selectedUser.profilePicture ? (
                  <img 
                    src={selectedUser.profilePicture} 
                    alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  React.createElement(getRoleIcon(selectedUser.role), {
                    className: "h-8 w-8 text-blood-600"
                  })
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-neutral-600">{selectedUser.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getRoleColor(selectedUser.role)}>
                    {selectedUser.role.replace('_', ' ')}
                  </Badge>
                  <Badge className={getStatusColor(getUserStatus(selectedUser))}>
                    {getUserStatus(selectedUser)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">First Name</label>
                  <p className="text-sm text-neutral-900">{selectedUser.firstName}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Last Name</label>
                  <p className="text-sm text-neutral-900">{selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
                  <p className="text-sm text-neutral-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Phone</label>
                  <p className="text-sm text-neutral-900">{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Date of Birth</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Age</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.dateOfBirth ? 
                      Math.floor((new Date() - new Date(selectedUser.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : '-'} years
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Gender</label>
                  <p className="text-sm text-neutral-900 capitalize">{selectedUser.gender || '-'}</p>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">Medical Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Blood Type</label>
                  <p className="text-sm text-neutral-900 font-medium">{selectedUser.bloodType || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Weight</label>
                  <p className="text-sm text-neutral-900">{selectedUser.weight ? `${selectedUser.weight} kg` : '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Height</label>
                  <p className="text-sm text-neutral-900">{selectedUser.height ? `${selectedUser.height} cm` : '-'}</p>
                </div>
                {selectedUser.weight && selectedUser.height && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">BMI</label>
                    <p className="text-sm text-neutral-900">
                      {((selectedUser.weight / Math.pow(selectedUser.height / 100, 2))).toFixed(1)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Medical Verified</label>
                  <Badge className={selectedUser.isMedicalVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {selectedUser.isMedicalVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Medical History */}
            {selectedUser.medicalHistory && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-3">Medical History</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Total Donations</label>
                    <p className="text-sm text-neutral-900">{selectedUser.medicalHistory?.totalDonations || 0}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Last Donation</label>
                    <p className="text-sm text-neutral-900">
                      {selectedUser.medicalHistory?.lastDonationDate ? 
                        new Date(selectedUser.medicalHistory.lastDonationDate).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Diabetes</label>
                    <Badge className={selectedUser.medicalHistory?.hasDiabetes ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasDiabetes ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Hypertension</label>
                    <Badge className={selectedUser.medicalHistory?.hasHypertension ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasHypertension ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Heart Disease</label>
                    <Badge className={selectedUser.medicalHistory?.hasHeartDisease ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasHeartDisease ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Cancer</label>
                    <Badge className={selectedUser.medicalHistory?.hasCancer ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasCancer ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Hepatitis</label>
                    <Badge className={selectedUser.medicalHistory?.hasHepatitis ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasHepatitis ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">HIV</label>
                    <Badge className={selectedUser.medicalHistory?.hasHIV ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasHIV ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Tuberculosis</label>
                    <Badge className={selectedUser.medicalHistory?.hasTuberculosis ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasTuberculosis ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Epilepsy</label>
                    <Badge className={selectedUser.medicalHistory?.hasEpilepsy ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasEpilepsy ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Asthma</label>
                    <Badge className={selectedUser.medicalHistory?.hasAsthma ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasAsthma ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Allergies</label>
                    <Badge className={selectedUser.medicalHistory?.hasAllergies ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                      {selectedUser.medicalHistory?.hasAllergies ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {selectedUser.medicalHistory?.allergiesDescription && (
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Allergies Description</label>
                      <p className="text-sm text-neutral-900">{selectedUser.medicalHistory.allergiesDescription}</p>
                    </div>
                  )}
                  {selectedUser.medicalHistory?.medications && selectedUser.medicalHistory.medications.length > 0 && (
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Medications</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.medicalHistory.medications.map((med, idx) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-800">{med}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address Information */}
            {selectedUser.address && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-3">Address Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Street</label>
                    <p className="text-sm text-neutral-900">{selectedUser.address.street || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">City</label>
                    <p className="text-sm text-neutral-900">{selectedUser.address.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">State</label>
                    <p className="text-sm text-neutral-900">{selectedUser.address.state || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
                    <p className="text-sm text-neutral-900">{selectedUser.address.country || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Postal Code</label>
                    <p className="text-sm text-neutral-900">{selectedUser.address.postalCode || '-'}</p>
                  </div>
                  {selectedUser.address.coordinates && selectedUser.address.coordinates.coordinates && (
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Coordinates</label>
                      <p className="text-sm text-neutral-900">
                        {selectedUser.address.coordinates.coordinates[1]?.toFixed(4)}, {selectedUser.address.coordinates.coordinates[0]?.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {selectedUser.emergencyContact && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
                    <p className="text-sm text-neutral-900">{selectedUser.emergencyContact.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Phone</label>
                    <p className="text-sm text-neutral-900">{selectedUser.emergencyContact.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Relationship</label>
                    <p className="text-sm text-neutral-900 capitalize">{selectedUser.emergencyContact.relationship || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">Verification Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Email Verified</label>
                  <Badge className={selectedUser.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedUser.isEmailVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Phone Verified</label>
                  <Badge className={selectedUser.isPhoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedUser.isPhoneVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Medical Verified</label>
                  <Badge className={selectedUser.isMedicalVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {selectedUser.isMedicalVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Account Status</label>
                  <Badge className={selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Blocked Status</label>
                  <Badge className={selectedUser.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {selectedUser.isBlocked ? 'Blocked' : 'Not Blocked'}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Available for Donation</label>
                  <Badge className={selectedUser.isAvailable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {selectedUser.isAvailable ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Availability & Preferences */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">Availability & Preferences</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Availability Radius</label>
                  <p className="text-sm text-neutral-900">{selectedUser.availabilityRadius ? `${selectedUser.availabilityRadius} km` : '-'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Preferred Contact</label>
                  <p className="text-sm text-neutral-900 capitalize">{selectedUser.preferredContactMethod || '-'}</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {selectedUser.statistics && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-neutral-900 mb-3">Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Total Requests</label>
                    <p className="text-sm text-neutral-900 font-medium">{selectedUser.statistics?.totalRequests || 0}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Total Donations</label>
                    <p className="text-sm text-neutral-900 font-medium">{selectedUser.statistics?.totalDonations || 0}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Lives Saved</label>
                    <p className="text-sm text-neutral-900 font-medium">{selectedUser.statistics?.totalLivesSaved || 0}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Rating</label>
                    <p className="text-sm text-neutral-900 font-medium">
                      {selectedUser.statistics?.rating ? `${selectedUser.statistics.rating.toFixed(1)} / 5.0` : '-'}
                      {selectedUser.statistics?.totalRatings > 0 && (
                        <span className="text-neutral-600 text-xs ml-1">({selectedUser.statistics.totalRatings} reviews)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Avg Response Time</label>
                    <p className="text-sm text-neutral-900">{selectedUser.statistics?.averageResponseTime ? `${selectedUser.statistics.averageResponseTime} min` : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-neutral-900 mb-3">Timestamps</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Joined</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Last Updated</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Last Login</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Last Activity</label>
                  <p className="text-sm text-neutral-900">
                    {selectedUser.lastActivity ? new Date(selectedUser.lastActivity).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        size="lg"
      >
        {editingUser && (
          <EditUserForm
            user={editingUser}
            onSubmit={handleUpdateUser}
            onCancel={() => setShowEditModal(false)}
            isLoading={updateUserMutation.isLoading}
          />
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New User"
        size="lg"
      >
        <AddUserForm
          onSubmit={(userData) => createUserMutation.mutate(userData)}
          onCancel={() => setShowAddUserModal(false)}
          isLoading={createUserMutation.isLoading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleteUserMutation.isLoading}
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Edit User Form Component
const EditUserForm = ({ user, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    bloodType: user.bloodType || '',
    contactNumber: user.contactNumber || '',
    status: user.status || 'active'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Strip empty optional fields to avoid backend 400s
    const cleaned = { ...formData };
    if (!cleaned.bloodType) delete cleaned.bloodType;
    if (!cleaned.dateOfBirth) delete cleaned.dateOfBirth;
    if (!cleaned.gender) delete cleaned.gender;
    if (cleaned.address) {
      const addr = { ...cleaned.address };
      if (!addr.street) delete addr.street;
      if (!addr.city) delete addr.city;
      if (!addr.state) delete addr.state;
      if (!addr.zipCode) delete addr.zipCode;
      // Remove address if now empty
      if (Object.keys(addr).length === 0) delete cleaned.address; else cleaned.address = addr;
    }
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="donor">Donor</option>
            <option value="recipient">Recipient</option>
            <option value="medical_admin">Medical Admin</option>
            <option value="system_admin">System Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Blood Type
          </label>
          <select
            name="bloodType"
            value={formData.bloodType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="">Select Blood Type</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Contact Number
          </label>
          <input
            type="text"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          Update User
        </Button>
      </div>
    </form>
  );
};

// Add User Form Component
const AddUserForm = ({ onSubmit, onCancel, isLoading }) => {
  const { hasRole } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'donor',
    bloodType: '',
    dateOfBirth: '',
    gender: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
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
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Password *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Phone *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Role *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="donor">Donor</option>
            <option value="recipient">Recipient</option>
            {hasRole(['system_admin']) && (
              <>
                <option value="medical_admin">Medical Admin</option>
                <option value="system_admin">System Admin</option>
              </>
            )}
          </select>
          {!hasRole(['system_admin']) && (
            <p className="text-xs text-neutral-500 mt-1">
              Only system administrators can create admin users
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Blood Type
          </label>
          <select
            name="bloodType"
            value={formData.bloodType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="">Select Blood Type</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Street Address
          </label>
          <input
            type="text"
            name="address.street"
            value={formData.address.street}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            City
          </label>
          <input
            type="text"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            State
          </label>
          <input
            type="text"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Zip Code
          </label>
          <input
            type="text"
            name="address.zipCode"
            value={formData.address.zipCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          Create User
        </Button>
      </div>
    </form>
  );
};

export default UserManagement;
