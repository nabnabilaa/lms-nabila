import { useEffect, useRef, useState } from 'react';

interface FilterConfig {
    brightness: number; // 1.0 = normal
    saturation: number; // 1.0 = normal
    contrast: number;   // 1.0 = normal
    blur: number;       // 0 = tajam
}

export const useCanvasFilter = (
    originalStream: MediaStream | null,
    isEnabled: boolean,
    config: FilterConfig = { brightness: 1.1, saturation: 1.2, contrast: 1.05, blur: 0 }
) => {
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const requestRef = useRef<number>();

    useEffect(() => {
        if (!originalStream || !isEnabled) {
            if (processedStream) {
                processedStream.getTracks().forEach(t => t.stop());
                setProcessedStream(null);
            }
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const videoTrack = originalStream.getVideoTracks()[0];
        if (!videoTrack) return;

        // 1. Setup Elemen Tersembunyi
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false }); // Alpha false untuk performa

        video.srcObject = originalStream;
        video.muted = true;
        video.playsInline = true;
        
        videoRef.current = video;
        canvasRef.current = canvas;

        const processFrame = () => {
            if (!video || !canvas || !ctx) return;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Set ukuran canvas sesuai stream asli
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                // 2. Terapkan Filter CSS pada Context Canvas
                // Urutan filter: Brightness -> Contrast -> Saturate -> Blur
                // Filter string format: "brightness(1.2) saturate(1.4) ..."
                const filterString = `
                    brightness(${config.brightness}) 
                    contrast(${config.contrast}) 
                    saturate(${config.saturation}) 
                    blur(${config.blur}px)
                `;
                
                ctx.filter = filterString;
                
                // 3. Gambar frame video ke canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            requestRef.current = requestAnimationFrame(processFrame);
        };

        // Mulai memproses saat video siap
        video.onloadedmetadata = () => {
            video.play().then(() => {
                processFrame();
                
                // 4. Capture Stream dari Canvas (30 FPS)
                const stream = canvas.captureStream(30);
                
                // PENTING: Copy Audio Track dari stream asli (karena canvas cuma video)
                const audioTracks = originalStream.getAudioTracks();
                if (audioTracks.length > 0) {
                    stream.addTrack(audioTracks[0]);
                }

                setProcessedStream(stream);
            }).catch(e => console.error("Canvas Filter Error:", e));
        };

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            video.pause();
            video.srcObject = null;
            // Jangan stop track asli di sini, karena stream asli dikelola oleh useWebRTC
        };
    }, [originalStream, isEnabled, config.brightness, config.saturation, config.contrast]);

    return isEnabled ? processedStream : originalStream;
};