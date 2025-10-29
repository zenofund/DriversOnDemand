import { PublicHeader } from '@/components/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  BadgeCheck, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  DollarSign,
  Star,
  Users,
  BarChart3
} from 'lucide-react';
import heroImage from '@assets/generated_images/Professional_driver_hero_image_f5c9c031.png';
import appMockup from '@assets/generated_images/App_interface_mockup_image_e90c1c32.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-12 items-center min-h-[600px]">
            {/* Left: 60% */}
            <div className="lg:col-span-3 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Nigeria's Most Trusted Driver Platform</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold font-heading tracking-tight text-foreground">
                Hire Verified Drivers
                <span className="block text-primary mt-2">On Demand</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Connect with professional, verified drivers in your area. Transparent pricing, real-time tracking, and secure payments. Perfect for personal or business needs.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup?role=client">
                  <a>
                    <Button size="lg" className="w-full sm:w-auto" data-testid="hero-button-book-driver">
                      Book a Driver Now
                    </Button>
                  </a>
                </Link>
                <Link href="/auth/signup?role=driver">
                  <a>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="hero-button-become-driver">
                      Become a Driver
                    </Button>
                  </a>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">5,000+</p>
                  <p className="text-sm text-muted-foreground">Verified Drivers</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">4.8</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">50k+</p>
                  <p className="text-sm text-muted-foreground">Trips Completed</p>
                </div>
              </div>
            </div>

            {/* Right: 40% - Hero Image */}
            <div className="lg:col-span-2">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img 
                  src={heroImage} 
                  alt="Professional verified driver" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-heading text-foreground mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting started is simple. Whether you're booking a driver or becoming one, we've made the process seamless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* For Clients */}
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Search Nearby</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Enter your pickup location and destination. See available verified drivers in your area with live pricing.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <BadgeCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Book & Pay</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Select your preferred driver, confirm the booking, and pay securely through our platform with Paystack.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-8">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Track & Enjoy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track your driver's arrival in real-time. Enjoy your journey with a professional, verified driver.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* For Drivers */}
      <section id="for-drivers" className="py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold font-heading text-foreground mb-6">
                Earn More as a Verified Driver
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Join thousands of professional drivers earning consistent income with flexible schedules. Set your own rates and build your reputation.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">One-Time Verification</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Pay ₦5,000 verification fee once. Get verified and start earning immediately.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Keep 90% of Earnings</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      We only take 10% commission. Direct payouts to your account after each trip.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Flexible Schedule</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Work when you want. Go online/offline with a single tap. You're in control.
                    </p>
                  </div>
                </div>
              </div>

              <Link href="/auth/signup?role=driver">
                <a>
                  <Button size="lg" className="mt-8" data-testid="driver-section-signup">
                    Start Earning Today
                  </Button>
                </a>
              </Link>
            </div>

            <div className="relative">
              <img 
                src={appMockup} 
                alt="Driver dashboard interface" 
                className="rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-4xl font-bold text-foreground mb-2">5,000+</p>
              <p className="text-sm text-muted-foreground">Active Drivers</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-4xl font-bold text-foreground mb-2">50k+</p>
              <p className="text-sm text-muted-foreground">Trips Completed</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <p className="text-4xl font-bold text-foreground mb-2">4.8/5</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <p className="text-4xl font-bold text-foreground mb-2">20+</p>
              <p className="text-sm text-muted-foreground">Cities Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-heading text-foreground mb-4">Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">
              No hidden fees. Pay only for the time you need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">For Clients</h3>
                <p className="text-muted-foreground mb-6">Book professional drivers by the hour</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="text-2xl font-bold">From ₦2,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="font-medium">Included</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Methods</span>
                    <span className="font-medium">Cards, Bank Transfer</span>
                  </div>
                </div>

                <Link href="/auth/signup?role=client">
                  <a>
                    <Button className="w-full mt-6" data-testid="pricing-client-signup">
                      Get Started
                    </Button>
                  </a>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-2">For Drivers</h3>
                <p className="text-muted-foreground mb-6">Earn competitive rates with low commission</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Your Earnings</span>
                    <span className="text-2xl font-bold text-primary">90%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Commission</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Verification Fee</span>
                    <span className="font-medium">₦5,000 (one-time)</span>
                  </div>
                </div>

                <Link href="/auth/signup?role=driver">
                  <a>
                    <Button className="w-full mt-6" data-testid="pricing-driver-signup">
                      Start Earning
                    </Button>
                  </a>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold font-heading mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied clients and drivers using our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup?role=client">
              <a>
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="w-full sm:w-auto"
                  data-testid="cta-book-driver"
                >
                  Book a Driver
                </Button>
              </a>
            </Link>
            <Link href="/auth/signup?role=driver">
              <a>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="cta-become-driver"
                >
                  Become a Driver
                </Button>
              </a>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold font-heading">Drivers On Demand</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting verified drivers with clients across Nigeria.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#how-it-works" className="hover:text-foreground">How It Works</a></li>
                <li><a href="#for-drivers" className="hover:text-foreground">For Drivers</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Safety</a></li>
                <li><a href="#" className="hover:text-foreground">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Drivers On Demand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
