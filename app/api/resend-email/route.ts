import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { ticketId, email, toEmail } = await request.json();
    
    if (!ticketId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ticket ID is required' 
      }, { status: 400 });
    }

    // Get ticket data from Firestore
    const ticketsQuery = query(collection(db, 'tickets'), where('ticketId', '==', ticketId));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    
    if (ticketsSnapshot.empty) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ticket not found' 
      }, { status: 404 });
    }

    const ticketDoc = ticketsSnapshot.docs[0];
    const ticketData = ticketDoc.data();
    
    // Check if email was previously sent
    const emailHistory = ticketData.emailHistory || [];
    const lastEmail = emailHistory[emailHistory.length - 1];
    
    // Prepare email data
    const emailData = {
      email: email || ticketData.email,
      ticketId: ticketId,
      companyName: ticketData.companyName,
      contactPerson: ticketData.contactPerson,
      subject: ticketData.subject,
      description: ticketData.description,
      country: ticketData.country,
      phoneNumber: ticketData.phoneNumber || '',
      equipmentType: ticketData.productModel,
      priority: ticketData.priority,
      regionalManager: ticketData.regionalManager,
      isResend: true,
      resendCount: emailHistory.length,
      toEmail: toEmail
    };

    // Call the send-email API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });

    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      // Update ticket with email history
      const newEmailEntry = {
        timestamp: new Date().toISOString(),
        success: true,
        recipients: emailResult.supportEmail?.recipients || [emailData.email],
        messageId: emailResult.supportEmail?.id,
        type: 'resend'
      };
      
      await updateDoc(ticketDoc.ref, {
        emailHistory: [...emailHistory, newEmailEntry],
        lastEmailSent: new Date().toISOString(),
        emailStatus: 'sent'
      });
      
      return NextResponse.json({
        success: true,
        message: 'Email resent successfully',
        emailResult: emailResult,
        resendCount: emailHistory.length + 1
      });
    } else {
      // Update ticket with failed email attempt
      const failedEmailEntry = {
        timestamp: new Date().toISOString(),
        success: false,
        error: emailResult.error,
        type: 'resend_failed'
      };
      
      await updateDoc(ticketDoc.ref, {
        emailHistory: [...emailHistory, failedEmailEntry],
        emailStatus: 'failed'
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to resend email',
        details: emailResult.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Resend email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    
    if (!ticketId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ticket ID is required' 
      }, { status: 400 });
    }

    // Get ticket data from Firestore
    const ticketsQuery = query(collection(db, 'tickets'), where('ticketId', '==', ticketId));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    
    if (ticketsSnapshot.empty) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ticket not found' 
      }, { status: 404 });
    }

    const ticketData = ticketsSnapshot.docs[0].data();
    const emailHistory = ticketData.emailHistory || [];
    
    return NextResponse.json({
      success: true,
      ticketId: ticketId,
      emailStatus: ticketData.emailStatus || 'unknown',
      lastEmailSent: ticketData.lastEmailSent,
      emailHistory: emailHistory,
      canResend: emailHistory.length < 3 // Limit to 3 resends
    });
  } catch (error) {
    console.error('Get email status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}