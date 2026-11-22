import { SUBMISSION_STATUS } from '../constants/config';

function makeProofSvgDataUrl(trainer, score, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="${color}"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)"/>
    <rect x="24" y="24" width="592" height="312" rx="18" fill="none" stroke="#facc15" stroke-width="3" stroke-opacity="0.65"/>
    <text x="48" y="84" fill="#38bdf8" font-family="sans-serif" font-size="22" font-weight="bold">GUILD WAR – PROOF SCREENSHOT</text>
    <text x="48" y="155" fill="#ffffff" font-family="sans-serif" font-size="36" font-weight="bold">${trainer}</text>
    <text x="48" y="220" fill="#facc15" font-family="sans-serif" font-size="48" font-weight="bold">${score} PTS</text>
    <text x="48" y="292" fill="#cbd5e1" font-family="sans-serif" font-size="18">Ảnh minh chứng mẫu • Lưu cục bộ trên trình duyệt</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createDemoSubmissions() {
  const now = Date.now();
  const samples = [
    { name: 'AshKetchum', score: 2450, status: SUBMISSION_STATUS.APPROVED, color: '#1d4ed8', minsAgo: 180 },
    { name: 'MistyWater', score: 2180, status: SUBMISSION_STATUS.APPROVED, color: '#0e7490', minsAgo: 140 },
    { name: 'CynthiaChamp', score: 2620, status: SUBMISSION_STATUS.APPROVED, color: '#6d28d9', minsAgo: 120 },
    { name: 'RedMaster', score: 1940, status: SUBMISSION_STATUS.APPROVED, color: '#b91c1c', minsAgo: 95 },
    { name: 'BrockRock', score: 1520, status: SUBMISSION_STATUS.APPROVED, color: '#b45309', minsAgo: 60 },
    { name: 'DawnStar', score: 1780, status: SUBMISSION_STATUS.PENDING, color: '#7e22ce', minsAgo: 15 },
  ];

  return samples.map((s, idx) => ({
    id: `demo-${now}-${idx}`,
    playerName: s.name,
    score: s.score,
    proofImage: makeProofSvgDataUrl(s.name, s.score, s.color),
    status: s.status,
    createdAt: new Date(now - s.minsAgo * 60 * 1000).toISOString(),
  }));
}
