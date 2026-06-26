import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '@/lib/imageUtils';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export function ImageCropper({ 
  image, 
  onCropComplete, 
  onCancel,
  aspectRatio = 1 // Default to square (1:1)
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropConfirm = async () => {
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper Area */}
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteInternal}
            />
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom</span>
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCropConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Crop & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
