import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-scanner-container';

  const startScanning = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      await scannerRef.current.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan errors (no QR found)
        }
      );
      
      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.error('QR Scanner Error:', err);
      setHasPermission(false);
      onError?.(err.message || 'Failed to access camera');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const switchCamera = async () => {
    await stopScanning();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    // Auto-start when facingMode changes
    if (hasPermission && !isScanning) {
      startScanning();
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          {/* Scanner container */}
          <div 
            id={containerId} 
            className={`w-full min-h-[300px] bg-muted ${isScanning ? '' : 'flex items-center justify-center'}`}
          >
            {!isScanning && hasPermission !== false && (
              <div className="text-center p-8">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Tap the button below to start scanning
                </p>
              </div>
            )}
            
            {hasPermission === false && (
              <div className="text-center p-8">
                <CameraOff className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-muted-foreground mb-2">
                  Camera access denied
                </p>
                <p className="text-sm text-muted-foreground">
                  Please allow camera access in your browser settings
                </p>
              </div>
            )}
          </div>

          {/* Scan overlay with corner markers */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[250px] h-[250px] relative">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primary/70 animate-pulse" style={{ top: '50%' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex gap-2 justify-center">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full max-w-xs">
              <Camera className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={switchCamera}>
                <SwitchCamera className="mr-2 h-4 w-4" />
                Switch Camera
              </Button>
              <Button variant="destructive" onClick={stopScanning}>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
