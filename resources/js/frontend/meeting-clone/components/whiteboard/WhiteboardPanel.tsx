import { RoomProvider } from '@liveblocks/react/suspense';
import { ClientSideSuspense } from '@liveblocks/react';
import { Canvas } from './Canvas';
import { LiveMap, LiveList, LiveObject } from '@liveblocks/client';
import type { Layer } from '../../liveblocks.config';
import { Loader2 } from 'lucide-react';

interface WhiteboardPanelProps {
    roomId: string;
    role: 'host' | 'co-host' | 'participant';
    onClose: () => void;
    allowParticipantDraw: boolean;
}

export const WhiteboardPanel = ({ roomId, role, onClose, allowParticipantDraw }: WhiteboardPanelProps) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <RoomProvider
                id={`whiteboard-${roomId}`}
                initialPresence={{ cursor: null, selection: [], pencilDraft: null, penColor: null }}
                initialStorage={{
                    layers: new LiveMap<string, LiveObject<Layer>>(),
                    layerIds: new LiveList([]),
                }}
            >
                <ClientSideSuspense fallback={<Loading />}>
                    {() => (
                        <Canvas
                            role={role}
                            allowParticipantDraw={allowParticipantDraw}
                            onClose={onClose}
                        />
                    )}
                </ClientSideSuspense>
            </RoomProvider>
        </div>
    );
};

const Loading = () => (
    <div className="flex flex-col items-center justify-center h-full text-white">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="text-lg font-medium">Connecting to Whiteboard...</p>
    </div>
);
