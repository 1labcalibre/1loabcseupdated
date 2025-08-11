"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { ArrowLeft, Shield, FileText, Download, Search, Filter, CheckCircle, AlertCircle, Clock } from "lucide-react"

export default function AuditTrailPage() {
  const [filterType, setFilterType] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  
  const auditLogs = [
    {
      id: "AUD001",
      timestamp: "2025-05-15 14:32:15",
      user: "S P Tiwari",
      action: "Test Data Entry",
      details: "Created test entry for batch TD200G2502051H",
      type: "create",
      ipAddress: "192.168.1.105",
      status: "success"
    },
    {
      id: "AUD002",
      timestamp: "2025-05-15 14:45:22",
      user: "Dr. Rajesh Kumar",
      action: "Certificate Approval",
      details: "Approved certificate TD250C2516041H",
      type: "approval",
      ipAddress: "192.168.1.101",
      status: "success"
    },
    {
      id: "AUD003",
      timestamp: "2025-05-15 15:10:33",
      user: "Vikrant",
      action: "Data Modification",
      details: "Modified test result for batch A3 - Changed hardness from 65 to 66",
      type: "modify",
      ipAddress: "192.168.1.108",
      status: "pending_approval"
    },
    {
      id: "AUD004",
      timestamp: "2025-05-15 15:25:44",
      user: "Admin",
      action: "User Access Change",
      details: "Updated access level for user 'Priya Sharma' from L3 to L2",
      type: "security",
      ipAddress: "192.168.1.100",
      status: "success"
    },
    {
      id: "AUD005",
      timestamp: "2025-05-15 16:00:12",
      user: "S P Tiwari",
      action: "Product Specification Change",
      details: "Requested change in TD400 hardness range from 68±5 to 70±5",
      type: "change_request",
      ipAddress: "192.168.1.105",
      status: "pending_approval"
    }
  ]

  const getActionIcon = (type: string) => {
    switch(type) {
      case "approval": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "security": return <Shield className="h-4 w-4 text-purple-500" />
      case "change_request": return <AlertCircle className="h-4 w-4 text-orange-500" />
      default: return <FileText className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "success":
        return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Success</span>
      case "pending_approval":
        return <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Pending</span>
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">Unknown</span>
    }
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesType = filterType === "all" || log.type === filterType
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Audit Trail & Compliance</h1>
            </div>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6">
        {/* Compliance Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                21 CFR Part 11 Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Compliant</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Last audit: 30 days ago</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Electronic Signatures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-gray-500 mt-1">Requires approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Action Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="modify">Modify</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="change_request">Change Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input id="dateFrom" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input id="dateTo" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Complete history of all system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.id}</TableCell>
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.type)}
                          <span className="text-sm">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-sm">{log.ipAddress}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Electronic Signature Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Electronic Signature Verification</CardTitle>
            <CardDescription>Verify and validate electronic signatures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Recent Signature</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Document: Certificate TD250C2516041H</p>
                    <p className="text-gray-600">Signed by: Dr. Rajesh Kumar</p>
                    <p className="text-gray-600">Date: 2025-05-15 14:45:22</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Signature Hash: 3f2a8b9c...</p>
                    <p className="text-gray-600">Verification Status: <span className="text-green-600 font-medium">Valid</span></p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Verify Signature
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 