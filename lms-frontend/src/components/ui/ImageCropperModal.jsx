import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, RotateCw, FlipHorizontal, FlipVertical, Sliders, Image as ImageIcon, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from '../ui/Toast';

const FILTERS = [
    { name: 'Normal', value: 'none', class: '' },
    { name: 'Grayscale', value: 'grayscale(100%)', class: 'grayscale' },
    { name: 'Sepia', value: 'sepia(100%)', class: 'sepia' },
    { name: 'Vintage', value: 'contrast(120%) brightness(110%) sepia(30%)', class: 'contrast-125 brightness-110 sepia-50' },
    { name: 'Chrome', value: 'contrast(140%) saturate(0%)', class: 'contrast-150 saturate-0' },
];

export const ImageCropperModal = ({ imageSrc, onCancel, onSave, isLoading }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0); // -180 to 180
    const [flip, setFlip] = useState({ horizontal: false, vertical: false });
    const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
    const [activeTab, setActiveTab] = useState('adjust'); // 'adjust' | 'filter'
    
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getRadianAngle = (degreeValue) => {
        return (degreeValue * Math.PI) / 180;
    };

    const rotateSize = (width, height, rotation) => {
        const rotRad = getRadianAngle(rotation);
        return {
            width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
            height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
        };
    };

    const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0, flip = { horizontal: false, vertical: false }, filterValue = 'none') => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        const rotRad = getRadianAngle(rotation);

        // calculate bounding box of the rotated image
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

        // set canvas size to match the bounding box
        canvas.width = bBoxWidth;
        canvas.height = bBoxHeight;

        // Apply filters
        ctx.filter = filterValue;

        // translate canvas context to a central location to allow rotating and flipping around the center
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rotRad);
        
        // Correct Flip Logic
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        
        ctx.translate(-image.width / 2, -image.height / 2);

        // draw rotated image
        ctx.drawImage(image, 0, 0);

        // croppedAreaPixels values are bounding box relative
        const data = ctx.getImageData(
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height
        );

        // set canvas width to final desired crop size - resize to max 500px to avoid large payloads
        const MAX_SIZE = 500;
        let finalWidth = pixelCrop.width;
        let finalHeight = pixelCrop.height;
        
        if (finalWidth > MAX_SIZE) {
            finalWidth = MAX_SIZE;
            finalHeight = (pixelCrop.height / pixelCrop.width) * MAX_SIZE;
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // paste generated rotate image at the top left corner
        // ctx.putImageData cannot be used for scaling, use drawImage
        
        // Create a temporary canvas for the cropped data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pixelCrop.width;
        tempCanvas.height = pixelCrop.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(data, 0, 0);

        // Draw temp canvas onto main canvas with scaling
        ctx.drawImage(tempCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, finalWidth, finalHeight);

        return new Promise((resolve, reject) => {
            canvas.toBlob((file) => {
                if (file) resolve(file);
                else reject(new Error('Canvas is empty'));
            }, 'image/jpeg', 0.85); // 0.85 Quality to keep size low
        });
    };

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation,
                flip,
                activeFilter.value
            );
            onSave(croppedImage);
        } catch (e) {
            console.error(e);
            toast.error('Gagal memproses gambar.');
        }
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
        setActiveFilter(FILTERS[0]);
        setCrop({ x: 0, y: 0 });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 z-10 bg-white">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        Edit Foto Profil
                    </h3>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={handleReset} 
                            disabled={isLoading}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Reset semua perubahan"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                        <button onClick={onCancel} disabled={isLoading} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 disabled:opacity-50">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Cropper Area */}
                <div className="relative flex-1 bg-gray-900 overflow-hidden">
                    <div 
                        className="absolute inset-0 w-full h-full"
                        style={{ 
                            transform: `scale(${flip.horizontal ? -1 : 1}, ${flip.vertical ? -1 : 1})` 
                        }}
                    >
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            classes={{
                                mediaClassName: '', 
                            }}
                            style={{
                                mediaStyle: {
                                    filter: activeFilter.value
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Controls Area */}
                <div className="bg-white border-t border-gray-100 flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button 
                            onClick={() => setActiveTab('adjust')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'adjust' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Sliders className="w-4 h-4" /> Adjust
                        </button>
                        <button 
                            onClick={() => setActiveTab('filter')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'filter' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <ImageIcon className="w-4 h-4" /> Filters
                        </button>
                    </div>

                    <div className="p-6 space-y-6 h-48 overflow-y-auto">
                        {activeTab === 'adjust' ? (
                            <div className="space-y-4 animate-fadeIn">
                                {/* Zoom */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                                        <span>Zoom</span>
                                        <span>{(zoom * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ZoomIn className="w-4 h-4 text-gray-400" />
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>
                                </div>

                                {/* Rotation - Centered Degree */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                                        <span>Rotation</span>
                                        <span>{rotation}°</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RotateCw className="w-4 h-4 text-gray-400" />
                                        <input
                                            type="range"
                                            value={rotation}
                                            min={-180}
                                            max={180}
                                            step={1}
                                            onChange={(e) => setRotation(Number(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>
                                </div>

                                {/* Flip Buttons */}
                                <div className="flex justify-center gap-3 pt-2">
                                    <button
                                        onClick={() => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }))}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${flip.horizontal ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <FlipHorizontal className="w-4 h-4" /> H-Flip
                                    </button>
                                    <button
                                        onClick={() => setFlip(prev => ({ ...prev, vertical: !prev.vertical }))}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${flip.vertical ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <FlipVertical className="w-4 h-4" /> V-Flip
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 animate-fadeIn">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.name}
                                        onClick={() => setActiveFilter(f)}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${activeFilter.name === f.name ? 'ring-2 ring-blue-600 bg-blue-50' : 'hover:bg-gray-50 border border-transparent'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-100 ${f.class}`} style={{ filter: f.value }}>
                                            <img src={imageSrc} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">{f.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="p-4 border-t border-gray-100 flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Simpan Foto
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
