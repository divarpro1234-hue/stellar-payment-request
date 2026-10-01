'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calculator,
  CircleDollarSign,
  Hexagon,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';

const navigation = [
  { href: '/app/request', label: 'Solicitud', icon: WalletCards },
  { href: '/app/trustline', label: 'Trustline', icon: Hexagon },
  { href: '/app/calculator', label: 'Calculadora', icon: Calculator },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <header className="topbar">
        <Link
          className="brand"
          href="/app/request"
          aria-label="Stellar Desk, generador de solicitudes"
        >
          <span className="brand-mark" aria-hidden="true">
            <CircleDollarSign size={20} strokeWidth={2.3} />
          </span>
          <span className="brand-copy">
            <span className="brand-name">Stellar Desk</span>
            <span className="brand-subtitle">Payment operations</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Herramientas">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              className={`nav-link${pathname === href ? ' active' : ''}`}
              href={href}
              key={href}
              aria-current={pathname === href ? 'page' : undefined}
              title={label}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <span className="network-pill">
          <span className="network-dot" />
          TESTNET
        </span>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
