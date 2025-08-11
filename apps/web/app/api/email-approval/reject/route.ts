import { NextRequest, NextResponse } from "next/server"
import { certificatesService } from "@/lib/firebase/services/certificates"
import { emailService } from "@/lib/firebase/services/email"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")
    const certificateId = searchParams.get("id")

    if (!token || !certificateId) {
      return NextResponse.json({ error: "Missing token or certificate ID" }, { status: 400 })
    }

    // Verify token
    if (!emailService.verifyApprovalToken(token, certificateId)) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // Get certificate
    const certificate = await certificatesService.getById(certificateId)
    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
    }

    // Check if already processed
    if (certificate.status !== "awaiting_authentication") {
      return NextResponse.redirect(new URL(`/api/email-approval/status?status=already-processed&cert=${certificate.certificateNo}`, request.url))
    }

    // Reject certificate
    await certificatesService.reject(certificateId, "Email Approval System", "Rejected via email")

    // Redirect to status page
    return NextResponse.redirect(new URL(`/api/email-approval/status?status=rejected&cert=${certificate.certificateNo}`, request.url))
  } catch (error) {
    console.error("Error in email rejection:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


