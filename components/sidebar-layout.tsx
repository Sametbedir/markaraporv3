'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import BrandSwitcher from '@/components/brand-switcher';
import {
  LayoutDashboard, Upload, Activity, Settings, LogOut,
  BarChart3, Menu, X, ChevronRight, Target, Calculator, Compass, Swords, FileText, Store,
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/report', label: 'Müşteri Raporu', icon: FileText },
    { href: '/seo-geo', label: 'SEO & GEO Raporu', icon: Compass },
    { href: '/competitor', label: 'Rakip Analizi', icon: Swords },
    { href: '/goals', label: 'Hedeflerim', icon: Target },
    { href: '/simulation', label: 'Simülatör', icon: Calculator },
    { href: '/upload', label: 'Veri Yükle', icon: Upload },
    { href: '/uptime', label: 'Uptime Takibi', icon: Activity },
    { href: '/brands', label: 'Markalar', icon: Store },
    { href: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="print-hidden lg:hidden fixed top-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">MarkaRapor</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-20 h-full w-64 flex flex-col bg-card/95 backdrop-blur-xl border-r border-border
          transform transition-all duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}`}
      >
        <div className="relative p-6 border-b border-border overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">MarkaRapor</span>
            </div>
          </div>
          {session?.user && <BrandSwitcher onNavigate={() => setSidebarOpen(false)} />}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                )}
                <item.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-border bg-card/50">
          {session?.user && (
            <div className="px-4 py-2 mb-2">
              <p className="text-xs text-muted-foreground">Giriş yapan</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {session.user?.email}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ redirectTo: '/' })}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
