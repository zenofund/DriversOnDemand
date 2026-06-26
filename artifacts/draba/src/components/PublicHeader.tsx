import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>

          {/* Desktop Navigation - removed, simplified header */}
          <div className="flex-1"></div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" data-testid="button-login" asChild>
              <Link href="/auth/login">Log In</Link>
            </Button>
            <Button data-testid="button-signup" asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <div className="flex flex-col gap-2 px-4">
              <Button variant="ghost" className="w-full" data-testid="button-login-mobile" asChild>
                <Link href="/auth/login">Log In</Link>
              </Button>
              <Button className="w-full" data-testid="button-signup-mobile" asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
