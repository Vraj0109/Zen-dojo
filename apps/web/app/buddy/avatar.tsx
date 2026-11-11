import type { CSSProperties, JSX } from "react";
import type { BuddyMood } from "@habit/shared";
import type { AvatarId } from "./buddy-prefs";
import type { PetMeta } from "./pets/pet-package";
import { rowForMood } from "./pets/pet-anim";
import { PetSprite } from "./pets/pet-sprite";

export type { AvatarId } from "./buddy-prefs";

export const BUILTIN_AVATARS: { id: Exclude<AvatarId, "custom" | "pet">; label: string }[] = [
  { id: "fox", label: "Fox" },
  { id: "robot", label: "Robot" },
  { id: "cat", label: "Cat" },
  { id: "blob", label: "Blob" },
];

// All animation is CSS. Under prefers-reduced-motion every animation is off and each mood keeps a static pose.
const AVATAR_CSS = `
.bav{display:inline-block;line-height:0;position:relative}
.bav svg,.bav img{overflow:visible}
.bav-body{transform-box:fill-box;transform-origin:50% 100%}
.bav-closed,.bav-dots,.bav-z{display:none}
.bav[data-mood="sleeping"] .bav-open{display:none}
.bav[data-mood="sleeping"] .bav-closed{display:inline}
.bav[data-mood="thinking"] .bav-dots{display:inline}
.bav[data-mood="sleeping"] .bav-z{display:inline}
.bav[data-mood="idle"] .bav-body,.bav[data-mood="idle"] img{animation:bav-bob 3.6s ease-in-out infinite}
.bav[data-mood="idle"] .bav-open{animation:bav-blink 5s infinite;transform-box:fill-box;transform-origin:50% 50%}
.bav[data-mood="thinking"] .bav-body,.bav[data-mood="thinking"] img{animation:bav-tilt 1.8s ease-in-out infinite}
.bav[data-mood="thinking"] .bav-dots circle{animation:bav-dot 1.2s infinite}
.bav[data-mood="thinking"] .bav-dots circle:nth-child(2){animation-delay:.2s}
.bav[data-mood="thinking"] .bav-dots circle:nth-child(3){animation-delay:.4s}
.bav[data-mood="sleeping"] .bav-body,.bav[data-mood="sleeping"] img{animation:bav-breathe 4.5s ease-in-out infinite}
.bav[data-mood="sleeping"] img{opacity:.7}
.bav[data-mood="sleeping"] .bav-z text{animation:bav-float 3s ease-in infinite}
.bav[data-mood="excited"] .bav-body,.bav[data-mood="excited"] img{animation:bav-bounce .7s ease-in-out infinite}
.bav-sleepmark{display:none;position:absolute;right:-2px;top:-6px;font:700 12px/1 sans-serif;color:var(--color-muted,#888)}
.bav[data-mood="sleeping"] .bav-sleepmark{display:block;animation:bav-float 3s ease-in infinite}
.bav[data-mood="thinking"] img{transform-origin:50% 100%}
@keyframes bav-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes bav-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes bav-tilt{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
@keyframes bav-dot{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes bav-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes bav-float{0%{opacity:0;transform:translateY(4px)}30%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
@keyframes bav-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-9px)}}
@media (prefers-reduced-motion: reduce){
.bav *,.bav{animation:none!important}
.bav[data-mood="thinking"] .bav-body,.bav[data-mood="thinking"] img{transform:rotate(-4deg)}
.bav[data-mood="excited"] .bav-body,.bav[data-mood="excited"] img{transform:translateY(-4px)}
.bav-dots circle{opacity:1}
.bav-z text{opacity:1}
}
`;

const INK = "#2b2b36";

function Eyes({ lx, rx, y, r = 2.6 }: { lx: number; rx: number; y: number; r?: number }) {
  return (
    <>
      <g className="bav-open">
        <circle cx={lx} cy={y} r={r} fill={INK} />
        <circle cx={rx} cy={y} r={r} fill={INK} />
        <circle cx={lx + 0.9} cy={y - 0.9} r={0.8} fill="#fff" />
        <circle cx={rx + 0.9} cy={y - 0.9} r={0.8} fill="#fff" />
      </g>
      <g className="bav-closed" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none">
        <path d={`M${lx - 2.8} ${y} q2.8 2.6 5.6 0`} />
        <path d={`M${rx - 2.8} ${y} q2.8 2.6 5.6 0`} />
      </g>
    </>
  );
}

function Fox() {
  return (
    <g className="bav-body">
      <path d="M12 26 L14 8 L27 18 Z M52 26 L50 8 L37 18 Z" fill="#e8833a" />
      <path d="M15 22 L16 12 L23 18 Z M49 22 L48 12 L41 18 Z" fill="#f6c9a0" />
      <path d="M8 38 Q8 16 32 16 Q56 16 56 38 Q56 56 32 58 Q8 56 8 38 Z" fill="#e8833a" />
      <path d="M32 58 Q16 56 14 42 Q24 46 32 40 Q40 46 50 42 Q48 56 32 58 Z" fill="#fff5ea" />
      <Eyes lx={23} rx={41} y={36} />
      <ellipse cx={32} cy={44} rx={3} ry={2.2} fill={INK} />
    </g>
  );
}

