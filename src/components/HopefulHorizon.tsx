type Props = {
  className?: string;
  ariaLabel?: string;
};

export function HopefulHorizon({ className, ariaLabel }: Props) {
  return (
    <svg
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      viewBox="0 0 800 500"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde9c4" />
          <stop offset="40%" stopColor="#fcd6a3" />
          <stop offset="80%" stopColor="#f9c4b1" />
          <stop offset="100%" stopColor="#fbe7d0" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mountainsFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c7b6db" />
          <stop offset="100%" stopColor="#a896c4" />
        </linearGradient>
        <linearGradient id="mountainsMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8da4b6" />
          <stop offset="100%" stopColor="#5e7c95" />
        </linearGradient>
        <linearGradient id="mountainsNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d8779" />
          <stop offset="100%" stopColor="#3f6a5b" />
        </linearGradient>
        <linearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86c79b" />
          <stop offset="100%" stopColor="#3f8a5e" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6fb886" />
          <stop offset="100%" stopColor="#2d6a48" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff8e7" />
          <stop offset="100%" stopColor="#f5e7c4" />
        </linearGradient>
      </defs>

      {/* === Sky === */}
      <rect x="0" y="0" width="800" height="320" fill="url(#sky)" />

      {/* === Sun glow + core === */}
      <circle cx="600" cy="200" r="200" fill="url(#sunGlow)" />
      <circle cx="600" cy="200" r="62" fill="#fcd34d" />
      <circle cx="600" cy="200" r="40" fill="#fde68a" opacity="0.9" />

      {/* === Distant mountains (lavender) === */}
      <path
        d="M 0 290 L 90 235 L 150 270 L 230 220 L 320 265 L 410 215 L 500 270 L 590 230 L 690 265 L 800 240 L 800 320 L 0 320 Z"
        fill="url(#mountainsFar)"
        opacity="0.85"
      />

      {/* === Mid mountains === */}
      <path
        d="M 0 305 L 80 270 L 170 295 L 270 255 L 360 290 L 460 260 L 560 295 L 660 270 L 760 295 L 800 280 L 800 320 L 0 320 Z"
        fill="url(#mountainsMid)"
        opacity="0.9"
      />

      {/* === Near mountains === */}
      <path
        d="M 0 320 L 60 295 L 140 315 L 230 290 L 320 312 L 410 290 L 500 315 L 600 295 L 700 318 L 800 305 L 800 340 L 0 340 Z"
        fill="url(#mountainsNear)"
      />

      {/* === Snow caps on near mountains === */}
      <g fill="#f8fafc" opacity="0.85">
        <path d="M 230 290 L 245 297 L 215 297 Z" />
        <path d="M 410 290 L 425 298 L 395 298 Z" />
        <path d="M 600 295 L 615 302 L 585 302 Z" />
      </g>

      {/* === Soft clouds === */}
      <g fill="#fef3c7" opacity="0.85">
        <ellipse cx="120" cy="100" rx="48" ry="12" />
        <ellipse cx="140" cy="92" rx="34" ry="10" />
        <ellipse cx="320" cy="70" rx="40" ry="10" />
        <ellipse cx="340" cy="78" rx="28" ry="8" />
        <ellipse cx="720" cy="120" rx="44" ry="11" />
        <ellipse cx="740" cy="112" rx="30" ry="9" />
      </g>

      {/* === Birds (Vs at three heights) === */}
      <g
        fill="none"
        stroke="#3f3a52"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.65"
      >
        <path d="M 200 150 q 7 -7 14 0 q 7 -7 14 0" />
        <path d="M 240 132 q 6 -6 12 0 q 6 -6 12 0" />
        <path d="M 290 158 q 5 -5 10 0 q 5 -5 10 0" />
        <path d="M 440 95 q 6 -6 12 0 q 6 -6 12 0" />
        <path d="M 478 110 q 5 -5 10 0 q 5 -5 10 0" />
      </g>

      {/* === Hills (green) === */}
      <path
        d="M 0 360 Q 200 320 400 350 T 800 340 L 800 420 L 0 420 Z"
        fill="url(#hills)"
      />

      {/* === Distant tree line on hills === */}
      <g fill="#2f6f4d" opacity="0.85">
        {[60, 90, 130, 175, 220, 540, 590, 640, 690, 740].map((cx, i) => (
          <ellipse key={i} cx={cx} cy={350 + (i % 3) * 3} rx="9" ry="13" />
        ))}
      </g>

      {/* === River (golden, serpentine) === */}
      <path
        d="M 380 320 C 360 360 420 380 400 410 C 380 440 440 460 420 500 L 380 500 C 360 470 320 450 340 420 C 360 390 340 370 360 320 Z"
        fill="url(#river)"
        opacity="0.95"
      />
      <path
        d="M 365 360 C 355 380 380 395 372 415"
        fill="none"
        stroke="#fff7ce"
        strokeOpacity="0.7"
        strokeWidth="1.4"
      />
      <path
        d="M 395 380 C 385 405 410 420 402 445"
        fill="none"
        stroke="#fff7ce"
        strokeOpacity="0.6"
        strokeWidth="1.2"
      />

      {/* === Foreground ground === */}
      <path
        d="M 0 420 Q 200 400 400 415 T 800 410 L 800 500 L 0 500 Z"
        fill="url(#ground)"
      />

      {/* === Bright path (toward horizon) === */}
      <path
        d="M 540 500 Q 580 460 600 430 Q 620 395 640 360 L 660 360 Q 640 395 620 430 Q 600 460 580 500 Z"
        fill="url(#pathGrad)"
        opacity="0.95"
      />
      <path d="M 650 360 L 654 345 L 658 360" fill="#fde68a" opacity="0.8" />

      {/* === Foreground trees === */}
      <g>
        {/* Left pines */}
        <g fill="#264f3a">
          <path d="M 50 420 L 65 380 L 80 420 Z" />
          <path d="M 55 405 L 65 370 L 75 405 Z" />
          <path d="M 60 390 L 65 360 L 70 390 Z" />
          <rect x="63" y="418" width="4" height="14" fill="#3f2a1a" />
        </g>
        <g fill="#2f6f4d">
          <ellipse cx="120" cy="408" rx="22" ry="28" />
          <rect x="117" y="430" width="6" height="16" fill="#3f2a1a" />
        </g>
        {/* Right pines */}
        <g fill="#264f3a">
          <path d="M 730 425 L 745 380 L 760 425 Z" />
          <path d="M 735 410 L 745 372 L 755 410 Z" />
          <rect x="743" y="423" width="4" height="14" fill="#3f2a1a" />
        </g>
        <g fill="#2f6f4d">
          <ellipse cx="690" cy="412" rx="20" ry="26" />
          <rect x="687" y="432" width="6" height="14" fill="#3f2a1a" />
        </g>
      </g>

      {/* === Bench, mid-right === */}
      <g stroke="#5d3a1f" strokeWidth="3" strokeLinecap="round" fill="none">
        <line x1="470" y1="450" x2="520" y2="450" />
        <line x1="470" y1="450" x2="470" y2="468" />
        <line x1="520" y1="450" x2="520" y2="468" />
        <line x1="470" y1="442" x2="520" y2="442" strokeWidth="2" />
      </g>

      {/* === Generations: figures in foreground === */}

      {/* Elder couple holding hands, walking to the path */}
      <g>
        {/* Elder 1 (with cane) */}
        <circle cx="160" cy="430" r="8" fill="#f4c9a3" />
        <path
          d="M 160 438 L 160 470 L 152 488 M 160 470 L 168 488"
          stroke="#3f3a52"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 160 442 L 152 458 M 160 442 L 174 462"
          stroke="#86599b"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <line
          x1="170"
          y1="465"
          x2="178"
          y2="492"
          stroke="#5d3a1f"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Elder 2 */}
        <circle cx="190" cy="430" r="8" fill="#e9b48a" />
        <path
          d="M 190 438 L 190 472 L 182 490 M 190 472 L 198 490"
          stroke="#3f3a52"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 190 442 L 178 462 M 190 442 L 200 460"
          stroke="#3a5a8a"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Held hands between them */}
        <path
          d="M 174 462 L 178 462"
          stroke="#3f3a52"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {/* Yoga / meditation figure on small mat */}
      <g>
        <ellipse
          cx="290"
          cy="478"
          rx="34"
          ry="4"
          fill="#c97064"
          opacity="0.8"
        />
        <circle cx="290" cy="448" r="7" fill="#f4c9a3" />
        <path
          d="M 290 455 Q 282 462 278 472 L 268 478 M 290 455 Q 298 462 302 472 L 312 478"
          stroke="#3f3a52"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M 282 472 Q 290 466 298 472 Z" fill="#7a9d3a" />
      </g>

      {/* Child with balloon */}
      <g>
        <circle cx="370" cy="448" r="6" fill="#f4c9a3" />
        <path
          d="M 370 454 L 370 472 L 365 484 M 370 472 L 376 484"
          stroke="#3f3a52"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 370 458 L 363 470 M 370 458 L 380 462"
          stroke="#e76b6b"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Balloon string + balloon */}
        <line
          x1="380"
          y1="462"
          x2="396"
          y2="412"
          stroke="#3f3a52"
          strokeWidth="1"
        />
        <circle cx="396" cy="404" r="10" fill="#f87171" />
        <circle cx="393" cy="401" r="3" fill="#fca5a5" opacity="0.8" />
      </g>

      {/* Mother with stroller / parent walking with toddler */}
      <g>
        {/* Adult */}
        <circle cx="615" cy="445" r="7" fill="#e9b48a" />
        <path
          d="M 615 452 L 615 478 L 609 494 M 615 478 L 621 494"
          stroke="#3f3a52"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 615 458 L 605 472 M 615 458 L 626 470"
          stroke="#2f6f4d"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Toddler holding hand */}
        <circle cx="636" cy="464" r="5" fill="#f4c9a3" />
        <path
          d="M 636 469 L 636 486 L 631 494 M 636 486 L 641 494"
          stroke="#3f3a52"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 636 472 L 628 478 M 636 472 L 642 478"
          stroke="#fbbf24"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Held hands */}
        <line
          x1="626"
          y1="470"
          x2="628"
          y2="478"
          stroke="#3f3a52"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Butterfly (small, near child) */}
      <g transform="translate(420 420)">
        <ellipse cx="0" cy="0" rx="6" ry="4" fill="#a78bfa" opacity="0.95" />
        <ellipse cx="8" cy="2" rx="6" ry="4" fill="#a78bfa" opacity="0.95" />
        <line x1="4" y1="0" x2="4" y2="4" stroke="#3f3a52" strokeWidth="1" />
      </g>

      {/* Foreground flowers */}
      <g>
        {[
          [80, 470, "#f87171"],
          [220, 478, "#fbbf24"],
          [340, 484, "#a78bfa"],
          [430, 478, "#f87171"],
          [560, 482, "#a78bfa"],
          [720, 470, "#fbbf24"],
        ].map(([x, y, color], i) => (
          <g key={i}>
            <line
              x1={x as number}
              y1={(y as number) + 6}
              x2={x as number}
              y2={(y as number) - 4}
              stroke="#2d6a48"
              strokeWidth="1.4"
            />
            <circle
              cx={x as number}
              cy={(y as number) - 6}
              r="3"
              fill={color as string}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
