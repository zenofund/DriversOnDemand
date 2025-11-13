import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

export function PrivacyPolicy({ trigger, triggerClassName }: PrivacyPolicyProps) {
  const defaultTrigger = (
    <button
      type="button"
      className={triggerClassName || "hover:text-foreground transition-colors text-[13px]"}
      style={{ fontFamily: 'Poppins, sans-serif' }}
      data-testid="button-privacy-policy"
    >
      Privacy Policy
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-describedby="privacy-description">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Privacy Policy
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-5rem)] px-6 py-4">
          <div id="privacy-description" className="space-y-6 text-[13px] font-['Poppins'] text-muted-foreground pb-4">
            
            {/* Introduction */}
            <section>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Effective Date: November 13, 2025</p>
                <p className="font-semibold text-foreground">Last Updated: November 13, 2025</p>
                <p className="mt-4">
                  Draba (the "Platform"), powered by <strong>Zichlu Motors</strong>, is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our driver-on-demand platform, whether as a Client seeking transportation services or as a Driver providing services.
                </p>
                <p>
                  By accessing or using the Platform, you agree to the terms of this Privacy Policy. If you do not agree with our practices, please do not use the Platform.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">1. Contact Information</h2>
              <div className="space-y-2">
                <p><strong>Company:</strong> Zichlu Motors</p>
                <p><strong>Platform:</strong> Draba</p>
                <p><strong>Email:</strong> privacy@draba.ng</p>
                <p><strong>Address:</strong> Lagos, Nigeria</p>
                <p>
                  For privacy-related inquiries, data access requests, or concerns, please contact us using the information above.
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">2. Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">2.1 Personal Information You Provide</h3>
                  <p className="mb-2">When you register and use the Platform, we collect:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Account Information:</strong> Full name, email address, phone number, password (encrypted), and profile photo</li>
                    <li><strong>Client Verification Data:</strong> National Identification Number (NIN), selfie photo for identity matching via YouVerify API, date of birth, and address</li>
                    <li><strong>Driver Verification Data:</strong> Driver's license details, vehicle information (make, model, year, color, license plate), bank account details for payouts (verified via Paystack), and driver verification documents</li>
                    <li><strong>Payment Information:</strong> Payment card details (processed securely by Paystack), transaction history, and payout records</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">2.2 Location Data</h3>
                  <p className="mb-2">We collect precise geolocation data to provide core Platform services:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Real-Time Location:</strong> Continuous GPS tracking when Drivers are online or during active trips</li>
                    <li><strong>Trip Locations:</strong> Pickup and destination addresses, route information, and trip history</li>
                    <li><strong>Google Maps Integration:</strong> Location data is processed through Google Maps JavaScript API for address autocomplete, driver matching, mapping, and route calculation</li>
                    <li><strong>Background Location (Drivers):</strong> When online, Drivers' location is tracked in the background to facilitate real-time booking requests</li>
                  </ul>
                  <p className="mt-2 text-foreground">
                    <strong>Location Permission:</strong> You control location access through your device settings. Disabling location will prevent core Platform functionality.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">2.3 Usage and Device Information</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Device Data:</strong> Device type, operating system, browser type, device identifiers, IP address</li>
                    <li><strong>App Usage:</strong> Pages viewed, features used, time spent, click patterns, and interaction data</li>
                    <li><strong>OneSignal Player ID:</strong> Unique identifier for push notifications, automatically generated when you log in</li>
                    <li><strong>Session Data:</strong> Login times, session duration, and authentication tokens</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">2.4 Communications Data</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>In-App Chat:</strong> All messages sent through Supabase Realtime chat between Clients and Drivers, including timestamps and read status</li>
                    <li><strong>Support Communications:</strong> Emails, support tickets, and feedback you provide</li>
                    <li><strong>Ratings and Reviews:</strong> Feedback, ratings, and comments you submit after trips</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">2.5 Automatically Collected Data</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Cookies and Tracking:</strong> Session cookies for authentication, preferences, and analytics</li>
                    <li><strong>Log Data:</strong> Server logs including errors, performance metrics, and API requests</li>
                    <li><strong>Analytics:</strong> Aggregated usage statistics to improve Platform performance</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">3. How We Use Your Information</h2>
              <div className="space-y-2">
                <p>We use your information for the following purposes:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Service Delivery:</strong> Facilitate bookings, match Clients with nearby Drivers, enable real-time tracking, process payments, and complete trips</li>
                  <li><strong>Identity Verification:</strong> Verify Client identity via NIN and selfie matching to prevent fraud, verify Driver credentials and vehicle information</li>
                  <li><strong>Communication:</strong> Send booking confirmations, trip updates, payment receipts, enable in-app chat, deliver push notifications via OneSignal, send transactional emails via Resend</li>
                  <li><strong>Safety and Security:</strong> Monitor for fraudulent activity, investigate disputes and violations, enforce Terms of Service, protect against unauthorized access</li>
                  <li><strong>Payment Processing:</strong> Process payments via Paystack, manage escrow funds, distribute payouts to Drivers (80/20 split), handle refunds and disputes</li>
                  <li><strong>Platform Improvement:</strong> Analyze usage patterns, improve features and user experience, develop new services, conduct research and analytics</li>
                  <li><strong>Legal Compliance:</strong> Comply with Nigerian laws and regulations, respond to legal requests, protect our rights and interests, enforce agreements</li>
                  <li><strong>Customer Support:</strong> Respond to inquiries, resolve technical issues, provide assistance</li>
                </ul>
              </div>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">4. Third-Party Services and Data Sharing</h2>
              <div className="space-y-3">
                <p>We use the following third-party services to operate the Platform. Your data is shared with these providers as necessary:</p>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.1 Supabase (Database and Authentication)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> PostgreSQL database hosting, user authentication, real-time chat functionality</li>
                    <li><strong>Data Shared:</strong> All user account data, booking records, chat messages, location history, transaction logs</li>
                    <li><strong>Security:</strong> Row-Level Security (RLS) policies enforce access controls, data encrypted in transit and at rest</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com/privacy</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.2 Paystack (Payment Processing)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> Secure payment processing, bank account verification, payout distribution</li>
                    <li><strong>Data Shared:</strong> Payment card details, transaction amounts, bank account information, payout records</li>
                    <li><strong>PCI Compliance:</strong> Paystack is PCI-DSS compliant; we do not store raw card details</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">paystack.com/privacy</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.3 Google Maps API (Location Services)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> Address autocomplete, interactive maps, real-time driver tracking, route calculation</li>
                    <li><strong>Data Shared:</strong> Geolocation coordinates, addresses, route data, map interactions</li>
                    <li><strong>Google's Terms:</strong> Your use of maps is subject to Google's privacy policies</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">policies.google.com/privacy</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.4 YouVerify (Identity Verification)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> Client NIN verification, selfie matching, fraud prevention</li>
                    <li><strong>Data Shared:</strong> National Identification Number, selfie photo, full name, date of birth</li>
                    <li><strong>Verification Process:</strong> YouVerify validates NIN against government databases and performs facial recognition</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://youverify.co/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">youverify.co/privacy-policy</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.5 OneSignal (Push Notifications)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> Deliver push notifications for bookings, payments, chat messages, and alerts</li>
                    <li><strong>Data Shared:</strong> Player ID, device information, notification content</li>
                    <li><strong>Control:</strong> Manage notification preferences in Settings or disable via device OS settings</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://onesignal.com/privacy_policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">onesignal.com/privacy_policy</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.6 Resend (Email Communications)</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Purpose:</strong> Send transactional emails including booking confirmations, receipts, and account notifications</li>
                    <li><strong>Data Shared:</strong> Email addresses, email content, delivery status</li>
                    <li><strong>Email Logs:</strong> We log all sent emails for troubleshooting and audit purposes</li>
                    <li><strong>Privacy Policy:</strong> <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/legal/privacy-policy</a></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data Disclosure */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">5. When We Disclose Your Information</h2>
              <div className="space-y-2">
                <p>We may disclose your information in the following circumstances:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Between Clients and Drivers:</strong> When a booking is made, we share necessary information (name, photo, phone number, location) between Client and Driver to facilitate service</li>
                  <li><strong>With Service Providers:</strong> Third-party vendors listed in Section 4 who assist in Platform operations</li>
                  <li><strong>Legal Obligations:</strong> When required by law, court order, subpoena, or government request</li>
                  <li><strong>Safety and Protection:</strong> To protect the safety of users, investigate fraud, enforce our Terms, or protect our legal rights</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                </ul>
                <p className="mt-2 font-semibold text-foreground">
                  We do NOT sell your personal information to third parties for advertising or marketing purposes.
                </p>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">6. Data Security</h2>
              <div className="space-y-2">
                <p>We implement industry-standard security measures to protect your information:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Encryption:</strong> Data is encrypted in transit using HTTPS/TLS and at rest in our database</li>
                  <li><strong>Access Controls:</strong> Row-Level Security (RLS) policies in Supabase restrict data access to authorized users only</li>
                  <li><strong>Authentication:</strong> Secure password hashing, session management, and token-based authentication</li>
                  <li><strong>Payment Security:</strong> PCI-DSS compliant payment processing through Paystack; we never store raw card details</li>
                  <li><strong>Monitoring:</strong> Automated systems monitor for suspicious activity and unauthorized access attempts</li>
                  <li><strong>Regular Audits:</strong> Periodic security reviews and vulnerability assessments</li>
                </ul>
                <p className="mt-2">
                  However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">7. Your Privacy Rights</h2>
              <div className="space-y-2">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information through Settings or by contacting us</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data (subject to legal retention requirements)</li>
                  <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Withdraw Consent:</strong> Opt out of marketing communications, disable notifications, or revoke location permissions</li>
                  <li><strong>Object to Processing:</strong> Object to certain uses of your data, such as analytics</li>
                  <li><strong>Lodge a Complaint:</strong> File a complaint with the Nigeria Data Protection Commission (NDPC) if you believe we've violated your rights</li>
                </ul>
                <p className="mt-2">
                  To exercise these rights, contact us at privacy@draba.ng. We will respond within 30 days.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">8. Data Retention</h2>
              <div className="space-y-2">
                <p>We retain your information for as long as necessary to provide services and comply with legal obligations:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
                  <li><strong>Closed Accounts:</strong> After account deletion, most data is removed within 90 days</li>
                  <li><strong>Transaction Records:</strong> Payment and booking records retained for 7 years for tax and legal compliance</li>
                  <li><strong>Chat History:</strong> In-app messages retained for 12 months for dispute resolution</li>
                  <li><strong>Location Data:</strong> Trip location history retained for 12 months unless earlier deletion is requested</li>
                  <li><strong>Legal Holds:</strong> Data involved in disputes, investigations, or legal proceedings retained until resolution</li>
                </ul>
                <p className="mt-2">
                  You can request early deletion of certain data types by contacting us, subject to our legal and operational requirements.
                </p>
              </div>
            </section>

            {/* Location Data Details */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">9. Location Data and Tracking</h2>
              <div className="space-y-2">
                <p><strong>9.1 How Location Data is Used:</strong></p>
                <ul className="list-disc ml-6 space-y-1 mb-3">
                  <li>Match Clients with nearby available Drivers</li>
                  <li>Display Driver location on map in real-time during trips</li>
                  <li>Calculate routes, distances, and estimated arrival times</li>
                  <li>Verify trip completion and service delivery</li>
                  <li>Analyze platform usage and optimize driver coverage areas</li>
                </ul>

                <p><strong>9.2 Background Location Tracking (Drivers):</strong></p>
                <p className="mb-2">
                  When Drivers toggle "Online" status, the app tracks location in the background even when the app is not actively in use. This is essential for:
                </p>
                <ul className="list-disc ml-6 space-y-1 mb-3">
                  <li>Receiving booking requests based on proximity to Clients</li>
                  <li>Displaying real-time availability to nearby Clients</li>
                  <li>Providing accurate ETAs and trip tracking</li>
                </ul>
                <p>
                  Drivers can stop background tracking by toggling "Offline" in the app.
                </p>

                <p className="mt-3"><strong>9.3 Location Permissions:</strong></p>
                <p>
                  You control location access through device settings. For Android users, choose "Allow all the time" for Drivers or "Allow only while using the app" for Clients. iOS users can select "Always" or "While Using App" respectively.
                </p>

                <p className="mt-3"><strong>9.4 Location Data Sharing:</strong></p>
                <p>
                  Location data is shared with Google Maps API for mapping services and with your trip counterpart (Client or Driver) to facilitate service. We do not sell location data to third parties.
                </p>
              </div>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">10. Children's Privacy</h2>
              <div className="space-y-2">
                <p>
                  The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
                </p>
                <p>
                  To use the Platform as a Client, you must be at least 18 years old and provide a valid National Identification Number (NIN). To serve as a Driver, you must be at least 21 years old with a valid driver's license.
                </p>
                <p>
                  If we discover that we have inadvertently collected information from someone under 18, we will delete it immediately. If you believe a child has provided us with personal information, contact us at privacy@draba.ng.
                </p>
              </div>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">11. International Data Transfers</h2>
              <div className="space-y-2">
                <p>
                  Your information may be transferred to and processed in countries outside Nigeria where our third-party service providers operate, including:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>United States (Supabase, Google, OneSignal, Resend)</li>
                  <li>Ireland (Paystack data centers)</li>
                  <li>Other countries where our service providers maintain infrastructure</li>
                </ul>
                <p className="mt-2">
                  These countries may have different data protection laws than Nigeria. However, we ensure that appropriate safeguards are in place through contracts, standard clauses, and by selecting providers with strong privacy practices.
                </p>
              </div>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">12. Changes to This Privacy Policy</h2>
              <div className="space-y-2">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons.
                </p>
                <p>
                  When we make material changes, we will:
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Update the "Last Updated" date at the top of this policy</li>
                  <li>Notify you via email or push notification</li>
                  <li>Display a prominent notice in the Platform</li>
                  <li>Request your consent if required by law</li>
                </ul>
                <p className="mt-2">
                  Continued use of the Platform after changes constitutes acceptance of the updated Privacy Policy. We encourage you to review this policy periodically.
                </p>
              </div>
            </section>

            {/* Nigeria Data Protection Compliance */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">13. Nigeria Data Protection Compliance</h2>
              <div className="space-y-2">
                <p>
                  We comply with the Nigeria Data Protection Regulation (NDPR) 2019 and all applicable Nigerian data protection laws.
                </p>
                <p><strong>Your Rights Under NDPR:</strong></p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Right to be informed about data collection and use</li>
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to object to processing</li>
                  <li>Right to data portability</li>
                  <li>Right to withdraw consent</li>
                </ul>
                <p className="mt-2">
                  To file a complaint with the Nigeria Data Protection Commission (NDPC), visit <a href="https://ndpb.gov.ng" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ndpb.gov.ng</a>
                </p>
              </div>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">14. Contact Us</h2>
              <div className="space-y-2">
                <p>
                  If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="mt-3 space-y-1">
                  <p><strong>Email:</strong> privacy@draba.ng</p>
                  <p><strong>Support:</strong> support@draba.ng</p>
                  <p><strong>Company:</strong> Zichlu Motors</p>
                  <p><strong>Platform:</strong> Draba</p>
                  <p><strong>Address:</strong> Lagos, Nigeria</p>
                </div>
                <p className="mt-3">
                  We will respond to your inquiry within 30 days.
                </p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="border-t pt-4 mt-6">
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  By using Draba, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
                </p>
                <p className="text-xs">
                  © 2025 Draba. Powered by Zichlu Motors. All rights reserved.
                </p>
              </div>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