function Robot() {
  return (
    <g className="bav-body">
      <line x1={32} y1={6} x2={32} y2={14} stroke="#7a8696" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={32} cy={6} r={3.2} fill="#4fb6a8" />
      <rect x={9} y={14} width={46} height={42} rx={10} fill="#9fb0c3" />
      <rect x={14} y={22} width={36} height={22} rx={7} fill="#2b3340" />
      <rect x={4} y={28} width={5} height={12} rx={2.5} fill="#7a8696" />
      <rect x={55} y={28} width={5} height={12} rx={2.5} fill="#7a8696" />
      <g transform="translate(0,-2)">
        <g className="bav-open">
          <circle cx={24} cy={34} r={3.4} fill="#6ee7d4" />
          <circle cx={40} cy={34} r={3.4} fill="#6ee7d4" />
        </g>
        <g className="bav-closed" stroke="#6ee7d4" strokeWidth={2} strokeLinecap="round" fill="none">
          <path d="M20.5 34 h7" />
          <path d="M36.5 34 h7" />
        </g>
      </g>
      <rect x={24} y={48} width={16} height={3} rx={1.5} fill="#5b677a" />
    </g>
  );
}

function Cat() {
  return (
    <g className="bav-body">
      <path d="M11 28 L12 8 L27 19 Z M53 28 L52 8 L37 19 Z" fill="#8d8aa3" />
      <path d="M14 23 L15 13 L22 19 Z M50 23 L49 13 L42 19 Z" fill="#f2b8c6" />
      <ellipse cx={32} cy={38} rx={24} ry={20} fill="#8d8aa3" />
      <ellipse cx={32} cy={46} rx={11} ry={8} fill="#e9e6f2" />
      <Eyes lx={23} rx={41} y={35} r={2.8} />
      <path d="M30 42 h4 l-2 2.4 Z" fill="#e58aa0" />
      <g stroke={INK} strokeWidth={1.2} strokeLinecap="round" opacity={0.7}>
        <path d="M6 40 l10 1.5 M6 46 l10 -1" />
        <path d="M58 40 l-10 1.5 M58 46 l-10 -1" />
      </g>
    </g>
  );
}

function Blob() {
  return (
    <g className="bav-body">
      <path d="M10 44 Q6 20 28 14 Q56 10 56 40 Q56 58 32 58 Q12 58 10 44 Z" fill="#8fc98a" />
      <ellipse cx={24} cy={26} rx={6} ry={3.5} fill="#fff" opacity={0.35} transform="rotate(-20 24 26)" />
      <Eyes lx={24} rx={40} y={38} r={3} />
      <path d="M28 46 q4 3.5 8 0" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </g>
  );
}

const SHAPES: Record<Exclude<AvatarId, "custom" | "pet">, () => JSX.Element> = { fox: Fox, robot: Robot, cat: Cat, blob: Blob };

export function BuddyAvatar({
  id,
  mood,
  size,
  customSrc,
  pet,
  sheetUrl,
  speaking,
  dragging,
}: {
  id: AvatarId;
  mood: BuddyMood;
  size: number;
  customSrc?: string;
  pet?: PetMeta;
  sheetUrl?: string;
  speaking?: boolean;
  dragging?: "left" | "right" | null;
}): JSX.Element {
  const box: CSSProperties = { width: size, height: size };
  if (id === "pet" && pet && sheetUrl) {
    return (
      <span className="bav" data-mood={mood} style={box} aria-hidden="true">
        <PetSprite sheetUrl={sheetUrl} meta={pet} row={rowForMood(mood, { speaking, dragging })} size={size} />
      </span>
    );
  }
  if (id === "custom" && customSrc) {
    return (
      <span className="bav" data-mood={mood} style={box} aria-hidden="true">
        <style>{AVATAR_CSS}</style>
        {/* Imported images are only ever shown through <img>, never inlined, so scripts in an SVG cannot run. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={customSrc} alt="" width={size} height={size} draggable={false} style={{ objectFit: "contain", width: size, height: size }} />
        <span className="bav-sleepmark">z</span>
      </span>
    );
  }
  const Shape = SHAPES[id === "custom" || id === "pet" ? "fox" : id];
  return (
    <span className="bav" data-mood={mood} style={box} aria-hidden="true">
      <style>{AVATAR_CSS}</style>
      <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
        <Shape />
        <g className="bav-dots" fill="currentColor" style={{ color: "#888" }}>
          <circle cx={50} cy={8} r={2} />
          <circle cx={56} cy={8} r={2} />
          <circle cx={62} cy={8} r={2} />
        </g>
        <g className="bav-z" fill="#888" fontWeight={700} fontFamily="sans-serif">
          <text x={50} y={12} fontSize={11}>z</text>
          <text x={57} y={5} fontSize={8}>z</text>
        </g>
      </svg>
    </span>
  );
}
