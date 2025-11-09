import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  BadgeCheck, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Star,
  Zap
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section - Mobile First */}
      <section className="relative pt-20 pb-12 px-4 sm:pt-24 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-24 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10" />
        
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-6 sm:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/20">
              <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary">Nigeria's Most Trusted Driver Platform</span>
            </div>
            
            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground px-4">
              Hire Verified Drivers
              <span className="block text-primary mt-1 sm:mt-2">On Demand</span>
            </h1>
            
            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4 leading-relaxed">
              Connect with professional, verified drivers in your area. Real-time tracking, transparent pricing, and secure payments.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 pt-2">
              <Button size="lg" className="w-full sm:w-auto text-sm sm:text-base" data-testid="hero-button-book-driver" asChild>
                <Link href="/auth/signup?role=client">Book a Driver Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base" data-testid="hero-button-become-driver" asChild>
                <Link href="/auth/signup?role=driver">Become a Driver</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 pt-6 sm:pt-8 md:pt-12 max-w-3xl mx-auto px-4">
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">5k+</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Drivers</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">4.8</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Rating</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">50k+</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Trips</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* For Clients */}
            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Find Nearby Drivers</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Search for verified drivers in your location with live availability and transparent rates.
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Verified & Secure</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                All drivers are verified professionals. Pay securely with Paystack - held in escrow until trip completion.
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Track your driver's arrival and your journey in real-time with live GPS updates.
              </p>
            </Card>

            {/* For Drivers */}
            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Instant Payouts</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Earn 90% of your rates. Automatic payouts to your bank account after each completed trip.
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BadgeCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">One-Time Verification</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                ₦5,000 verification fee once. Get verified and start earning immediately with flexible hours.
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover-elevate">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Build Your Reputation</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Set your own rates, receive ratings, and grow your client base on the platform.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 px-4">
            Join thousands using our trusted driver platform
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="w-full sm:w-auto text-sm sm:text-base"
              data-testid="cta-book-driver"
              asChild
            >
              <Link href="/auth/signup?role=client">Book a Driver</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-sm sm:text-base bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              data-testid="cta-become-driver"
              asChild
            >
              <Link href="/auth/signup?role=driver">Become a Driver</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-4 px-4 border-t bg-background">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Draba. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
