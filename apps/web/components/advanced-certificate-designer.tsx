"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

interface CertificateTemplate {
  id?: string
  name: string
  description?: string
  sections: any[]
}

interface AdvancedCertificateDesignerProps {
  onSave: (template: CertificateTemplate) => void
  initialTemplate?: CertificateTemplate
}

export function AdvancedCertificateDesigner({ 
  onSave, 
  initialTemplate 
}: AdvancedCertificateDesignerProps) {
  const [template, setTemplate] = useState<CertificateTemplate>(() => ({
    id: initialTemplate?.id || '',
    name: initialTemplate?.name || '',
    description: initialTemplate?.description || '',
    sections: initialTemplate?.sections || []
  }))

  const handleSave = () => {
    if (!template.name.trim()) {
      alert('Please enter a template name')
      return
    }

    onSave(template)
    alert('Template saved successfully!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Certificate Designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="Enter template name"
            />
          </div>

          <div>
            <Label htmlFor="templateDescription">Description</Label>
            <Input
              id="templateDescription"
              type="text"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Enter template description"
            />
          </div>

          <div className="text-center">
            <p className="text-gray-500 mb-4">
              This is a simplified version of the certificate designer.
              Advanced features are available in the full version.
            </p>
            <Button onClick={handleSave} className="w-full">
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
