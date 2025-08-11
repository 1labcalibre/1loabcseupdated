"use client"

import { useState } from 'react'
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { useAuth } from "@/contexts/auth-context"

export default function DebugAuthPage() {
  const { user, userData, signIn } = useAuth()
  const [email, setEmail] = useState('g1operator@calibre.com')
  const [password, setPassword] = useState('calibre123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      await signIn(email, password)
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Debug Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Current User:</strong> {user?.email || 'Not logged in'}
          </div>
          <div>
            <strong>User Role:</strong> {userData?.role || 'N/A'}
          </div>
          <div>
            <strong>Machine Access:</strong> {JSON.stringify(userData?.machineAccess) || 'N/A'}
          </div>
          
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              onClick={handleLogin} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Test Login'}
            </Button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}