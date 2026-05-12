import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <polyline
          points="1,13 5,13 7,5 9,18 11,9 13,14 15,14 17,11 21,11"
          stroke="#5b5bff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>,
    { ...size }
  );
}
