import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Camera, Check, AlertCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function VerifyNIN() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [nin, setNin] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureSelfie = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setSelfie(imageData);
        stopCamera();
        toast({
          title: 'Selfie captured!',
          description: 'You can now submit your NIN for verification.',
        });
      }
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nin || nin.length !== 11) {
      setError('Please enter a valid 11-digit NIN');
      return;
    }

    if (!selfie) {
      setError('Please capture a selfie for verification');
      return;
    }

    setIsVerifying(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients/verify-nin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nin, selfie }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        toast({
          title: 'Verification Successful!',
          description: 'Your NIN has been verified. You can now book rides.',
        });
        setTimeout(() => navigate('/client/dashboard'), 1500);
      } else {
        setError(data.message || 'Verification failed');
        setVerificationStatus(data);

        if (data.locked) {
          toast({
            variant: 'destructive',
            title: 'Account Locked',
            description: 'Maximum attempts exceeded. Please contact admin.',
          });
        } else if (data.attemptsRemaining !== undefined) {
          toast({
            variant: 'destructive',
            title: 'Verification Failed',
            description: `${data.attemptsRemaining} attempt(s) remaining`,
          });
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const retakeSelfie = () => {
    setSelfie(null);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify Your Identity</CardTitle>
            <CardDescription>
              We need to verify your National Identification Number (NIN) to ensure platform safety
              and prevent fraudulent activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationStatus?.locked && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Your account has been locked due to multiple failed verification attempts. Please
                  contact our support team for manual verification.
                </AlertDescription>
              </Alert>
            )}

            {error && !verificationStatus?.locked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {verificationStatus && !verificationStatus.locked && verificationStatus.attemptsRemaining !== undefined && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Attempts remaining: <strong>{verificationStatus.attemptsRemaining}</strong>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nin">National Identification Number (NIN)</Label>
                <Input
                  id="nin"
                  type="text"
                  placeholder="Enter your 11-digit NIN"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  disabled={isVerifying || verificationStatus?.locked}
                  className="text-lg tracking-wider"
                />
                <p className="text-sm text-muted-foreground">
                  Your NIN is secured with encryption and used only for verification purposes.
                </p>
              </div>

              <div className="space-y-4">
                <Label>Selfie Verification</Label>
                {!selfie && !showCamera && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={isVerifying || verificationStatus?.locked}
                    className="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Selfie
                  </Button>
                )}

                {showCamera && (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={captureSelfie}
                        className="flex-1"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selfie && (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border">
                      <img src={selfie} alt="Your selfie" className="w-full" />
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={retakeSelfie}
                      disabled={isVerifying}
                      className="w-full"
                    >
                      Retake Selfie
                    </Button>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <Button
                type="submit"
                disabled={!nin || !selfie || isVerifying || verificationStatus?.locked}
                className="w-full"
                size="lg"
              >
                {isVerifying ? 'Verifying...' : 'Verify My Identity'}
              </Button>
            </form>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Why do we need this?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensures platform safety for drivers and clients</li>
                <li>• Prevents fraudulent activities and identity theft</li>
                <li>• Verifies your identity against government records</li>
                <li>• Required before you can book any rides</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
