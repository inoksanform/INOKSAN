import Link from "next/link";
import { ArrowRight, Headphones, ShieldCheck, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-white min-h-screen selection:bg-red-100 selection:text-red-600 overflow-x-hidden">
      {/* Background Effects - Lighter/Subtle */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute right-0 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-red-50 opacity-50 blur-[100px]"></div>
        <div className="absolute left-0 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-gray-50 opacity-50 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0">
        <nav className="mx-auto flex max-w-4xl items-center justify-center p-4 lg:px-8" aria-label="Global">
          <div className="flex">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-3 group">
              <div className="relative h-12 w-auto">
                <img src="/inoksan.svg" alt="Inoksan Logo" className="h-full w-auto object-contain" />
              </div>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero section */}
        <div className="relative pt-12 pb-16 sm:pt-14 sm:pb-20">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl pb-2">
                Professional Kitchen <br/>
                <span className="text-[#ee3035]">Solutions & Support</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-600 max-w-xl mx-auto">
                Submit your technical issues directly to Inoksan&apos;s expert engineering team. 
                Track repair status, request spare parts, and ensure your kitchen never stops.
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-6">
                <Link
                  href="/submit-ticket"
                  className="rounded-full bg-[#ee3035] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-red-500/20 hover:bg-red-700 hover:scale-105 transition-all duration-300 flex items-center gap-2 group"
                >
                  Create Support Request 
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Stats/Visual Element Replacement */}
            <div className="mt-12 flow-root sm:mt-16">
              <div className="-m-2 rounded-xl bg-gray-50 p-2 ring-1 ring-inset ring-gray-200 lg:-m-4 lg:rounded-2xl lg:p-4">
                <div className="rounded-xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden relative min-h-[300px] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-red-50 to-gray-50 opacity-50"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 w-full max-w-3xl">
                    
                    {/* 1. Expert Consulting */}
                    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all group">
                       <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <Headphones className="h-8 w-8 text-[#ee3035]" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Expert Consulting</h3>
                       <p className="text-gray-500 mt-2">Direct access to factory-trained specialists for technical guidance.</p>
                    </div>

                    {/* 2. Genuine Parts */}
                    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all group">
                       <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <Settings className="h-8 w-8 text-[#ee3035]" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Genuine Parts</h3>
                       <p className="text-gray-500 mt-2">100% original components ensuring safety and longevity.</p>
                    </div>

                    {/* 3. Maintenance and Service Guarantee */}
                    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all group">
                       <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <ShieldCheck className="h-8 w-8 text-[#ee3035]" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Service Guarantee</h3>
                       <p className="text-gray-500 mt-2">Comprehensive maintenance and warranty on all service operations.</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </main>
    </div>
  );
}
