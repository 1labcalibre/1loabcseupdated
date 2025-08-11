"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function TestWorkflowPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Test Workflow Guide</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>How the New Workflow Works</CardTitle>
              <CardDescription>
                Any machine operator can create a test and all others get notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">1. Creating a New Test</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Any operator (G1, G2, or G3) can create a new test</li>
                  <li>A unique reference number is automatically generated</li>
                  <li>The creator enters their machine-specific test values</li>
                  <li>All other machine operators receive notifications</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">2. Completing Tests</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Other operators see the test in their "Pending Tests" list</li>
                  <li>They can click on the reference number to add their test values</li>
                  <li>Each operator only sees and enters their specific tests</li>
                  <li>Tests can be completed in any order</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">3. Test Status</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>○ G1 | ○ G2 | ○ G3 - No tests completed</li>
                  <li>✓ G1 | ○ G2 | ○ G3 - Only G1 tests completed</li>
                  <li>✓ G1 | ✓ G2 | ✓ G3 - All tests completed</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">4. Example Scenarios</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">Scenario 1: G3 creates a test</p>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      <li>G3 enters product info and G3 test values</li>
                      <li>G1 and G2 operators get notifications</li>
                      <li>G1 and G2 can add their tests in any order</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium">Scenario 2: G1 creates a test</p>
                    <ul className="list-disc list-inside mt-1 text-gray-600">
                      <li>G1 enters product info and G1 test values</li>
                      <li>G2 and G3 operators get notifications</li>
                      <li>G2 and G3 can add their tests independently</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Link href="/test-entry">
                  <Button>Create New Test</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Users</CardTitle>
              <CardDescription>Use these credentials to test the workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">G1 Operator</p>
                  <p className="text-gray-600">Email: g1operator@calibre.com</p>
                  <p className="text-gray-600">Password: calibre123</p>
                  <p className="text-gray-600">Tests: Hardness, Density</p>
                </div>
                <div>
                  <p className="font-medium">G2 Operator</p>
                  <p className="text-gray-600">Email: g2operator@calibre.com</p>
                  <p className="text-gray-600">Password: calibre123</p>
                  <p className="text-gray-600">Tests: Tensile, Elongation, Tear</p>
                </div>
                <div>
                  <p className="font-medium">G3 Operator</p>
                  <p className="text-gray-600">Email: g3operator@calibre.com</p>
                  <p className="text-gray-600">Password: calibre123</p>
                  <p className="text-gray-600">Tests: Mooney, Rheo</p>
                </div>
                <div>
                  <p className="font-medium">Lab In-charge</p>
                  <p className="text-gray-600">Email: labincharge@calibre.com</p>
                  <p className="text-gray-600">Password: calibre123</p>
                  <p className="text-gray-600">Access: All machines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
} 

