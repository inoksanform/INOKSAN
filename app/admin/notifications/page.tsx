'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, AlertCircle, CheckCircle, Clock, Send, RotateCcw } from 'lucide-react';

interface Notification {
  id: string;
  ticketId: string;
  email: string;
  companyName: string;
  contactPerson: string;
  subject: string;
  priority: string;
  country: string;
  status: 'pending' | 'sent_via_email' | 'failed';
  type: string;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
}

export default function NotificationsDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const resendNotification = async (notificationId: string) => {
    setProcessing(notificationId);
    
    try {
      const response = await fetch('/api/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from list or update status
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to resend notification:', error);
    } finally {
      setProcessing(null);
      fetchNotifications();
    }
  };

  const markAsProcessed = async (notificationId: string) => {
    setProcessing(notificationId);
    
    try {
      // Update notification status to processed
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, status: 'processed' })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to mark as processed:', error);
    } finally {
      setProcessing(null);
      fetchNotifications();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'urgent':
        return 'text-red-400 bg-red-900/30 border-red-700';
      case 'high':
        return 'text-orange-400 bg-orange-900/30 border-orange-700';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      case 'low':
        return 'text-green-400 bg-green-900/30 border-green-700';
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-700';
    }
  };

  const pendingNotifications = notifications.filter(n => n.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Email Notifications</h1>
          </div>
          <p className="text-gray-400">Manage pending email notifications and failed deliveries</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingNotifications.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-400">
                  {pendingNotifications.filter(n => n.priority === 'Critical' || n.priority === 'Urgent').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Priority</p>
                <p className="text-2xl font-bold text-orange-400">
                  {pendingNotifications.filter(n => n.priority === 'High').length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Queue</p>
                <p className="text-2xl font-bold text-blue-400">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Pending Notifications</h2>
          </div>
          
          {pendingNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-gray-400">No pending email notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {pendingNotifications.map((notification) => (
                <div key={notification.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{notification.subject}</h3>
                      <p className="text-gray-300 mb-2">{notification.companyName} - {notification.contactPerson}</p>
                      <p className="text-sm text-gray-400 mb-3">{notification.email}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {notification.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Attempts: {notification.attempts}/{notification.maxAttempts}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => resendNotification(notification.id)}
                        disabled={processing === notification.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        {processing === notification.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Resend
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => markAsProcessed(notification.id)}
                        disabled={processing === notification.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Done
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}