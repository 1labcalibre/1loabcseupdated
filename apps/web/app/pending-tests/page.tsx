'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
// Remove DashboardLayout import as AppLayout is already provided by root layout
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import { testDataService, TestData } from '@/lib/firebase/services/test-data';
import { productsService } from '@/lib/firebase/services/products';
import { Search, Filter, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

function PendingTestsPageContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<TestData[]>([]);
  const [filteredTests, setFilteredTests] = useState<TestData[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'pending' | 'completed' | 'hold'>('pending');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (userData) {
      loadProducts();
      
      // Subscribe to real-time test data updates
      const unsubscribe = testDataService.subscribe((testsData) => {
        setTests(testsData);
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [userData]);

  useEffect(() => {
    filterTests();
    // Debug logging
    if (userData?.uid && tests.length > 0) {
      console.log('Current user ID:', userData.uid);
      console.log('User machines:', userData.machineAccess);
      console.log('Sample test data:', tests[0]);
      if (tests[0]?.g2Tests) {
        console.log('G2 test data:', {
          exists: !!tests[0].g2Tests,
          completedById: tests[0].g2Tests.completedById,
          completedBy: tests[0].g2Tests.completedBy,
          completedAt: tests[0].g2Tests.completedAt,
          matchesUser: tests[0].g2Tests.completedById === userData.uid
        });
      }
    }
  }, [tests, searchTerm, activeView, userData]);

  const loadProducts = async () => {
    try {
      const productsData = await productsService.getAll();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const filterTests = () => {
    setCurrentPage(1); // Reset to first page when filtering
    let filtered = tests;

    // Filter by view type
    if (activeView === 'pending') {
      // Show pending tests (not on hold and not completed by user)
      filtered = filtered.filter(test => {
        // Exclude hold tests
        if (test.isHold) return false;
        
        // For machine operators, show only tests where THEIR machine hasn't been completed by THEM
        if (userData?.machineAccess && userData.machineAccess.length > 0) {
          // Check if any of the user's machines have pending work
          return userData.machineAccess.some(machine => {
            if (machine === 'G1') {
              // Test is pending for this user if they haven't completed it
              return !test.g1Tests || test.g1Tests.completedById !== userData.uid;
            }
            if (machine === 'G2') {
              // Test is pending for this user if they haven't completed it
              return !test.g2Tests || test.g2Tests.completedById !== userData.uid;
            }
            if (machine === 'G3') {
              // Test is pending for this user if they haven't completed it
              return !test.g3Tests || test.g3Tests.completedById !== userData.uid;
            }
            return false;
          });
        } else {
          // For other users, show all incomplete tests (not on hold)
          return !hasTimestamp(test.g1Tests?.completedAt) || !hasTimestamp(test.g2Tests?.completedAt) || !hasTimestamp(test.g3Tests?.completedAt);
        }
      });
    } else if (activeView === 'completed') {
      // Show completed tests (not on hold and completed by user)
      filtered = filtered.filter(test => {
        // Exclude hold tests
        if (test.isHold) return false;
        
        // For machine operators, show only tests where THEIR machine has been completed by THEM
        if (userData?.machineAccess && userData.machineAccess.length > 0) {
          // Check if any of the user's machines have been completed by this user
          return userData.machineAccess.some(machine => {
            if (machine === 'G1') {
              // Test is completed by this user if their ID matches
              return test.g1Tests && test.g1Tests.completedById === userData.uid;
            }
            if (machine === 'G2') {
              // Test is completed by this user if their ID matches
              return test.g2Tests && test.g2Tests.completedById === userData.uid;
            }
            if (machine === 'G3') {
              // Test is completed by this user if their ID matches
              return test.g3Tests && test.g3Tests.completedById === userData.uid;
            }
            return false;
          });
        } else {
          // For other users, show all completed tests (not on hold)
          return hasTimestamp(test.g1Tests?.completedAt) && hasTimestamp(test.g2Tests?.completedAt) && hasTimestamp(test.g3Tests?.completedAt);
        }
      });
    } else if (activeView === 'hold') {
      // Show hold tests
      filtered = filtered.filter(test => {
        // Only show tests that are on hold
        if (!test.isHold) return false;
        
        if (userData?.machineAccess && userData.machineAccess.length > 0) {
          // For machine operators, only show holds from their machines
          return userData.machineAccess.some(machine => {
            // Check if this user was involved in creating the hold
            if (machine === 'G1' && test.g1Tests && test.g1Tests.completedById === userData.uid) return true;
            if (machine === 'G2' && test.g2Tests && test.g2Tests.completedById === userData.uid) return true;
            if (machine === 'G3' && test.g3Tests && test.g3Tests.completedById === userData.uid) return true;
            return false;
          });
        } else {
          // For admins, show all hold tests
          return true;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(test => 
        test.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTests(filtered);
  };

  const getProductName = (productCode: string) => {
    const product = products.find(p => p.internalCode === productCode);
    return product?.name || productCode;
  };

  const getTestStatus = (test: TestData) => {
    // For machine operators, check if THEY have completed their specific tests
    if (userData?.machineAccess && userData.machineAccess.length > 0) {
      const g1Complete = userData.machineAccess.includes('G1') 
        ? (test.g1Tests && test.g1Tests.completedById === userData.uid)
        : (test.g1Tests && hasTimestamp(test.g1Tests.completedAt));
      
      const g2Complete = userData.machineAccess.includes('G2')
        ? (test.g2Tests && test.g2Tests.completedById === userData.uid)
        : (test.g2Tests && hasTimestamp(test.g2Tests.completedAt));
      
      const g3Complete = userData.machineAccess.includes('G3')
        ? (test.g3Tests && test.g3Tests.completedById === userData.uid)
        : (test.g3Tests && hasTimestamp(test.g3Tests.completedAt));
      
      const completedCount = [g1Complete, g2Complete, g3Complete].filter(Boolean).length;
      
      return {
        isComplete: completedCount === 3,
        completedCount,
        g1Complete,
        g2Complete,
        g3Complete
      };
    } else {
      // For non-machine operators, check overall completion
      const g1Complete = test.g1Tests && hasTimestamp(test.g1Tests.completedAt);
      const g2Complete = test.g2Tests && hasTimestamp(test.g2Tests.completedAt);
      const g3Complete = test.g3Tests && hasTimestamp(test.g3Tests.completedAt);
      
      const completedCount = [g1Complete, g2Complete, g3Complete].filter(Boolean).length;
      
      return {
        isComplete: completedCount === 3,
        completedCount,
        g1Complete,
        g2Complete,
        g3Complete
      };
    }
  };

  const getSuggestions = () => {
    if (!searchTerm) return [];
    
    const suggestions = tests
      .filter(test => 
        test.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5)
      .map(test => ({
        referenceNumber: test.referenceNo,
        productName: getProductName(test.productCode || '')
      }));
    
    return suggestions;
  };

  const handleTestClick = (referenceNo: string) => {
    router.push(`/test-entry?ref=${referenceNo}`);
  };

  // Helper function to check if a timestamp exists (handles Firestore Timestamp objects)
  const hasTimestamp = (timestamp: any): boolean => {
    if (!timestamp) return false;
    // Check if it's a Firestore Timestamp object
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return true;
    }
    // Check if it's a Date object
    if (timestamp instanceof Date) {
      return true;
    }
    // Check if it's a valid date string or number
    if (timestamp && (typeof timestamp === 'string' || typeof timestamp === 'number')) {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    }
    return false;
  };

  const getPendingCount = () => {
    return tests.filter(test => {
      if (userData?.machineAccess && userData.machineAccess.length > 0) {
        // For machine operators, count tests where their machine hasn't completed
        return userData.machineAccess.some(machine => {
          if (machine === 'G1') return !test.g1Tests || test.g1Tests.completedById !== userData.uid;
          if (machine === 'G2') return !test.g2Tests || test.g2Tests.completedById !== userData.uid;
          if (machine === 'G3') return !test.g3Tests || test.g3Tests.completedById !== userData.uid;
          return false;
        });
      } else {
        const status = getTestStatus(test);
        return !status.isComplete;
      }
    }).length;
  };

  const getCompletedCount = () => {
    return tests.filter(test => {
      if (userData?.machineAccess && userData.machineAccess.length > 0) {
        // For machine operators, count tests where their machine has completed
        return userData.machineAccess.some(machine => {
          if (machine === 'G1') return test.g1Tests && test.g1Tests.completedById === userData.uid;
          if (machine === 'G2') return test.g2Tests && test.g2Tests.completedById === userData.uid;
          if (machine === 'G3') return test.g3Tests && test.g3Tests.completedById === userData.uid;
          return false;
        });
      } else {
        const status = getTestStatus(test);
        return status.isComplete;
      }
    }).length;
  };

  const getHoldCount = () => {
    return tests.filter(test => {
      // Check if test is on hold
      if (!test.isHold) return false;
      
      if (userData?.machineAccess && userData.machineAccess.length > 0) {
        // For machine operators, only show holds from their machines
        return userData.machineAccess.some(machine => {
          // Check if this user was involved in creating the hold
          if (machine === 'G1' && test.g1Tests && test.g1Tests.completedById === userData.uid) return true;
          if (machine === 'G2' && test.g2Tests && test.g2Tests.completedById === userData.uid) return true;
          if (machine === 'G3' && test.g3Tests && test.g3Tests.completedById === userData.uid) return true;
          return false;
        });
      } else {
        // For admins, show all hold tests
        return true;
      }
    }).length;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading tests...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="text-center py-12">
        <p className="text-gray-500">Pending tests functionality is temporarily disabled for deployment.</p>
      </div>
    </ProtectedRoute>
  );
}

export default function PendingTestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PendingTestsPageContent />
    </Suspense>
  )
}