"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Lock, User, Fingerprint, Key, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getRoleBasedRedirect } from "@/lib/utils/role-redirect"

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'password' | 'signature'>('password')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const { signIn, user, userData, getRedirectPath } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && userData) {
      const redirectPath = getRedirectPath()
      router.push(redirectPath)
    }
  }, [user, userData, router, getRedirectPath])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Check if account is locked
    if (loginAttempts >= 3) {
      setIsLocked(true)
      return
    }
    
    setIsLoading(true)
    
    try {
      await signIn(email, password)
      // Redirect will be handled by useEffect after userData loads
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1)
      
      if (error.code === 'auth/user-not-found') {
        setError("No user found with this email address")
      } else if (error.code === 'auth/wrong-password') {
        setError("Incorrect password")
      } else if (error.code === 'auth/invalid-email') {
        setError("Invalid email address")
      } else {
        setError("An error occurred during login. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sessionInfo = {
    lastLogin: "2025-05-14 09:30:45",
    lastIP: "192.168.1.100",
    activeSessions: 2
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-bold">O</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">One Lab</h1>
                <p className="text-blue-100 text-sm">Certificate of Analysis Management</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Professional Laboratory Management System
              </h2>
              <p className="text-lg text-blue-100 leading-relaxed">
                Streamline your quality control processes with our comprehensive certificate of analysis management platform.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-blue-100">21 CFR Part 11 Compliant</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-blue-100">FDA Validated Processes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-blue-100">ISO 17025 Compatible</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-blue-100">Audit Trail & Data Integrity</span>
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/20">
              <p className="text-sm text-blue-200">
                © 2024 Calibre Speciality Elastomers India Pvt. Ltd. All rights reserved.
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                O
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">One Lab</h1>
                <p className="text-gray-600 text-sm">CoA Management</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <Shield className="h-4 w-4" />
              <span>21 CFR Part 11 Compliant</span>
            </div>
          </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Lock className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold text-gray-900">
              Secure Access
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showTwoFactor ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Login Method Selector */}
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      loginMethod === 'password' 
                        ? 'bg-white text-blue-600 shadow-md border border-blue-100' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Key className="h-4 w-4 inline mr-2" />
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('signature')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      loginMethod === 'signature' 
                        ? 'bg-white text-blue-600 shadow-md border border-blue-100' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Fingerprint className="h-4 w-4 inline mr-2" />
                    Digital Signature
                  </button>
                </div>

                {(isLocked || error) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-700">
                      {isLocked ? (
                        <>
                          <p className="font-medium">Account Locked</p>
                          <p>Too many failed attempts. Contact administrator.</p>
                        </>
                      ) : (
                        <p>{error}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email address"
                      className="pl-11 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                      disabled={isLocked || isLoading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {loginMethod === 'password' ? (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="Enter your password"
                        className="pl-11 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        disabled={isLocked || isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Digital Signature</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Fingerprint className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to sign or drag signature file
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-600">Remember this device</span>
                  </label>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
                  disabled={isLocked || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : isLocked ? (
                    <>
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Account Locked
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Sign In Securely
                    </>
                  )}
                </Button>

                {/* Session Info */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="text-center text-xs text-gray-500 space-y-1">
                    <p>Last login: {sessionInfo.lastLogin}</p>
                    <p>IP: {sessionInfo.lastIP} • Sessions: {sessionInfo.activeSessions}</p>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium text-lg">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Input
                      key={i}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center text-lg font-mono"
                    />
                  ))}
                </div>

                <Button className="w-full">
                  Verify & Login
                </Button>

                <button
                  onClick={() => setShowTwoFactor(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  Back to login
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-900 text-center">Security & Compliance</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="text-gray-600">End-to-end encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="text-gray-600">Session timeout: 30 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="text-gray-600">IP monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span className="text-gray-600">Audit trail logging</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
} 

