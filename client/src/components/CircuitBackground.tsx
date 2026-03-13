import { useRef } from "react";

interface CircuitBackgroundProps {
  variant?: "light" | "dark";
  scrollProgress?: number;
}

export function CircuitBackground({
  variant = "light",
  scrollProgress = 0,
}: CircuitBackgroundProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const stroke = "#EF486F";

  // ~30% stronger base opacity
  const opacity = variant === "dark" ? 0.28 : 0.20;

  const animatedOpacity = Math.min(opacity + scrollProgress * 0.18, 0.5);

  const paths = [
    "M 50 100 L 50 200 L 200 200 L 200 150 L 350 150",
    "M 350 150 L 500 150 L 500 250 L 650 250",
    "M 650 250 L 800 250 L 800 180 L 950 180",
    "M 200 200 L 200 320 L 380 320 L 380 280 L 520 280",
    "M 520 280 L 680 280 L 680 350 L 820 350 L 820 300 L 970 300",
    "M 100 400 L 280 400 L 280 340 L 440 340",
    "M 440 340 L 600 340 L 600 420 L 760 420 L 760 380 L 900 380",
    "M 0 500 L 160 500 L 160 450 L 320 450 L 320 500 L 480 500",
    "M 480 500 L 640 500 L 640 560 L 800 560 L 800 500 L 1000 500",

    // Added paths (≈30% density increase)
    "M 120 80 L 120 160 L 260 160 L 260 120 L 420 120",
    "M 420 120 L 580 120 L 580 210 L 740 210",
    "M 300 420 L 460 420 L 460 360 L 620 360",
  ];

  const nodes = [
    { cx: 50, cy: 100 },
    { cx: 200, cy: 200 },
    { cx: 350, cy: 150 },
    { cx: 500, cy: 150 },
    { cx: 650, cy: 250 },
    { cx: 800, cy: 250 },
    { cx: 380, cy: 320 },
    { cx: 520, cy: 280 },
    { cx: 680, cy: 350 },
    { cx: 280, cy: 400 },
    { cx: 440, cy: 340 },
    { cx: 600, cy: 420 },
    { cx: 760, cy: 380 },
    { cx: 160, cy: 500 },
    { cx: 480, cy: 500 },
    { cx: 640, cy: 560 },
    { cx: 800, cy: 500 },

    // Added nodes
    { cx: 120, cy: 80 },
    { cx: 260, cy: 160 },
    { cx: 420, cy: 120 },
    { cx: 580, cy: 120 },
    { cx: 740, cy: 210 },
    { cx: 460, cy: 420 },
  ];

  return (
    <svg
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="circuitGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="nodeGlowFilter">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Circuit paths */}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeOpacity={animatedOpacity}
          strokeDasharray="8 4"
          style={{
            animation: `circuitFlow ${3.5 + i * 0.4}s linear ${i * 0.5}s infinite`,
          }}
          filter="url(#circuitGlow)"
        />
      ))}

      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.cx}
            cy={n.cy}
            r="5"
            fill={stroke}
            fillOpacity={animatedOpacity * 2}
            filter="url(#nodeGlowFilter)"
            style={{
              animation: `nodeGlow ${
                2 + (i % 3) * 0.7
              }s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
          <circle
            cx={n.cx}
            cy={n.cy}
            r="9"
            fill="none"
            stroke={stroke}
            strokeWidth="1"
            strokeOpacity={animatedOpacity}
            style={{
              animation: `nodeGlow ${
                2 + (i % 3) * 0.7
              }s ease-in-out ${i * 0.3 + 0.5}s infinite`,
            }}
          />
        </g>
      ))}
    </svg>
  );
}
