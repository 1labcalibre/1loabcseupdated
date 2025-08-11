"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Loader2, Users, CheckCircle } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function SetupMachineUsersPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const createMachineUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/create-machine-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create users')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="canApprove">
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Setup Machine Users</CardTitle>
            <CardDescription>
              Create default machine operator accounts for testing the workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">This will create the following users:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span><strong>G1 Machine Operator</strong> - g1operator@calibre.com (Password: calibre123)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span><strong>G2 Machine Operator</strong> - g2operator@calibre.com (Password: calibre123)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span><strong>G3 Machine Operator</strong> - g3operator@calibre.com (Password: calibre123)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span><strong>Lab In-charge</strong> - labincharge@calibre.com (Password: calibre123)</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> If users already exist, they will be skipped. This is safe to run multiple times.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Users Created Successfully!</h3>
                </div>
                <div className="space-y-1 text-sm">
                  {result.users.map((user: any, index: number) => (
                    <div key={index}>
                      {user.displayName} ({user.email}) - Role: {user.role}, Machines: {user.machineAccess.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={createMachineUsers} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Users...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Machine Users
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
} 