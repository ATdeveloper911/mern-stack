import React from 'react';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  showFirstLast = true,
  maxVisiblePages = 5,
  className = '' 
}) => {
  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 rounded-l-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FaChevronLeft className="w-4 h-4" />
        <span className="ml-1">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {/* First Page */}
        {showFirstLast && visiblePages[0] > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 hover:bg-neutral-50"
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300">
                ...
              </span>
            )}
          </>
        )}

        {/* Visible Pages */}
        {visiblePages.map((page) => (
          <motion.button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border ${
              page === currentPage
                ? 'z-10 bg-blood-50 border-blood-500 text-blood-600'
                : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {page}
          </motion.button>
        ))}

        {/* Last Page */}
        {showFirstLast && visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300">
                ...
              </span>
            )}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 hover:bg-neutral-50"
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 rounded-r-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="mr-1">Next</span>
        <FaChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
