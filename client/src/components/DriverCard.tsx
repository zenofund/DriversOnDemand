import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, MessageSquare } from 'lucide-react';
import { DriverReviewsDialog } from '@/components/DriverReviewsDialog';
import type { Driver } from '@shared/schema';

interface DriverCardProps {
  driver: Driver;
  distance?: number;
  onSelect: (driverId: string) => void;
}

export function DriverCard({ driver, distance, onSelect }: DriverCardProps) {
  const [showReviews, setShowReviews] = useState(false);

  return (
    <>
    <Card className="hover:shadow-xl transition-shadow" data-testid={`driver-card-${driver.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Row 1: Avatar + Name (mobile) / Full horizontal layout (desktop) */}
          <div className="flex items-center gap-3 md:gap-4 md:flex-1">
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-16 w-16 border-2 border-primary/10">
                <AvatarImage 
                  src={driver.profile_picture_url || undefined} 
                  alt={driver.full_name}
                />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {driver.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {driver.online_status === 'online' && (
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-status-online border-2 border-card animate-pulse" />
              )}
            </div>

            {/* Driver name (mobile stacks, desktop inline) */}
            <div className="flex-1 md:min-w-0">
              <h3 className="font-semibold text-base md:text-lg text-foreground truncate" data-testid={`driver-name-${driver.id}`}>
                {driver.full_name}
              </h3>
              
              {/* Row 2 on mobile: Rating + Reviews - hidden on desktop */}
              <div className="flex items-center gap-1 mt-1 md:hidden">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium" data-testid={`driver-rating-${driver.id}`}>
                  {driver.rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({driver.total_trips} trips)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReviews(true);
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reviews
                </Button>
              </div>

              {/* Desktop info - shown only on md+ */}
              <div className="hidden md:flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium" data-testid={`driver-rating-${driver.id}`}>
                  {driver.rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({driver.total_trips} trips)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReviews(true);
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reviews
                </Button>
              </div>

              {/* Desktop rate and distance - shown only on md+ */}
              <div className="hidden md:flex items-center gap-4 mt-2">
                <p className="text-sm font-medium text-foreground">
                  ₦{driver.hourly_rate.toLocaleString()}/hr
                </p>
                {distance !== undefined && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {distance.toFixed(1)} km away
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile-only rows 3-5: Distance, Rate, Select button */}
          <div className="flex flex-col gap-2 md:hidden">
            {/* Row 3: Distance */}
            {distance !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{distance.toFixed(1)} km away</span>
              </div>
            )}
            
            {/* Row 4: Rate */}
            <p className="text-base font-semibold text-foreground">
              ₦{driver.hourly_rate.toLocaleString()}/hr
            </p>
          </div>

          {/* Row 5 on mobile / Inline on desktop: Select button */}
          <Button 
            onClick={() => onSelect(driver.id)}
            disabled={driver.online_status === 'offline'}
            className="w-full md:w-auto md:self-center"
            data-testid={`button-select-driver-${driver.id}`}
          >
            {driver.online_status === 'online' ? 'Select' : 'Offline'}
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Reviews Dialog */}
    <DriverReviewsDialog
      open={showReviews}
      onOpenChange={setShowReviews}
      driver={driver}
    />
    </>
  );
}
