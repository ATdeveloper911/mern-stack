import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaUserMd,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSearch,
  FaFilter,
  FaEye,
  FaFileMedical,
  FaHeart,
  FaUser
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

const MedicalVerifications = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Fetch only donors and recipients for medical verification
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['medical-verifications', { 
      searchTerm, 
      statusFilter, 
      sortBy, 
      sortOrder, 
      page: currentPage 
    }],
    async () => {
      const params = {
        search: searchTerm || undefined,
        role: 'donor,recipient', // Only fetch donors and recipients
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 10
      };
      
      // Add medical verification filter based on statusFilter
      // When 'all', don't set isMedicalVerified to show both verified and unverified
      if (statusFilter === 'pending') {
        params.isMedicalVerified = 'false';
      } else if (statusFilter === 'verified') {
        params.isMedicalVerified = 'true';
      }
      // When 'all', isMedicalVerified is undefined, so backend returns all users
      
      console.log('Medical Verifications Query Params:', params);
      const response = await adminAPI.getUsers(params);
      console.log('Medical Verifications Response:', response?.data);
      return response.data;
    },
    {
      enabled: hasRole(['medical_admin', 'system_admin']),
    }
  );

  // Verify user mutation
  const verifyUserMutation = useMutation(
    ({ userId, verified }) => adminAPI.updateUser(userId, { isMedicalVerified: verified }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('medical-verifications');
        setShowVerifyModal(false);
        toast.success('User verification updated successfully');
      },
    }
  );

  const users = usersData?.data?.users || usersData?.users || [];
  const pagination = usersData?.data?.pagination || usersData?.pagination || {};
  
  // Debug logging
  console.log('Medical Verifications - usersData:', usersData);
  console.log('Medical Verifications - extracted users:', users);
  console.log('Medical Verifications - users count:', users.length);
  console.log('Medical Verifications - statusFilter:', statusFilter);

  const handleVerify = (user, verified) => {
    setSelectedUser(user);
    verifyUserMutation.mutate({ userId: user._id, verified });
  };

  if (usersLoading) {
    return <LoadingSpinner fullScreen text="Loading verifications..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Medical Verification</h1>
          <p className="text-neutral-600 mt-1">
            Verify and manage medical eligibility of donors and recipients
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Search
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Verification Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="pending">Pending Verification</option>
              <option value="verified">Verified</option>
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
                  Blood Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Medical Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center">
                      <FaUserMd className="h-12 w-12 text-neutral-300 mb-4" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                            <FaUser className="h-5 w-5 text-blood-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-neutral-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={user.role === 'donor' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {user.bloodType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isMedicalVerified ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center space-x-1 w-fit">
                          <FaCheckCircle className="h-3 w-3" />
                          <span>Verified</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 flex items-center space-x-1 w-fit">
                          <FaClock className="h-3 w-3" />
                          <span>Pending</span>
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {user.isMedicalVerified 
                        ? new Date(user.metadata?.medicalVerificationDate || user.updatedAt).toLocaleDateString()
                        : 'Not verified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {!user.isMedicalVerified ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleVerify(user, true)}
                            className="flex items-center space-x-1"
                          >
                            <FaCheckCircle />
                            <span>Verify</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(user, false)}
                            className="flex items-center space-x-1"
                          >
                            <FaTimesCircle />
                            <span>Revoke</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pagination.totalPages || pagination.pages) > 1 && (
          <div className="px-6 py-4 border-t border-neutral-200">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages || pagination.pages || 1}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalVerifications;

