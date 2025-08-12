"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Save, Mail, Building, FileText, ArrowLeft, Database, Loader2, AlertTriangle, FlaskConical, CheckCircle } from "lucide-react"
import { seedDatabase, clearDatabase } from "@/lib/firebase/seed-database"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { settingsService, type AppSettings } from "@/lib/firebase/services/settings"

export default function SettingsPage() {
  const { userData } = useAuth()
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const settingsData = await settingsService.getSettings()
      setSettings(settingsData)
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    
    try {
      setSaving(true)
      await settingsService.updateSettings(settings)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true)
      const response = await fetch('/.netlify/functions/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          smtpSettings: settings?.emailSettings 
        })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email. Check your configuration.' })
      }
    } catch (error) {
      console.error('Error testing email:', error)
      setMessage({ type: 'error', text: 'Error testing email configuration' })
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="canEdit">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading settings...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="canEdit">
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Page header */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-gray-600">
              Manage system configuration and preferences
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                {message.text}
              </div>
            </div>
          )}

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Basic company details for certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={settings?.companyInfo.name || ''} 
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      companyInfo: { ...prev.companyInfo, name: e.target.value }
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Input 
                    id="companyAddress" 
                    value={settings?.companyInfo.address || ''} 
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      companyInfo: { ...prev.companyInfo, address: e.target.value }
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input 
                    id="companyEmail" 
                    type="email" 
                    value={settings?.companyInfo.email || ''} 
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      companyInfo: { ...prev.companyInfo, email: e.target.value }
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Website</Label>
                  <Input 
                    id="companyWebsite" 
                    value={settings?.companyInfo.website || ''} 
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      companyInfo: { ...prev.companyInfo, website: e.target.value }
                    } : null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure email notifications and certificate approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* SMTP Settings */}
                <div>
                  <h4 className="font-semibold mb-3">SMTP Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input 
                        id="smtpHost" 
                        placeholder="smtp.gmail.com" 
                        value={settings?.emailSettings.smtpHost || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { ...prev.emailSettings, smtpHost: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input 
                        id="smtpPort" 
                        type="number"
                        placeholder="587" 
                        value={settings?.emailSettings.smtpPort || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { ...prev.emailSettings, smtpPort: parseInt(e.target.value) || 587 }
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP Username</Label>
                      <Input 
                        id="smtpUser" 
                        placeholder="notifications@calibre.com" 
                        value={settings?.emailSettings.smtpUser || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { ...prev.emailSettings, smtpUser: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP Password</Label>
                      <Input 
                        id="smtpPassword" 
                        type="password" 
                        placeholder="App-specific password for Gmail"
                        value={settings?.emailSettings.smtpPassword || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { ...prev.emailSettings, smtpPassword: e.target.value }
                        } : null)}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={handleTestEmail} 
                      disabled={testingEmail || !settings?.emailSettings.smtpHost}
                      variant="outline"
                      size="sm"
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Email Configuration'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Notification Settings</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notificationEmails">L1 Notification Emails (comma separated)</Label>
                      <Input 
                        id="notificationEmails" 
                        placeholder="md@calibre.com, rnd@calibre.com"
                        value={settings?.emailSettings.notificationEmails.join(', ') || ''}
                        onChange={(e) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { 
                            ...prev.emailSettings, 
                            notificationEmails: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                          }
                        } : null)}
                      />
                    </div>
                  </div>
                </div>

                {/* Certificate Approval Settings */}
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Certificate Approval Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enableEmailApprovals">Enable Email-Based Certificate Approvals</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          Allow certificates to be approved/rejected directly from email notifications
                        </p>
                      </div>
                      <Switch
                        id="enableEmailApprovals"
                        checked={settings?.emailSettings.enableEmailApprovals || false}
                        onCheckedChange={(checked) => setSettings(prev => prev ? {
                          ...prev,
                          emailSettings: { ...prev.emailSettings, enableEmailApprovals: checked }
                        } : null)}
                      />
                    </div>
                    
                    {settings?.emailSettings.enableEmailApprovals && (
                      <div className="space-y-2 ml-4 pl-4 border-l-2 border-blue-200 bg-blue-50 p-4 rounded-r-lg">
                        <Label htmlFor="certificateApprovalEmail">Certificate Approval Email</Label>
                        <Input 
                          id="certificateApprovalEmail" 
                          type="email"
                          placeholder="approver@calibre.com"
                          value={settings?.emailSettings.certificateApprovalEmail || ''}
                          onChange={(e) => setSettings(prev => prev ? {
                            ...prev,
                            emailSettings: { ...prev.emailSettings, certificateApprovalEmail: e.target.value }
                          } : null)}
                        />
                        <p className="text-sm text-blue-600">
                          This email will receive approval notifications with approve/reject buttons for new certificates.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Parameters Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Test Parameters
              </CardTitle>
              <CardDescription>Configure test input fields</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage the input fields that appear in the test data entry form. 
                You can add, edit, delete, and reorder test parameters.
              </p>
              <Link href="/settings/test-parameters">
                <Button variant="outline" className="w-full">
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Manage Test Parameters
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Certificate Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Certificate Settings
              </CardTitle>
              <CardDescription>Configure certificate generation options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                  <Input 
                    id="invoicePrefix" 
                    value={settings?.certificateSettings.invoicePrefix || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      certificateSettings: { ...prev.certificateSettings, invoicePrefix: e.target.value }
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportPrefix">Report Number Prefix</Label>
                  <Input 
                    id="reportPrefix" 
                    value={settings?.certificateSettings.reportPrefix || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      certificateSettings: { ...prev.certificateSettings, reportPrefix: e.target.value }
                    } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultShelfLife">Default Shelf Life</Label>
                  <Select 
                    value={settings?.certificateSettings.defaultShelfLife?.toString() || "12"}
                    onValueChange={(value) => setSettings(prev => prev ? {
                      ...prev,
                      certificateSettings: { ...prev.certificateSettings, defaultShelfLife: parseInt(value) }
                    } : null)}
                  >
                    <SelectTrigger id="defaultShelfLife">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                      <SelectItem value="18">18 Months</SelectItem>
                      <SelectItem value="24">24 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testConditions">Test Conditions</Label>
                  <Input 
                    id="testConditions" 
                    value={settings?.certificateSettings.testConditions || ''}
                    onChange={(e) => setSettings(prev => prev ? {
                      ...prev,
                      certificateSettings: { ...prev.certificateSettings, testConditions: e.target.value }
                    } : null)}
                  />
                </div>
              </div>
              {/* Certificate designer removed */}
            </CardContent>
          </Card>

          {/* Developer Tools - Only for L1 users */}
          {userData?.role === 'L1' && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Database className="h-5 w-5" />
                  Developer Tools
                </CardTitle>
                <CardDescription>Database management utilities (Use with caution)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border border-orange-200">
                    <h4 className="font-semibold mb-2">Seed Database</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Populate the database with sample products, test data, and certificates for testing purposes.
                    </p>
                    <Button 
                      onClick={async () => {
                        setSeeding(true)
                        try {
                          const result = await seedDatabase()
                          alert(`Database seeded successfully!\n
                            - ${result.products} products
                            - ${result.testData} test data entries
                            - ${result.certificates} certificates
                            - ${result.auditTrail} audit entries
                          `)
                        } catch (error: any) {
                          alert(`Failed to seed database: ${error.message}`)
                        } finally {
                          setSeeding(false)
                        }
                      }}
                      disabled={seeding}
                      variant="outline"
                    >
                      {seeding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Seeding Database...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Seed Database
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border border-red-200">
                    <h4 className="font-semibold mb-2 text-red-900">Clear Database</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Remove all test data from the database. This action cannot be undone.
                    </p>
                    <Button 
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all test data? This action cannot be undone.")) {
                          setClearing(true)
                          try {
                            await clearDatabase()
                            alert("Database cleared successfully!")
                          } catch (error: any) {
                            alert(`Failed to clear database: ${error.message}`)
                          } finally {
                            setClearing(false)
                          }
                        }
                      }}
                      disabled={clearing}
                      variant="destructive"
                    >
                      {clearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing Database...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Clear Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={saving}
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
} 

