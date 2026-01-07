export enum ItemType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  STICKER = 'STICKER', // AI Generated
  EMOJI = 'EMOJI'
}

export interface CanvasItem {
  id: string;
  type: ItemType;
  content: string; // Text content, Image base64, or Emoji char
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  author: string;
  color?: string; // For text background
  textColor?: string; // For text font color
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
}

export interface Board {
  id: string;
  topic: string;
  items: CanvasItem[];
  createdAt: number;
  host: string;
  backgroundImage?: string; // Optional background image for the board
  backgroundSize?: 'cover' | 'contain' | 'auto'; // CSS background-size property
}