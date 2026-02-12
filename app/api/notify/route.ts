import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';

// Alternative notification system using Firebase
export async function POST(request: Request) {
  try {
    const { 
      ticketId, 
      email, 
      companyName, 
      contactPerson, 
      subject, 
      description,
      priority,
      country,
      equipmentType,
      regionalManager
    } = await request.json();

    if (!ticketId || !email || !companyName || !contactPerson || !subject) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Create notification in Firebase
    const notificationData = {
      ticketId,
      email,
      companyName,
      contactPerson,
      subject,
      description,
      priority,
      country,
      equipmentType,
      regionalManager,
      status: 'pending',
      type: 'ticket_notification',
      createdAt: serverTimestamp(),
      attempts: 0,
      maxAttempts: 3
    };

    const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);

    // Try to send via email first
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/brevo-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId, email, companyName, contactPerson, subject, description,
          priority, country, equipmentType, regionalManager
        })
      });

      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        // Update notification as sent
        await addDoc(collection(db, 'notifications'), {
          ...notificationData,
          status: 'sent_via_email',
          sentAt: serverTimestamp(),
          emailMessageId: emailResult.supportEmail?.id
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Notification sent via email',
          method: 'email',
          notificationId: notificationRef.id
        });
      }
    } catch (emailError) {
      console.error('Email sending failed, falling back to notification system:', emailError);
    }

    // If email fails, create notification for manual processing
    return NextResponse.json({ 
      success: true, 
      message: 'Notification queued for manual processing',
      method: 'notification_queue',
      notificationId: notificationRef.id,
      note: 'Email service unavailable. Check admin dashboard for pending notifications.'
    });

  } catch (error) {
    console.error('Notification creation failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get pending notifications
export async function GET() {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'), 
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    const pendingNotifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      success: true, 
      pending: pendingNotifications,
      count: pendingNotifications.length
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}