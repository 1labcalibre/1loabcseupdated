'use client';

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { addCompletedByIdMigration } from '@/lib/firebase/migrations/add-completed-by-id';
import { fixInitialCompletedById } from '@/lib/firebase/migrations/fix-initial-completed-by-id';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/contexts/auth-context';

export default function RunMigrationPage() {
  const { userData } = useAuth();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runMigration = async () => {
    if (userData?.role !== 'L1') {
      alert('Only administrators can run migrations');
      return;
    }

    setRunning(true);
    setResult(null);
    
    try {
      // Run both migrations
      const result1 = await addCompletedByIdMigration();
      const result2 = await fixInitialCompletedById();
      setResult({
        addCompletedById: result1,
        fixInitialCompletedById: result2,
        success: result1.success && result2.success
      });
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Run Migration: Add completedById</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This migration will add the completedById field to existing test data.
              It will copy the completedBy field value to completedById for all existing records.
            </p>
            
            <Button 
              onClick={runMigration} 
              disabled={running || userData?.role !== 'L1'}
            >
              {running ? 'Running Migration...' : 'Run Migration'}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.success ? (
                  <p>Migration completed successfully! Updated {result.updated} records.</p>
                ) : (
                  <p>Migration failed: {result.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
} 