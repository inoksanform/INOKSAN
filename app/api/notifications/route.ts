import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Handle PATCH requests to update notification status
export async function PATCH(request: Request) {
  try {
    const { notificationId, status } = await request.json();
    
    if (!notificationId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notification ID and status are required' 
      }, { status: 400 });
    }

    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      status: status,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification status updated'
    });
  } catch (error) {
    console.error('Failed to update notification status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}