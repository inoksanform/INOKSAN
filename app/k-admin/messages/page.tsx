
'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, Filter, ChevronRight, User, Building2, Calendar, MessageSquare, Globe, Tag, Hash, FileText, Paperclip, ExternalLink } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Message = {
  id: string;
  ticketId: string;
  subject: string;
  sender: string;
  company: string;
  date: string;
  status: string;
  priority: string;
  preview: string;
  description: string;
  country: string;
  equipmentType: string;
  equipmentSerialNo: string;
  orderInvoiceNo: string;
  issueType: string;
  attachments: string[];
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
          return {
            id: doc.id,
            ticketId: data.ticketId || doc.id,
            subject: data.subject || 'No Subject',
            sender: data.contactPerson || 'Unknown Sender',
            company: data.companyName || 'Unknown Company',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'No Date',
            status: data.status || 'Open',
            priority: data.priority || 'Medium',
            description: data.description || '',
            preview: data.description ? (data.description.substring(0, 60) + '...') : 'No content',
            country: data.country || 'Not specified',
            equipmentType: data.productModel || data.equipmentType || 'Not specified',
            equipmentSerialNo: data.equipmentSerialNo || 'Not specified',
            orderInvoiceNo: data.orderInvoiceNo || 'Not specified',
            issueType: data.issueType || 'Not specified',
            attachments: data.attachments || []
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
              <div className="text-sm font-medium text-gray-300 truncate mb-1">{msg.subject}</div>
              <div className="text-xs text-gray-500 truncate">{msg.preview}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  msg.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                  msg.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {msg.priority}
                </span>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  {msg.ticketId}
                </span>
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
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="h-4 w-4" />
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.sender}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Building2 className="h-4 w-4" />
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.company}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.date}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${
                    messages.find(m => m.id === selectedMessage)?.status === 'Open' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <span className="text-white">{messages.find(m => m.id === selectedMessage)?.status}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-[#3A3D45]/30 space-y-8">
              {/* Detailed Description */}
              <div>
                <h3 className="text-sm font-semibold text-[#ee3035] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detailed Description
                </h3>
                <div className="bg-[#2C2F36] p-4 rounded-lg border border-gray-700">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {messages.find(m => m.id === selectedMessage)?.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Equipment & Issue Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#ee3035] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Equipment Details
                  </h3>
                  <div className="bg-[#2C2F36] p-4 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex justify-between border-b border-gray-700 pb-2">
                      <span className="text-gray-500 text-xs">Model</span>
                      <span className="text-gray-200 text-sm">{messages.find(m => m.id === selectedMessage)?.equipmentType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-700 pb-2">
                      <span className="text-gray-500 text-xs">Serial No</span>
                      <span className="text-gray-200 text-sm">{messages.find(m => m.id === selectedMessage)?.equipmentSerialNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Invoice/Order No</span>
                      <span className="text-gray-200 text-sm">{messages.find(m => m.id === selectedMessage)?.orderInvoiceNo}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#ee3035] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Issue Details
                  </h3>
                  <div className="bg-[#2C2F36] p-4 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex justify-between border-b border-gray-700 pb-2">
                      <span className="text-gray-500 text-xs">Issue Type</span>
                      <span className="text-gray-200 text-sm">{messages.find(m => m.id === selectedMessage)?.issueType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-700 pb-2">
                      <span className="text-gray-500 text-xs">Country</span>
                      <span className="text-gray-200 text-sm">{messages.find(m => m.id === selectedMessage)?.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-xs">Priority</span>
                      <span className={`text-sm ${
                        messages.find(m => m.id === selectedMessage)?.priority === 'High' ? 'text-red-400' :
                        messages.find(m => m.id === selectedMessage)?.priority === 'Medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>{messages.find(m => m.id === selectedMessage)?.priority}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {messages.find(m => m.id === selectedMessage)?.attachments && (messages.find(m => m.id === selectedMessage)?.attachments?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#ee3035] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {messages.find(m => m.id === selectedMessage)?.attachments.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-[#2C2F36] p-3 rounded-lg border border-gray-700 hover:border-[#ee3035] transition-colors group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="text-xs text-gray-300 truncate">Attachment {idx + 1}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-[#ee3035]" />
                      </a>
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
