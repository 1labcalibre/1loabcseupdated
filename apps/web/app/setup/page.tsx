"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Shield, Loader2, CheckCircle, Database } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { initializeDatabase } from "@/lib/firebase/init-db"
import { seedDatabase } from "@/lib/firebase/seed-database"

export default function SetupPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [seeding, setSeeding] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }
    
    setLoading(true)
    
    try {
      // Create admin user
      await signUp(formData.email, formData.password, formData.name, 'L1')
      
      // Initialize database with default data
      await initializeDatabase()
      
      setStep(2)
    } catch (error: any) {
      console.error('Setup error:', error)
      setError(error.message || "Failed to complete setup")
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDatabase = async () => {
    setSeeding(true)
    setError("")
    
    try {
      const result = await seedDatabase()
      alert(`Database seeded successfully!\n
        - ${result.products} products
        - ${result.testData} test data entries
        - ${result.certificates} certificates
        - ${result.auditTrail} audit entries
      `)
    } catch (error: any) {
      console.error('Seeding error:', error)
      setError(error.message || "Failed to seed database")
    } finally {
      setSeeding(false)
    }
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
              <p className="text-gray-600 mb-4">
                Your admin account has been created and the database has been initialized.
              </p>
              
              <div className="mt-6 space-y-3">
                <Button 
                  onClick={handleSeedDatabase} 
                  disabled={seeding}
                  variant="outline"
                  className="w-full"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding Database...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Seed Database with Sample Data
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-4">
                You can seed the database with sample data or proceed to the dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full text-white mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Calibre CoA</h1>
          <p className="text-gray-600 mt-2">Let's set up your admin account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Admin Account</CardTitle>
            <CardDescription>
              This will be the primary administrator account with full access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@calibre.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>This setup process will:</p>
          <ul className="mt-2 space-y-1">
            <li>• Create your admin account</li>
            <li>• Initialize the database structure</li>
            <li>• Add default products and settings</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 