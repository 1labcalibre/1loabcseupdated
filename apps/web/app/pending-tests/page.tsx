'use client';

import React, { useState, useEffect } from 'react';
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

export default function PendingTestsPage() {
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                {userData?.machineAccess && userData.machineAccess.length > 0 
                  ? userData.machineAccess.length === 1
                    ? `${userData.machineAccess[0]} Machine Test Management`
                    : `Test Management (${userData.machineAccess.join(', ')})`
                  : 'Test Management'
                }
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {userData?.displayName} ({userData?.email})
              </p>
            </div>
            <Button
              onClick={() => router.push('/test-entry')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create New Test
            </Button>
          </div>

        {/* Search and Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <Label htmlFor="search">Search Tests</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by reference number or product code..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="pl-10"
                  />
                  
                  {/* Auto-suggestions */}
                  {showSuggestions && getSuggestions().length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                      {getSuggestions().map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSearchTerm(suggestion.referenceNumber);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-medium">{suggestion.referenceNumber}</div>
                          <div className="text-sm text-gray-500">{suggestion.productName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={activeView === 'pending' ? "default" : "outline"}
                  onClick={() => setActiveView('pending')}
                  className={activeView === 'pending' ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending ({getPendingCount()})
                </Button>
                <Button
                  variant={activeView === 'completed' ? "default" : "outline"}
                  onClick={() => setActiveView('completed')}
                  className={activeView === 'completed' ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed ({getCompletedCount()})
                </Button>
                <Button
                  variant={activeView === 'hold' ? "default" : "outline"}
                  onClick={() => setActiveView('hold')}
                  className={activeView === 'hold' ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Hold ({getHoldCount()})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((test) => {
            const status = getTestStatus(test);
            let cardColor = 'border-gray-200';
            if (test.isHold) {
              cardColor = 'border-red-500 bg-red-50';
            } else if (status.isComplete) {
              cardColor = 'border-green-500 bg-green-50';
            }
            
            return (
                              <Card 
                key={test.id} 
                className={`cursor-pointer hover:shadow-lg transition-shadow ${cardColor}`}
                onClick={() => handleTestClick(test.referenceNo)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{test.referenceNo}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {getProductName(test.productCode || '')}
                      </p>
                      {/* Show hold status */}
                      {test.isHold && (
                        <div className="flex items-center gap-1 mt-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                            On Hold
                          </span>
                        </div>
                      )}
                      {/* Show which machines still need testing */}
                      {userData?.machineAccess && userData.machineAccess.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {userData.machineAccess.map(machine => {
                            const isPending = 
                              (machine === 'G1' && (!test.g1Tests || test.g1Tests.completedById !== userData.uid)) ||
                              (machine === 'G2' && (!test.g2Tests || test.g2Tests.completedById !== userData.uid)) ||
                              (machine === 'G3' && (!test.g3Tests || test.g3Tests.completedById !== userData.uid));
                            
                            const isCompleted = 
                              (machine === 'G1' && test.g1Tests && test.g1Tests.completedById === userData.uid) ||
                              (machine === 'G2' && test.g2Tests && test.g2Tests.completedById === userData.uid) ||
                              (machine === 'G3' && test.g3Tests && test.g3Tests.completedById === userData.uid);
                            
                            if (isPending) {
                              return (
                                <span key={machine} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  {machine} Pending
                                </span>
                              );
                            } else if (isCompleted) {
                              return (
                                <span key={machine} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  {machine} Done
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                    {status.isComplete ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <div className="text-sm font-medium text-orange-600">
                        {status.completedCount}/3
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {test.createdAt ? format(test.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <div className={`flex-1 h-2 rounded-full ${
                        userData?.machineAccess?.includes('G1') 
                          ? (test.g1Tests?.completedById === userData.uid ? 'bg-green-500' : 'bg-orange-400')
                          : (test.g1Tests?.completedAt ? 'bg-green-500' : 'bg-gray-300')
                      }`} />
                      <div className={`flex-1 h-2 rounded-full ${
                        userData?.machineAccess?.includes('G2')
                          ? (test.g2Tests?.completedById === userData.uid ? 'bg-green-500' : 'bg-orange-400')
                          : (test.g2Tests?.completedAt ? 'bg-green-500' : 'bg-gray-300')
                      }`} />
                      <div className={`flex-1 h-2 rounded-full ${
                        userData?.machineAccess?.includes('G3')
                          ? (test.g3Tests?.completedById === userData.uid ? 'bg-green-500' : 'bg-orange-400')
                          : (test.g3Tests?.completedAt ? 'bg-green-500' : 'bg-gray-300')
                      }`} />
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span className={userData?.machineAccess?.includes('G1') ? 'font-bold' : ''}>G1</span>
                      <span className={userData?.machineAccess?.includes('G2') ? 'font-bold' : ''}>G2</span>
                      <span className={userData?.machineAccess?.includes('G3') ? 'font-bold' : ''}>G3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTests.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm 
                  ? `No tests found matching "${searchTerm}"`
                  : activeView === 'completed' 
                    ? 'No completed tests found'
                    : activeView === 'hold'
                      ? 'No tests on hold found'
                      : 'No pending tests found'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination Controls */}
        {filteredTests.length > itemsPerPage && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} tests
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredTests.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={`page-${page}`}>
                          {index > 0 && array[index - 1]! < page - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTests.length / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(filteredTests.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </ProtectedRoute>
  );
} 