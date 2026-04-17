import { createClient } from "@liveblocks/client";
import { LiveMap, LiveList, LiveObject } from "@liveblocks/client";

export const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY || "",
});

export type Color = {
  r: number;
  g: number;
  b: number;
};

export type Point = {
  x: number;
  y: number;
};

// --- TAMBAHKAN "Note" DI SINI ---
export type LayerType = "Rectangle" | "Ellipse" | "Path" | "Text" | "Note" | "Eraser";

export type Layer = {
  type: LayerType;
  x: number;
  y: number;
  height: number;
  width: number;
  fill: Color;
  points?: Point[];
  value?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
};

export type Presence = {
  cursor: Point | null;
  selection: string[];
  pencilDraft: { x: number; y: number; pressure: number }[][] | null;
  penColor: Color | null;
};

export type Storage = {
  layers: LiveMap<string, LiveObject<Layer>>;
  layerIds: LiveList<string>;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
    color: string;
  };
};

export type ThreadMetadata = {
  x: number;
  y: number;
  resolved?: boolean;
};

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
    UserMeta: UserMeta;
    ThreadMetadata: ThreadMetadata;
    RoomEvent: {}; 
  }
}