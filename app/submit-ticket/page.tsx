import TicketForm from "@/components/ticket-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SubmitTicketPage() {
  return (
    <div className="bg-white min-h-screen selection:bg-red-100 selection:text-red-600 overflow-x-hidden">
      {/* Background Effects - Lighter/Subtle */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-red-50 opacity-50 blur-[100px]"></div>
        <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-gray-50 opacity-50 blur-[100px]"></div>
      </div>

      <div className="relative pb-24 sm:pb-32 border-b border-gray-100">
        
        <header className="py-6 relative z-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="group flex h-10 w-10 items-center justify-center rounded-full bg-white hover:bg-red-50 transition-all">
                  <ArrowLeft className="h-5 w-5 text-red-600 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">New <span className="text-red-600">Support Ticket</span></h1>
                  <p className="text-gray-600 text-sm">Submit your issue for immediate assistance</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                 <div className="relative h-10 w-auto">
                    <img src="/inoksan.svg" alt="Inoksan Support" className="h-full w-auto object-contain" />
                  </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="-mt-24 relative z-10">
        <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                   <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                      Support Portal
                   </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Submit a <span className="text-red-600">Request</span></h2>
                <p className="mt-2 text-base text-gray-600">
                  Please fill out the details below. Fields marked with * are required.
                </p>
              </div>
              
              <TicketForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
