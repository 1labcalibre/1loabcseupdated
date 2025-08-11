import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple token storage (in production, use Redis or proper cache)
declare global {
  var approvalTokens: Map<string, any> | undefined
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const certificateId = searchParams.get('certificateId')

    if (!token || !certificateId) {
      return NextResponse.json(
        { error: 'Token and certificate ID are required' },
        { status: 400 }
      )
    }

    // Get token data from our simple storage
    const tokenStorage = global.approvalTokens || new Map()
    const tokenData = tokenStorage.get(token)
    
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 403 }
      )
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      tokenStorage.delete(token)
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 403 }
      )
    }
    
    // Verify certificate ID matches
    if (tokenData.certificateId !== certificateId) {
      return NextResponse.json(
        { error: 'Token does not match certificate' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      certificateData: tokenData.certificateData
    })

  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


