/**
 * Utilities for pod styling, colors, and formatting according to the Neo-brutalist theme
 */

export interface PodStyle {
  bg: string;
  text: string;
  name: string;
}

export function getPodStyle(podName?: string): PodStyle {
  const safeName = podName || 'backend-pod-beta';
  const lower = safeName.toLowerCase();

  // Yêu cầu: backend-pod-alpha = cam #FF8A4C, backend-pod-beta = xanh tím #A5B0FF
  if (lower.includes('alpha')) {
    return { bg: '#FF8A4C', text: '#15130F', name: safeName };
  }
  if (lower.includes('beta')) {
    return { bg: '#A5B0FF', text: '#15130F', name: safeName };
  }

  // Mảng màu pastel dự phòng cho các pod khác
  const pastelColors = ['#FF8A4C', '#A5B0FF', '#86E3B8', '#FFD23F', '#FF9CCB', '#D9B8FF'];
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg = pastelColors[Math.abs(hash) % pastelColors.length];
  return { bg, text: '#15130F', name: safeName };
}

export function formatMessageTime(dateString?: string): string {
  if (!dateString) return '00:00';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
