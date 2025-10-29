import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X, BadgeCheck } from 'lucide-react';
import { useState } from 'react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 text-xl font-bold font-heading">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <BadgeCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-foreground">Drivers On Demand</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#for-drivers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              For Drivers
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>5,000+ Verified Drivers</span>
            </div>
            <Link href="/auth/login">
              <a>
                <Button variant="ghost" data-testid="button-login">
                  Log In
                </Button>
              </a>
            </Link>
            <Link href="/auth/signup?role=driver">
              <a>
                <Button variant="default" data-testid="button-signup-driver">
                  Sign Up as Driver
                </Button>
              </a>
            </Link>
            <Link href="/auth/signup?role=client">
              <a>
                <Button variant="secondary" data-testid="button-signup-client">
                  Book a Driver
                </Button>
              </a>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            <nav className="flex flex-col gap-2">
              <a href="#how-it-works" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover-elevate rounded-md">
                How It Works
              </a>
              <a href="#for-drivers" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover-elevate rounded-md">
                For Drivers
              </a>
              <a href="#pricing" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover-elevate rounded-md">
                Pricing
              </a>
            </nav>
            <div className="flex flex-col gap-2 px-4">
              <Link href="/auth/login">
                <a className="w-full">
                  <Button variant="ghost" className="w-full" data-testid="button-login-mobile">
                    Log In
                  </Button>
                </a>
              </Link>
              <Link href="/auth/signup?role=driver">
                <a className="w-full">
                  <Button variant="default" className="w-full" data-testid="button-signup-driver-mobile">
                    Sign Up as Driver
                  </Button>
                </a>
              </Link>
              <Link href="/auth/signup?role=client">
                <a className="w-full">
                  <Button variant="secondary" className="w-full" data-testid="button-signup-client-mobile">
                    Book a Driver
                  </Button>
                </a>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
