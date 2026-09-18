type LogoProps = {
  size?: number;
  withText?: boolean;
  tone?: "dark" | "light";
  className?: string;
};

// Shapes from the codov brand kit v2 (1-logo/codov-color.svg)
const C = "M308 -566Q413 -566 483.5 -511.0Q554 -456 576 -356H394Q371 -420 305 -420Q258 -420 230.0 -383.5Q202 -347 202 -279Q202 -211 230.0 -174.5Q258 -138 305 -138Q371 -138 394 -202H576Q554 -104 483.0 -48.0Q412 8 308 8Q226 8 162.5 -27.0Q99 -62 63.5 -127.0Q28 -192 28 -279Q28 -366 63.5 -431.0Q99 -496 162.5 -531.0Q226 -566 308 -566Z";
const O1 = "M608 -279Q608 -365 646.0 -430.5Q684 -496 750.0 -531.0Q816 -566 898 -566Q980 -566 1046.0 -531.0Q1112 -496 1150.0 -430.5Q1188 -365 1188 -279Q1188 -193 1149.5 -127.5Q1111 -62 1044.5 -27.0Q978 8 896 8Q814 8 748.5 -27.0Q683 -62 645.5 -127.0Q608 -192 608 -279ZM1014 -279Q1014 -346 980.5 -382.0Q947 -418 898 -418Q848 -418 815.0 -382.5Q782 -347 782 -279Q782 -212 814.5 -176.0Q847 -140 896 -140Q945 -140 979.5 -176.0Q1014 -212 1014 -279Z";
const D = "M1466 -566Q1521 -566 1566.5 -543.0Q1612 -520 1638 -481V-740H1809V0H1638V-80Q1614 -40 1569.5 -16.0Q1525 8 1466 8Q1397 8 1341.0 -27.5Q1285 -63 1252.5 -128.5Q1220 -194 1220 -280Q1220 -366 1252.5 -431.0Q1285 -496 1341.0 -531.0Q1397 -566 1466 -566ZM1516 -417Q1465 -417 1429.5 -380.5Q1394 -344 1394 -280Q1394 -216 1429.5 -178.5Q1465 -141 1516 -141Q1567 -141 1602.5 -178.0Q1638 -215 1638 -279Q1638 -343 1602.5 -380.0Q1567 -417 1516 -417Z";
const O2 = "M1874 -279Q1874 -365 1912.0 -430.5Q1950 -496 2016.0 -531.0Q2082 -566 2164 -566Q2246 -566 2312.0 -531.0Q2378 -496 2416.0 -430.5Q2454 -365 2454 -279Q2454 -193 2415.5 -127.5Q2377 -62 2310.5 -27.0Q2244 8 2162 8Q2080 8 2014.5 -27.0Q1949 -62 1911.5 -127.0Q1874 -192 1874 -279ZM2280 -279Q2280 -346 2246.5 -382.0Q2213 -418 2164 -418Q2114 -418 2081.0 -382.5Q2048 -347 2048 -279Q2048 -212 2080.5 -176.0Q2113 -140 2162 -140Q2211 -140 2245.5 -176.0Q2280 -212 2280 -279Z";
const V = "M2771 -160 2892 -558H3074L2876 0H2665L2467 -558H2650Z";

const COLORS = {
  // Follows the light/dark theme through CSS variables
  dark: { ink: "var(--logo-ink)", accent: "var(--logo-accent)" },
  light: { ink: "#F6F3EC", accent: "#F07A57" },
};

/** The four-shape symbol (square, two quarter circles, circle) from the brand kit */
function BrandSymbol({ ink, accent }: { ink: string; accent: string }) {
  return (
    <>
      <rect x="302" y="302" width="200" height="200" rx="20" fill={ink} />
      <path d="M522 502 A200 200 0 0 1 722 302 L722 502 Z" fill={accent} />
      <path d="M302 522 L502 522 L502 722 A200 200 0 0 1 302 522 Z" fill={accent} />
      <rect x="522" y="522" width="200" height="200" rx="100" fill={ink} />
    </>
  );
}

/** Just the symbol, following the theme */
export function LogoMark({ size = 32, tone = "dark" }: { size?: number; tone?: LogoProps["tone"] }) {
  const { ink, accent } = COLORS[tone];
  return (
    <svg width={size} height={size} viewBox="302 302 420 420" aria-hidden="true">
      <BrandSymbol ink={ink} accent={accent} />
    </svg>
  );
}

/** Symbol + "codov" wordmark (codov-color.svg layout); `size` is the symbol height */
export function Logo({ size = 32, withText = true, tone = "dark", className = "" }: LogoProps) {
  if (!withText) return <LogoMark size={size} tone={tone} />;
  const { ink, accent } = COLORS[tone];
  // Content of the 2400×900 brand artboard: x 161…2239, y 240…660
  const width = Math.round((size * 2078) / 420);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <svg height={size} width={width} viewBox="161 240 2078 420" role="img" aria-label="codov">
        <g transform="translate(-140.7,-62)">
          <BrandSymbol ink={ink} accent={accent} />
        </g>
        <g transform="translate(677.1,635.9) scale(0.508)">
          <path fill={ink} d={C} />
          <path fill={accent} d={O1} />
          <path fill={ink} d={D} />
          <path fill={accent} d={O2} />
          <path fill={ink} d={V} />
        </g>
      </svg>
    </span>
  );
}
