import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

interface CameraModalProps {
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export default function CameraModal({ onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start camera stream on mount
    async function startCamera() {
      try {
        setError(null);
        setIsLoading(true);
        const constraints = {
          video: {
            facingMode: 'environment', // Prefer back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error accessing camera:', err);
        setError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan dan perangkat mendukung.'
        );
        setIsLoading(false);
      }
    }

    startCamera();

    // Cleanup: Stop stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw current video frame onto canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert to base64 jpeg image
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Stop all camera tracks immediately to turn off the hardware camera light
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Ambil Foto Kamera</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport body */}
        <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="text-center text-white space-y-2.5">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-slate-400">Menyiapkan kamera live...</p>
            </div>
          )}

          {error ? (
            <div className="p-6 text-center text-rose-400 space-y-3 max-w-sm">
              <AlertCircle className="w-12 h-12 mx-auto text-rose-500" />
              <p className="text-sm font-semibold leading-normal">{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isLoading ? 'hidden' : 'block'}`}
            />
          )}
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Batal
          </button>

          {!error && !isLoading && (
            <button
              type="button"
              onClick={handleCapture}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              Ambil Foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
