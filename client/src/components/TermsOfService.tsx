import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

interface TermsOfServiceProps {
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

export function TermsOfService({ trigger, triggerClassName }: TermsOfServiceProps) {
  const defaultTrigger = (
    <button
      type="button"
      className={triggerClassName || "hover:text-foreground transition-colors"}
      data-testid="button-terms-of-service"
    >
      Terms of Service
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-describedby="terms-description">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Terms of Service
          </DialogTitle>
        </DialogHeader>
        <p id="terms-description" className="sr-only">
          Read the complete Terms of Service for Draba platform powered by Zichlu Motors
        </p>
        <ScrollArea className="h-[calc(90vh-8rem)] px-6 py-4">
          <div className="space-y-6" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px', lineHeight: '1.6' }}>
            {/* Last Updated */}
            <p className="text-muted-foreground italic">
              Last Updated: November 13, 2025
            </p>

            {/* Introduction */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">1. Introduction</h2>
              <p className="mb-2">
                Welcome to <strong>Draba</strong>, a driver-on-demand platform operated by <strong>Zichlu Motors</strong>. 
                These Terms of Service ("Terms") govern your access to and use of the Draba platform, including our website, 
                mobile applications, and related services (collectively, the "Platform").
              </p>
              <p>
                By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree to these Terms, 
                please do not use the Platform.
              </p>
            </section>

            {/* Definitions */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">2. Definitions</h2>
              <ul className="space-y-2 ml-4">
                <li><strong>"Client"</strong> refers to individuals or entities who use the Platform to book professional drivers.</li>
                <li><strong>"Driver"</strong> refers to verified professional drivers who provide transportation services through the Platform.</li>
                <li><strong>"Booking"</strong> refers to a request for driver services made by a Client through the Platform.</li>
                <li><strong>"Trip"</strong> refers to the completed transportation service provided by a Driver to a Client.</li>
                <li><strong>"Platform Fee"</strong> refers to the commission charged by Draba for facilitating connections between Clients and Drivers.</li>
              </ul>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">3. Eligibility</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">3.1 General Requirements</h3>
                  <p>You must be at least 18 years old and capable of forming a binding contract to use the Platform.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3.2 Client Requirements</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Valid Nigerian National Identity Number (NIN) for identity verification</li>
                    <li>Completion of NIN verification process including selfie matching via YouVerify API</li>
                    <li>Valid payment method linked to your account</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3.3 Driver Requirements</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Valid driver's license issued in Nigeria</li>
                    <li>Successful completion of Draba's driver verification process</li>
                    <li>Payment of one-time verification fee of ₦5,000</li>
                    <li>Valid bank account for receiving payments</li>
                    <li>Professional driving experience</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">4. Account Registration and Security</h2>
              <div className="space-y-2">
                <p>4.1 You must provide accurate, current, and complete information during registration and keep your account information updated.</p>
                <p>4.2 You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
                <p>4.3 You must notify us immediately of any unauthorized use of your account or security breach.</p>
                <p>4.4 We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.</p>
              </div>
            </section>

            {/* Identity Verification */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">5. Identity Verification</h2>
              <div className="space-y-2">
                <p>5.1 All Clients must complete mandatory NIN verification before making their first booking.</p>
                <p>5.2 The verification process includes submitting your NIN and completing a selfie match via our third-party verification partner (YouVerify).</p>
                <p>5.3 Your NIN is stored securely in hashed format and used solely for identity verification purposes.</p>
                <p>5.4 Accounts may be locked after 3 failed verification attempts. Contact support to unlock your account.</p>
                <p>5.5 Drivers undergo a comprehensive verification process including license verification and background checks.</p>
              </div>
            </section>

            {/* Booking and Services */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">6. Booking and Transportation Services</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">6.1 Booking Process</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Clients can search for and book available Drivers based on location, rate, and ratings</li>
                    <li>Drivers may accept or decline booking requests at their discretion</li>
                    <li>Once accepted, both parties are expected to fulfill the booking terms</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">6.2 Driver Obligations</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Provide professional and courteous service</li>
                    <li>Arrive at pickup location on time</li>
                    <li>Maintain vehicle safety and cleanliness (if applicable)</li>
                    <li>Follow all traffic laws and regulations</li>
                    <li>Update availability status accurately on the Platform</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">6.3 Client Obligations</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Provide accurate pickup and destination information</li>
                    <li>Be ready at the designated pickup location at the scheduled time</li>
                    <li>Treat Drivers with respect and courtesy</li>
                    <li>Pay the agreed-upon fare through the Platform</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">6.4 Trip Completion</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Both Driver and Client must confirm trip completion</li>
                    <li>Clients can approve or decline Driver's completion confirmation</li>
                    <li>Declining completion requires a valid reason and creates a service quality dispute</li>
                    <li>If Client does not respond within 12 hours of Driver confirmation, the trip is automatically completed</li>
                    <li>Payment is processed only after both parties confirm completion or auto-completion occurs</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">7. Payment Terms</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">7.1 Payment Processing</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>All payments are processed securely through Paystack, our third-party payment processor</li>
                    <li>Accepted payment methods include debit cards, credit cards, and bank transfers</li>
                    <li>Payment is authorized at the time of booking but charged only after trip completion confirmation</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">7.2 Pricing and Fees</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Drivers set their own service rates per day or per trip</li>
                    <li>The total fare displayed at booking is the final amount charged</li>
                    <li>Draba charges a 20% platform fee on all completed trips (Driver receives 80% of the fare)</li>
                    <li>Driver verification fee: One-time payment of ₦5,000</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">7.3 Driver Payouts</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Drivers receive 80% of the trip fare after successful completion</li>
                    <li>Payouts are processed automatically to the Driver's verified bank account</li>
                    <li>Bank account details must be verified via Paystack before receiving payouts</li>
                    <li>Payout timing depends on payment processor policies</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">7.4 Refunds and Cancellations</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Cancellations made before Driver acceptance: Full refund</li>
                    <li>Cancellations made after Driver acceptance: Subject to cancellation policy and may incur fees</li>
                    <li>Disputed trips are not processed for payment until resolution</li>
                    <li>Refunds are processed to the original payment method within 5-10 business days</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Real-time Tracking */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">8. Real-Time Tracking and Location Services</h2>
              <div className="space-y-2">
                <p>8.1 <strong>Google Maps Integration:</strong> The Platform uses Google Maps JavaScript API to provide location-based services, including address autocomplete, driver search by proximity, real-time driver tracking on interactive maps, and route optimization for trips.</p>
                <p>8.2 <strong>Driver Location Tracking:</strong> When Drivers are online and available, or during active bookings, their real-time GPS location is tracked and displayed to Clients through Google Maps. This tracking is essential for matching Clients with nearby Drivers and providing live trip updates.</p>
                <p>8.3 <strong>Client Location:</strong> Clients provide pickup and destination locations which are used to match them with available Drivers and calculate trip routes. Location data is shared with the assigned Driver for service delivery.</p>
                <p>8.4 <strong>Data Retention:</strong> Location data associated with completed trips is stored in our database for record-keeping, dispute resolution, and service improvement. Historical location data may be retained for up to 12 months unless deletion is requested or required by law.</p>
                <p>8.5 <strong>Third-Party Sharing:</strong> Location data is processed by Google Maps API in accordance with Google's privacy policies. We do not sell or share location data with third parties for advertising or unrelated purposes.</p>
                <p>8.6 <strong>Location Permissions:</strong> You control location permissions through your device settings. Disabling location services will prevent you from using core Platform features including booking drivers (Clients) or receiving booking requests (Drivers).</p>
              </div>
            </section>

            {/* In-App Communication */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">9. In-App Communication and Real-Time Chat</h2>
              <div className="space-y-2">
                <p>9.1 <strong>Real-Time Chat System:</strong> The Platform provides real-time messaging functionality powered by Supabase Realtime, enabling instant communication between Clients and their assigned Drivers during active bookings. Chat is accessible through the booking details page for both parties.</p>
                <p>9.2 <strong>Permitted Use:</strong> In-app chat should be used exclusively for booking-related communication, including coordination of pickup locations, trip updates, delays, special instructions, and service-related questions. All communications must be professional, respectful, and relevant to the transportation service.</p>
                <p>9.3 <strong>Prohibited Content:</strong> The following are strictly prohibited in chat communications: harassment, threats, abusive language, discriminatory remarks, solicitation of off-platform services, sharing of personal contact information to bypass platform fees, spam, promotional content, and any illegal activities.</p>
                <p>9.4 <strong>Chat Records and Monitoring:</strong> All chat messages are stored in our database with timestamps and are associated with specific bookings. We implement Row-Level Security (RLS) to ensure only authorized parties (the Client, Driver, and administrators) can access conversation history. Messages are retained for 12 months for dispute resolution and quality assurance purposes.</p>
                <p>9.5 <strong>Safety Monitoring:</strong> We reserve the right to monitor, review, and analyze chat communications to ensure compliance with these Terms, investigate reported violations, resolve disputes, and maintain platform safety. Automated systems may flag messages containing prohibited content for manual review.</p>
                <p>9.6 <strong>Privacy:</strong> While chat messages are private between you and your booking counterpart, they are not end-to-end encrypted. Do not share sensitive personal information, financial details, or passwords through the chat system.</p>
                <p>9.7 <strong>Consequences of Violations:</strong> Violation of chat policies may result in warnings, temporary suspension, permanent account termination, or legal action depending on severity. Evidence of chat violations may be used in dispute resolution and reported to authorities if illegal activity is detected.</p>
              </div>
            </section>

            {/* Ratings and Reviews */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">10. Ratings and Reviews</h2>
              <div className="space-y-2">
                <p>10.1 After trip completion, both Clients and Drivers can rate and review each other.</p>
                <p>10.2 Ratings should be honest, fair, and based on the actual service experience.</p>
                <p>10.3 Reviews containing offensive language, personal attacks, or discriminatory content will be removed.</p>
                <p>10.4 Ratings contribute to Driver reputation and may affect their visibility on the Platform.</p>
                <p>10.5 Consistently low ratings may result in account review or suspension.</p>
              </div>
            </section>

            {/* Disputes */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">11. Dispute Resolution</h2>
              <div className="space-y-2">
                <p>11.1 Clients can raise disputes regarding service quality, payment issues, or Driver conduct.</p>
                <p>11.2 Disputes must be reported within 24 hours of trip completion.</p>
                <p>11.3 When a dispute is raised, payment is held until resolution.</p>
                <p>11.4 Our support team will review all evidence and make a fair determination.</p>
                <p>11.5 Dispute decisions are final, but you may appeal within 7 days with new evidence.</p>
              </div>
            </section>

            {/* Push Notifications */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">12. Push Notifications and Alerts</h2>
              <div className="space-y-2">
                <p>12.1 <strong>OneSignal Integration:</strong> The Platform uses OneSignal, a third-party push notification service, to deliver real-time alerts and updates directly to your device. When you use the Platform, a unique Player ID is automatically generated and registered with OneSignal to enable notifications.</p>
                <p>12.2 <strong>Notification Types:</strong> You may receive push notifications for:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Booking Updates:</strong> New booking requests (Drivers), booking acceptance/rejection, driver arrival notifications, trip start/completion confirmations</li>
                  <li><strong>Payment Alerts:</strong> Payment authorization, successful payment processing, payout confirmations (Drivers), refund notifications</li>
                  <li><strong>Chat Messages:</strong> New messages from your Driver or Client during active bookings</li>
                  <li><strong>Account Alerts:</strong> Verification status updates, security notifications, important policy changes</li>
                  <li><strong>System Updates:</strong> Maintenance schedules, new features, platform announcements</li>
                </ul>
                <p>12.3 <strong>Data Sharing with OneSignal:</strong> To deliver notifications, we share your Player ID, device information (type, operating system), and notification content with OneSignal. OneSignal processes this data according to their privacy policy. We do not share your personal information beyond what's necessary for notification delivery.</p>
                <p>12.4 <strong>Notification Preferences:</strong> You can customize notification preferences in your account settings, including enabling or disabling specific notification categories. However, you cannot disable all notifications as some are critical for platform operation.</p>
                <p>12.5 <strong>Critical Notifications:</strong> Certain notifications are considered essential and will be sent regardless of your preferences, including: security alerts (suspicious login attempts, password changes), booking confirmations and cancellations, payment authorizations and failures, account suspension or termination notices, and legal or compliance notifications.</p>
                <p>12.6 <strong>Opt-Out:</strong> You can disable push notifications entirely through your device's operating system settings, but this may significantly impact your Platform experience and ability to respond to time-sensitive events. Disabling notifications does not prevent in-app alerts or email communications.</p>
                <p>12.7 <strong>Player ID Management:</strong> Your Player ID is automatically registered when you log in and unregistered when you log out. If you switch devices, a new Player ID will be generated. You can view your current Player ID in Settings for troubleshooting purposes.</p>
              </div>
            </section>

            {/* Prohibited Conduct */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">13. Prohibited Conduct</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Use the Platform for any illegal or unauthorized purpose</li>
                <li>Provide false or misleading information</li>
                <li>Circumvent Platform payment systems or fees</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Interfere with Platform security features or operations</li>
                <li>Use automated scripts or bots to access the Platform</li>
                <li>Reverse engineer or copy any Platform features</li>
                <li>Share account credentials with others</li>
                <li>Discriminate based on race, religion, gender, or other protected characteristics</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">14. Intellectual Property</h2>
              <div className="space-y-2">
                <p>14.1 All Platform content, features, and functionality are owned by Zichlu Motors and protected by intellectual property laws.</p>
                <p>14.2 You are granted a limited, non-exclusive license to use the Platform for its intended purpose.</p>
                <p>14.3 You may not copy, modify, distribute, or create derivative works without our written permission.</p>
              </div>
            </section>

            {/* Privacy and Data Protection */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">15. Privacy and Data Protection</h2>
              <div className="space-y-2">
                <p>15.1 We collect and process personal data in accordance with Nigerian data protection laws.</p>
                <p>15.2 Your data is used to provide Platform services, process payments, and ensure safety.</p>
                <p>15.3 We implement industry-standard security measures to protect your data.</p>
                <p>15.4 We do not sell your personal information to third parties.</p>
                <p>15.5 For detailed information, please refer to our Privacy Policy.</p>
              </div>
            </section>

            {/* Liability and Disclaimers */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">16. Limitation of Liability</h2>
              <div className="space-y-2">
                <p>16.1 Draba acts as an intermediary platform connecting Clients with independent Driver contractors.</p>
                <p>16.2 We do not provide transportation services directly and are not responsible for Driver conduct or service quality.</p>
                <p>16.3 THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p>
                <p>16.4 We are not liable for any indirect, incidental, or consequential damages arising from Platform use.</p>
                <p>16.5 Our total liability for any claims shall not exceed the fees paid by you in the past 12 months.</p>
                <p>16.6 You acknowledge that transportation services carry inherent risks, and you use the Platform at your own risk.</p>
              </div>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">17. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Zichlu Motors, Draba, and our affiliates, officers, agents, and employees 
                from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform, 
                violation of these Terms, or violation of any rights of another party.
              </p>
            </section>

            {/* Term and Termination */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">18. Term and Termination</h2>
              <div className="space-y-2">
                <p>18.1 These Terms remain in effect while you use the Platform.</p>
                <p>18.2 You may terminate your account at any time through account settings.</p>
                <p>18.3 We may suspend or terminate your account for Terms violations, fraudulent activity, or safety concerns.</p>
                <p>18.4 Upon termination, your right to use the Platform ceases immediately.</p>
                <p>18.5 Provisions regarding payments, liability, and dispute resolution survive termination.</p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">19. Changes to Terms</h2>
              <div className="space-y-2">
                <p>19.1 We reserve the right to modify these Terms at any time.</p>
                <p>19.2 We will notify you of material changes via email or Platform notification.</p>
                <p>19.3 Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>
                <p>19.4 If you do not agree to changes, you must discontinue use of the Platform.</p>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">20. Governing Law and Jurisdiction</h2>
              <div className="space-y-2">
                <p>20.1 These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
                <p>20.2 Any disputes shall be resolved in the courts of Nigeria.</p>
                <p>20.3 You agree to submit to the exclusive jurisdiction of Nigerian courts.</p>
              </div>
            </section>

            {/* Severability */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">21. Severability</h2>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions 
                shall continue in full force and effect.
              </p>
            </section>

            {/* Entire Agreement */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">22. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Draba 
                regarding the use of the Platform.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="font-bold text-base mb-3 text-foreground">23. Contact Information</h2>
              <p className="mb-2">If you have questions or concerns about these Terms, please contact us:</p>
              <div className="ml-4 space-y-1">
                <p><strong>Draba</strong></p>
                <p>Operated by: Zichlu Motors</p>
                <p>Email: support@draba.app</p>
                <p>Abuja, Nigeria</p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="border-t pt-6 mt-6">
              <p className="font-semibold mb-2">Acknowledgment</p>
              <p>
                BY USING THE DRABA PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND 
                BY THESE TERMS OF SERVICE.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
