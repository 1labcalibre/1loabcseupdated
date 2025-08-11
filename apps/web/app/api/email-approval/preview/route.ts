import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email Preview</title>
      <style>body{font-family:Arial, sans-serif;padding:24px;line-height:1.6}</style>
    </head>
    <body>
      <h1>Email Preview</h1>
      <p>This endpoint renders an example email preview. In production, the email body is generated and sent via SMTP.</p>
    </body>
  </html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}


