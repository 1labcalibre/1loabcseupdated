"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

interface CertificateDesignerProps {
  onSave: (template: any) => void
  templates: any[]
}

export function CertificateDesigner({ onSave, templates }: CertificateDesignerProps) {
  const [templateName, setTemplateName] = useState("")
  const [templateContent, setTemplateContent] = useState("")

  const handleSave = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      alert("Please fill in all fields")
      return
    }

    const template = {
      id: Date.now().toString(),
      name: templateName,
      content: templateContent,
      createdAt: new Date().toISOString()
    }

    onSave(template)
    setTemplateName("")
    setTemplateContent("")
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Create Certificate Template</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          <div>
            <Label htmlFor="templateContent">Template Content</Label>
            <Textarea
              id="templateContent"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="Enter certificate template content"
              rows={10}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Template
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Existing Templates</h3>
        <div className="grid gap-4">
          {templates.map((template, index) => (
            <Card key={index} className="p-4">
              <h4 className="font-medium">{template.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{template.content}</p>
            </Card>
          ))}
          {templates.length === 0 && (
            <p className="text-gray-500">No templates created yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
