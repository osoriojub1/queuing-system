import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, Users, ArrowRight, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900">

      {/* Branding */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-xl mb-6 inline-block border border-white/10 shadow-2xl">
          <Image
            src="/logo.png"
            alt="Hospital Logo"
            width={80}
            height={80}
            className="rounded-xl"
          />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">
          Staff <span className="text-blue-500">Portal</span>
        </h1>
        <p className="text-slate-400 font-medium tracking-wide">VDH Queuing & Dispatch System</p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-in fade-in zoom-in duration-500">

        {/* Front Desk Card */}
        <Link
          href="/front-desk"
          className="group relative overflow-hidden bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2rem] hover:border-blue-500/50 transition-all hover:bg-slate-800 flex flex-col items-start"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={120} />
          </div>
          <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-400 mb-6 group-hover:scale-110 transition-transform">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Front Desk</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-[200px]">
            Register new patients, print QR tickets, and manage queue entries.
          </p>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest mt-auto">
            Open Application <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </Link>

        {/* Dispatcher Card */}
        <Link
          href="/dispatcher"
          className="group relative overflow-hidden bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-[2rem] hover:border-purple-500/50 transition-all hover:bg-slate-800 flex flex-col items-start"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <LayoutDashboard size={120} />
          </div>
          <div className="bg-purple-500/10 p-4 rounded-2xl text-purple-400 mb-6 group-hover:scale-110 transition-transform">
            <LayoutDashboard size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Dispatcher</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-[200px]">
            Monitor live queues, call next patients, and manage service status.
          </p>
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-widest mt-auto">
            Go to Dashboard <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </Link>

      </div>

      {/* Footer / Sign Out */}
      <div className="mt-12 flex flex-col items-center gap-6">
        <Link
          href="/display"
          target="_blank"
          className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.2em] border-b border-slate-800 pb-1"
        >
          Open Public Display View
        </Link>

        <form action={signOut}>
          <button className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all border border-slate-700 hover:border-red-500/50">
            <LogOut size={16} /> Sign Out
          </button>
        </form>
      </div>

    </div>
  );
}
