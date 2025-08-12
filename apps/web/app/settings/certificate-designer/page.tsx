"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
// Certificate designer removed - component not needed

export default function CertificateDesignerPage() {
  const [templates, setTemplates] = useState([])

  const handleSaveTemplate = (template: any) => {
    // TODO: Save template to database
    // Here you would save the template to your backend
    alert("Template saved successfully!")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Certificate Designer</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="text-center p-8">
          <p className="text-lg text-gray-600">Certificate Designer has been removed from this project.</p>
          <Link href="/settings">
            <Button className="mt-4">Return to Settings</Button>
          </Link>
        </div>
      </main>
    </div>
  )
} 

