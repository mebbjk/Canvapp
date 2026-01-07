
export enum ItemType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  STICKER = 'STICKER', // AI Generated
  EMOJI = 'EMOJI',
  DRAWING = 'DRAWING'
}

export interface CanvasItem {
  id: string;
  type: ItemType;
  content: string; // Text content, Image base64, Emoji char, or SVG Path 'd'
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  author: string;
  color?: string; // For text background
  textColor?: string; // For text font color OR drawing stroke color
  fontSize?: number; // New: For customizable text size
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  photoURL?: string;
  email?: string;
}

export interface Board {
  id: string;
  topic: string;
  items: CanvasItem[];
  createdAt: number;
  host: string;
  backgroundImage?: string; // Optional background image for the board
  backgroundColor?: string; // Optional solid background color
  backgroundSize?: 'cover' | 'contain' | 'auto'; // CSS background-size property
  maxItemsPerUser?: number; // Limit items per user (0 or null or undefined = unlimited)
  isPublic?: boolean; // Whether the board is listed in the community feed
}
