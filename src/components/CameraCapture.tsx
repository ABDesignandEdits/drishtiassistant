import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useDrishtiStore } from '../state/drishtiStore';
import { playEarconCapture, playEarconError } from '../audio/earcons';
import { Haptics } from '../audio/haptics';

export interface CameraCaptureHandle {
  captureFrame: () => string | null;
  switchCamera: () => void;
  isRealCameraActive: () => boolean;
}

interface CameraCaptureProps {
  onTap?: () => void;
}

export const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(({ onTap }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRealCameraActive, setIsRealCameraActive] = useState<boolean>(false);
  const [customUploadedFrame, setCustomUploadedFrame] = useState<string | null>(null);

  const { setCameraReady, isScanning, language } = useDrishtiStore();

  const stopCurrentStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  /**
   * Resilient camera starter:
   * 1. Try preferred facingMode (environment / user)
   * 2. Try generic video constraint if overconstrained
   * 3. Set real camera active as soon as video plays
   */
  const startCamera = async () => {
    stopCurrentStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser.');
      return;
    }

    try {
      let mediaStream: MediaStream;
      try {
        // Attempt 1: FacingMode with standard resolution
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('Attempt 1 failed, trying fallback video constraints:', err1);
        // Attempt 2: Generic video constraint (works on all laptops/webcams)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsRealCameraActive(true);
        setCameraReady(true);
        setCustomUploadedFrame(null);
        videoRef.current.play().catch(() => {});
        videoRef.current.onloadedmetadata = () => {
          setIsRealCameraActive(true);
          setCameraReady(true);
          videoRef.current?.play().catch(() => {});
        };
      }
      setStream(mediaStream);
    } catch (err: any) {
      console.warn('Camera access could not be acquired:', err);
      setIsRealCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Tap "Start Camera" to enable.'
          : 'Could not connect to camera hardware.'
      );
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCurrentStream();
    };
  }, [facingMode]);

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    Haptics.tap();
  };

  // Handle manual photo upload for testing on desktop / when camera is restricted
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setCustomUploadedFrame(b64);
      setIsRealCameraActive(true);
    };
    reader.readAsDataURL(file);
  };

  useImperativeHandle(ref, () => ({
    captureFrame: (): string | null => {
      playEarconCapture();
      Haptics.capture();

      // If user uploaded a custom photo to test, prioritize that
      if (customUploadedFrame) {
        return customUploadedFrame;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (video && video.videoWidth > 0 && video.videoHeight > 0 && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const maxWidth = 1024;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);

          // If mirrored, flip context to capture natural frame
          ctx.save();
          if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Check brightness for low light
          try {
            const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 80), Math.min(canvas.height, 80));
            let total = 0;
            for (let i = 0; i < imgData.data.length; i += 4) {
              total += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
            }
            const avg = total / (imgData.data.length / 4);
            setIsLowLight(avg < 40);
          } catch (e) {}

          return canvas.toDataURL('image/jpeg', 0.82);
        }
      }

      // Fallback: draw an informative frame rather than blank
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 640;
          canvas.height = 480;
          ctx.fillStyle = '#0B1224';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#64D2FF';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Camera feed initializing...', 320, 240);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
      }

      return null;
    },
    switchCamera: handleFlipCamera,
    isRealCameraActive: () => isRealCameraActive
  }));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none pointer-events-auto">
      {/* Real Video Element — Always visible with zero opacity hiding and mirrored for front camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
        }}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 opacity-100"
      />

      {/* Uploaded Custom Image Preview if testing */}
      {customUploadedFrame && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-0">
          <img
            src={customUploadedFrame}
            alt="Uploaded Test Scene"
            className="w-full h-full object-contain"
          />
          <button
            onClick={() => setCustomUploadedFrame(null)}
            className="absolute top-20 right-4 px-4 py-2 rounded-xl bg-black/70 text-white border border-white/20 text-xs font-bold z-20"
          >
            ✕ Reset to Live Camera
          </button>
        </div>
      )}

      {/* Floating Camera Permission / Setup Badge if Camera isn't streaming yet (Never blocks the face) */}
      {!isRealCameraActive && !customUploadedFrame && (
        <div className="absolute top-24 left-4 right-4 flex justify-center z-30 pointer-events-auto">
          <div className="glass-surface px-6 py-4 max-w-sm w-full mx-auto border border-[#64D2FF]/40 shadow-2xl text-center bg-black/40 backdrop-blur-md">
            <span className="text-3xl mb-1 block">📷</span>
            <h2 className="text-base font-bold text-white mb-0.5">
              {language === 'hi' ? 'कैमरा चालू करें' : 'Enable Camera View'}
            </h2>
            <p className="text-xs text-[#C7D2E8] mb-3">
              {cameraError || (language === 'hi' ? 'कैमरा देखने के लिए अनुमति दें' : 'Allow camera to view your face & surroundings')}
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={startCamera}
                className="py-2.5 px-4 rounded-xl bg-[#64D2FF] text-[#05070F] font-bold text-xs active:scale-95 shadow-md shadow-[#64D2FF]/20"
              >
                📸 {language === 'hi' ? 'कैमरा शुरू करें' : 'Start Camera'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 active:scale-95"
              >
                📁 {language === 'hi' ? 'फोटो अपलोड' : 'Upload Photo'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Subtle Viewfinder Edge Vignette (Keeps face and scene 100% visible and bright) */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/35 via-transparent to-black/25" />

      {/* Scanning Laser Line when Continuous Scan Mode is Active */}
      {isScanning && <div className="scan-shimmer pointer-events-none" />}

      {/* Flip Camera Floating Button */}
      <div className="absolute top-20 right-4 z-20 pointer-events-auto">
        <button
          onClick={handleFlipCamera}
          className="glass-surface h-12 w-12 rounded-full flex items-center justify-center text-xl text-white border border-white/30 shadow-lg active:scale-90 transition-transform"
          title="Flip Camera (Front/Rear)"
          aria-label="Switch camera"
        >
          🔄
        </button>
      </div>

      {/* Low Light Warning Indicator */}
      {isLowLight && isRealCameraActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-surface px-4 py-2 flex items-center gap-2 border-amber-400/50 pointer-events-none z-10">
          <span className="text-amber-400">💡</span>
          <span className="text-xs text-amber-200 font-medium">
            {language === 'hi' ? 'कम रोशनी — कैमरे को उजाले में रखें' : 'Low lighting detected — point towards light'}
          </span>
        </div>
      )}
    </div>
  );
});

CameraCapture.displayName = 'CameraCapture';
