'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, Filter, ChevronRight, User, Building2, Calendar, MessageSquare, Link } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EmailStatus from '@/components/email-status';

type Message = {
  id: string;
  ticketId: string;
  subject: string;
  sender: string;
  email: string;
  company: string;
  date: string;
  status: string;
  priority: string;
  preview: string;
  description: string;
  attachments?: string[];
  regionalManager?: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedMessages = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Ticket priority:', data.priority, 'for ticket:', doc.id);
          console.log('Attachments:', data.attachments, 'for ticket:', doc.id);
          return {
            id: doc.id,
            ticketId: data.ticketId || doc.id,
            subject: data.subject || 'No Subject',
            sender: data.contactPerson || 'Unknown Sender',
            email: data.email || 'No Email',
            company: data.companyName || 'Unknown Company',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'No Date',
            status: data.status || 'Open',
            priority: data.priority || 'Medium',
            description: data.description || '',
            preview: data.description ? (data.description.substring(0, 60) + '...') : 'No content',
            attachments: data.attachments || [],
            regionalManager: data.regionalManager || ''
          };
        });
        
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Message List */}
      <div className="w-1/3 bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#ee3035]" />
            Inbox
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full bg-[#3A3D45] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-[#ee3035] outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              onClick={() => setSelectedMessage(msg.id)}
              className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-[#3A3D45] ${selectedMessage === msg.id ? 'bg-[#3A3D45] border-l-4 border-l-[#ee3035]' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white text-sm truncate">{msg.sender}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{msg.date}</span>
              </div>
              <div className="text-xs text-gray-400 truncate mb-1">{msg.email}</div>
              <div className="text-sm font-medium text-gray-300 truncate mb-1">{msg.subject}</div>
              <div className="text-xs text-gray-500 truncate">{msg.preview}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  msg.priority === 'Critical' || msg.priority === 'Urgent (equipment stopped)' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                  msg.priority === 'High' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
                  msg.priority === 'Medium' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                  'bg-green-500/30 text-green-300 border border-green-500/50'
                }`}>
                  {msg.priority}
                </span>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  {msg.ticketId}
                </span>
                {msg.attachments && msg.attachments.length > 0 && (
                  <span className="text-[10px] bg-blue-700/50 text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    {msg.attachments.length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 bg-[#2C2F36] rounded-xl border border-gray-700 overflow-hidden flex flex-col">
        {selectedMessage ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {messages.find(m => m.id === selectedMessage)?.subject}
                </h2>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[#3A3D45] text-gray-300 rounded hover:bg-[#ee3035] hover:text-white transition-colors text-sm">
                    Reply
                  </button>
                  <button className="px-3 py-1.5 bg-[#3A3D45] text-gray-300 rounded hover:bg-[#ee3035] hover:text-white transition-colors text-sm">
                    Assign
                  </button>
                </div>
              </div>
              
              {/* Email-style header */}
              <div className="bg-[#3A3D45]/50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">From:</span>
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.sender} ({messages.find(m => m.id === selectedMessage)?.company})</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">Email:</span>
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.email}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">Date:</span>
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.date}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">Priority:</span>
                  <span className={`font-medium ${
                    messages.find(m => m.id === selectedMessage)?.priority === 'Critical' || messages.find(m => m.id === selectedMessage)?.priority === 'Urgent (equipment stopped)' ? 'text-red-400' :
                    messages.find(m => m.id === selectedMessage)?.priority === 'High' ? 'text-orange-400' :
                    messages.find(m => m.id === selectedMessage)?.priority === 'Medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {messages.find(m => m.id === selectedMessage)?.priority}
                  </span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">Status:</span>
                  <span className="text-white flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      messages.find(m => m.id === selectedMessage)?.status === 'Open' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    {messages.find(m => m.id === selectedMessage)?.status}
                  </span>
                </div>
                {messages.find(m => m.id === selectedMessage)?.regionalManager && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Regional Manager:</span>
                    <span className="text-white">{messages.find(m => m.id === selectedMessage)?.regionalManager}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-[#3A3D45]/30">
              {/* Email body */}
              <div className="bg-white rounded-lg p-6 text-gray-900 min-h-[200px]">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {messages.find(m => m.id === selectedMessage)?.description || 'No description provided.'}
                </div>

              {/* Email Status Component */}
              <div className="mt-6">
                <EmailStatus 
                  ticketId={messages.find(m => m.id === selectedMessage)?.ticketId || ''} 
                  email={messages.find(m => m.id === selectedMessage)?.email || ''} 
                />
              </div>
              </div>
              
              {messages.find(m => m.id === selectedMessage)?.attachments && messages.find(m => m.id === selectedMessage)!.attachments!.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {messages.find(m => m.id === selectedMessage)!.attachments!.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-[#3A3D45] rounded">
                        <Link className="h-4 w-4 text-gray-400" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm truncate flex-1"
                        >
                          {url.split('/').pop() || `Attachment ${index + 1}`}
                        </a>
                        <span className="text-xs text-gray-500">
                          {url.includes('supabase') ? 'Supabase' : 'External'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">Select a message to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
