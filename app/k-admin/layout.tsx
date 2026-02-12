
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, MessageSquare, Settings, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#3A3D45] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2C2F36] border-r border-gray-700 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-700 flex justify-center">
          <div className="relative h-12 w-40">
            <Image 
              src="/inoksan.svg" 
              alt="Inoksan Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/k-admin" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/k-admin' 
                ? 'bg-[#ee3035] text-white' 
                : 'text-gray-300 hover:bg-[#ee3035] hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          <Link 
            href="/k-admin/messages" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/k-admin/messages' 
                ? 'bg-[#ee3035] text-white' 
                : 'text-gray-300 hover:bg-[#ee3035] hover:text-white'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Messages</span>
          </Link>
          
          <Link 
            href="/k-admin/settings" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/k-admin/settings' 
                ? 'bg-[#ee3035] text-white' 
                : 'text-gray-300 hover:bg-[#ee3035] hover:text-white'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-[#ee3035] w-full transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
