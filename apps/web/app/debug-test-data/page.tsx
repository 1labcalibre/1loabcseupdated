'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { testDataService } from '@/lib/firebase/services/test-data';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';

export default function DebugTestDataPage() {
  const { userData } = useAuth();
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = testDataService.subscribe((allTests) => {
      setTests(allTests.slice(0, 5)); // Just show first 5 tests
    });
    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug Test Data</CardTitle>
            <p className="text-sm text-gray-600">Current User ID: {userData?.uid}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={test.id} className="border rounded p-4">
                  <h3 className="font-bold">{test.referenceNo}</h3>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <strong>G1 Tests:</strong>
                      {test.g1Tests ? (
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                          {JSON.stringify({
                            completedBy: test.g1Tests.completedBy,
                            completedById: test.g1Tests.completedById,
                            completedAt: test.g1Tests.completedAt?.seconds ? 'Timestamp' : test.g1Tests.completedAt,
                            matchesCurrentUser: test.g1Tests.completedById === userData?.uid
                          }, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-gray-500">Not started</p>
                      )}
                    </div>
                    <div>
                      <strong>G2 Tests:</strong>
                      {test.g2Tests ? (
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                          {JSON.stringify({
                            completedBy: test.g2Tests.completedBy,
                            completedById: test.g2Tests.completedById,
                            completedAt: test.g2Tests.completedAt?.seconds ? 'Timestamp' : test.g2Tests.completedAt,
                            matchesCurrentUser: test.g2Tests.completedById === userData?.uid
                          }, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-gray-500">Not started</p>
                      )}
                    </div>
                    <div>
                      <strong>G3 Tests:</strong>
                      {test.g3Tests ? (
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                          {JSON.stringify({
                            completedBy: test.g3Tests.completedBy,
                            completedById: test.g3Tests.completedById,
                            completedAt: test.g3Tests.completedAt?.seconds ? 'Timestamp' : test.g3Tests.completedAt,
                            matchesCurrentUser: test.g3Tests.completedById === userData?.uid
                          }, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-gray-500">Not started</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
} 