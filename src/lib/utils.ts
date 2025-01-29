import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSize(size: string | number): string {  
  let numericValue = typeof size === 'string' ? 
    parseFloat(size.replace(/GB/i, '').trim()) : size;
    
  if (!numericValue || isNaN(numericValue)) return '0 GB';
  
  if (numericValue < 10000) {
    return `${Math.round(numericValue)} GB`;
  }
  
  numericValue = numericValue / (1024 * 1024 * 1024);
  
  if (numericValue >= 1024) {
    return `${Math.round(numericValue / 1024)} TB`;
  }

  return `${Math.round(numericValue)} GB`;
}