import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple token storage (in production, use Redis or proper cache)
declare global {
  var approvalTokens: Map<string, any> | undefined
}

export async function GET(request: NextRequest) {
  try {
    const tokenStorage = global.approvalTokens || new Map()
    const pendingApprovals: any[] = []
    
    // Check all tokens for certificates that need status updates
    for (const [token, tokenData] of tokenStorage.entries()) {
      if (tokenData.certificateData && 
          (tokenData.certificateData.approvedVia === 'email' || tokenData.certificateData.rejectedVia === 'email') &&
          !tokenData.certificateData.synced) {
        
        const updates: any = {}
        
        if (tokenData.certificateData.status === 'approved') {
          updates.status = 'approved'
          updates.approvedAt = new Date()
          updates.approvedBy = 'Email Approval'
          updates.approvedVia = 'email'
        } else if (tokenData.certificateData.status === 'rejected') {
          updates.status = 'rejected'
          updates.rejectedAt = new Date()
          updates.rejectedBy = 'Email Approval'
          updates.rejectedVia = 'email'
        }
        
        if (Object.keys(updates).length > 0) {
          pendingApprovals.push({
            certificateId: tokenData.certificateId,
            updates: updates,
            token: token
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      pendingApprovals: pendingApprovals
    })

    
  } catch (error) {
    console.error('Error getting pending approvals:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { certificateId, token } = await request.json()
    
    if (!certificateId || !token) {
      return NextResponse.json(
        { success: false, error: 'Certificate ID and token are required' },
        { status: 400 }
      )
    }
    
    // Mark the certificate as synced in token storage
    const tokenStorage = global.approvalTokens || new Map()
    const tokenData = tokenStorage.get(token)
    
    if (tokenData) {
      tokenData.certificateData.synced = true
      tokenStorage.set(token, tokenData)
      console.log(`Marked certificate ${certificateId} as synced`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Certificate marked as synced'
    })
    
  } catch (error) {
    console.error('Error marking certificate as synced:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


