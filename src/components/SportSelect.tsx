import type { ReactNode } from 'react';
import type { Sport } from '../hooks/useSport';

interface SportSelectProps {
  /** Called with the picked sport; the app then themes itself accordingly. */
  onSelect: (sport: Sport) => void;
}

/**
 * The landing screen every new visitor sees: a full-bleed split view that lets
 * them choose the sport they want to score.
 *
 * The two halves preview the surface they stand for – terracotta clay for
 * tennis, green artificial turf for padel – and picking one applies the
 * matching theme to the rest of the app (see {@link useSport}).
 *
 * Layout: stacked halves on phones, side-by-side from the `md` breakpoint up,
 * where the hovered/focused half also grows slightly.
 */
export function SportSelect({ onSelect }: SportSelectProps) {
  return (
    <div className="relative flex h-full min-h-full w-full flex-col overflow-hidden md:flex-row">
      <SportPanel
        surface="court-clay"
        title="Tennis"
        tagline="Clay court"
        description="Singles or doubles, sets and tiebreaks."
        icon={<TennisBallIcon />}
        lines={
          <>
            {/* Stacked halves are wide and short, side-by-side ones tall and
                narrow – so the court turns with them to stay large. */}
            <TennisCourt landscape className="md:hidden" />
            <TennisCourt className="hidden md:block" />
          </>
        }
        onClick={() => onSelect('tennis')}
      />

      {/* Centre divider with the app name. Sits above both halves, and turns
          from a horizontal seam (mobile) into a vertical one (desktop). */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center md:inset-y-0 md:left-1/2 md:top-0 md:w-0 md:-translate-x-1/2 md:translate-y-0">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white/90 shadow-lg backdrop-blur-sm sm:text-xs">
          Pick your court
        </span>
      </div>

      <SportPanel
        surface="court-turf"
        title="Padel"
        tagline="Artificial turf"
        description="Doubles matches and full tournaments."
        icon={<PadelRacketIcon />}
        lines={
          <>
            <PadelCourt landscape className="md:hidden" />
            <PadelCourt className="hidden md:block" />
          </>
        }
        onClick={() => onSelect('padel')}
      />
    </div>
  );
}

interface SportPanelProps {
  /** Court surface class (`court-clay` / `court-turf`). */
  surface: string;
  title: string;
  tagline: string;
  description: string;
  icon: ReactNode;
  /** The sport's court markings, drawn behind the label. */
  lines: ReactNode;
  onClick: () => void;
}

/** One half of the split screen: a tappable, full-height court preview. */
function SportPanel({
  surface,
  title,
  tagline,
  description,
  icon,
  lines,
  onClick,
}: SportPanelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Score a ${title.toLowerCase()} match`}
      // `flex-1` (basis 0) is what makes the two halves share the space purely by
      // flex-grow, so the hover below can widen one of them smoothly. Grow the
      // panel with `grow-*` and never with the `flex-*` shorthand: the shorthand
      // also resets flex-basis, which would shrink the hovered half instead of
      // widening it and make the divider chase the cursor.
      className={`court ${surface} group relative flex flex-1 flex-col items-center
        justify-center gap-3 overflow-hidden px-6 py-10 text-center transition-[flex-grow]
        duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-inset
        focus-visible:ring-white/70 sm:gap-4 md:hover:grow-[1.25] md:focus-visible:grow-[1.25]`}
    >
      {/* Painted court markings, purely decorative. The markings brighten on
          hover and on touch - that is the feedback, not the wash below. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-3 opacity-40 transition-opacity duration-300 group-hover:opacity-60 group-active:opacity-75 sm:inset-6"
      >
        {lines}
      </span>
      {/* Darkening wash so the label stays readable on both surfaces. Held
          constant: lightening it on hover dropped the white text from 8.0:1 to
          6.2:1 exactly when someone was reading it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/25"
      />

      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-white shadow-2xl ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-active:scale-95 sm:h-24 sm:w-24">
        {icon}
      </span>

      <span className="relative flex flex-col items-center gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 sm:text-xs">
          {tagline}
        </span>
        <span className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
          {title}
        </span>
        <span className="max-w-xs text-sm text-white/80 sm:text-base">
          {description}
        </span>
      </span>

      <span className="relative mt-1 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black/80 opacity-90 shadow-lg transition-all duration-300 group-hover:opacity-100 sm:text-base">
        Start scoring
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </button>
  );
}

/** Runoff drawn around the playing area, in the same centimetre units. */
const COURT_MARGIN = 130;

/** Props shared by the two court drawings. */
interface CourtVariantProps {
  landscape?: boolean;
  className?: string;
}

interface CourtSvgProps {
  /** Court width (sideline to sideline) in centimetres. */
  width: number;
  /** Court length (baseline to baseline) in centimetres. */
  length: number;
  /**
   * Turns the court a quarter turn, so it fills a panel that is wider than it
   * is tall (the stacked phone layout).
   */
  landscape?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Shared wrapper for both court drawings. Keeps the whole court visible and
 * centred inside the panel (`meet`), whatever aspect ratio the split screen
 * currently has, and paints every marking in the surface's line colour.
 */
function CourtSvg({
  width,
  length,
  landscape = false,
  className = '',
  children,
}: CourtSvgProps) {
  const m = COURT_MARGIN;
  // Drawing area including the runoff, with the origin at (-m, -m).
  const vw = width + 2 * m;
  const vh = length + 2 * m;

  return (
    <svg
      viewBox={
        landscape ? `0 0 ${vh} ${vw}` : `${-m} ${-m} ${vw} ${vh}`
      }
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className}`}
      fill="none"
      stroke="rgb(var(--court-line))"
      strokeLinecap="square"
      aria-hidden
    >
      {/* Rotating clockwise maps (x, y) → (−y, x); the translation shifts the
          result back into the landscape viewBox. */}
      <g transform={landscape ? `translate(${length + m} ${m}) rotate(90)` : undefined}>
        {children}
      </g>
    </svg>
  );
}

/** Line width: about twice the real 5 cm paint, so it survives scaling down. */
const LINE = 11;

/**
 * A tennis court to ITF dimensions, seen from above. All coordinates are in
 * centimetres, so the proportions are exactly those of a real court:
 * 23.77 m long, 10.97 m wide for doubles and 8.23 m for singles, with the
 * service lines 6.40 m from the net.
 */
function TennisCourt({ landscape, className }: CourtVariantProps) {
  const W = 1097; // doubles width
  const L = 2377; // baseline to baseline
  const SINGLES = 137; // inset of the singles sidelines ((10.97 − 8.23) / 2)
  const NET = L / 2;
  const SERVICE = 640; // service line distance from the net
  const MID = W / 2;

  return (
    <CourtSvg
      width={W}
      length={L}
      landscape={landscape}
      className={className}
    >
      <g strokeWidth={LINE}>
        {/* Doubles court outline (outer sidelines + both baselines) */}
        <rect x={0} y={0} width={W} height={L} />
        {/* Singles sidelines, running the full length inside the doubles ones */}
        <path d={`M${SINGLES} 0V${L}M${W - SINGLES} 0V${L}`} />
        {/* Service lines, spanning only between the singles sidelines */}
        <path
          d={`M${SINGLES} ${NET - SERVICE}H${W - SINGLES}M${SINGLES} ${
            NET + SERVICE
          }H${W - SINGLES}`}
        />
        {/* Centre service line, splitting the four service boxes */}
        <path d={`M${MID} ${NET - SERVICE}V${NET + SERVICE}`} />
        {/* Centre marks: short ticks on both baselines */}
        <path d={`M${MID} 0v40M${MID} ${L}v-40`} />
      </g>

      {/* The net, with its posts standing 0.91 m outside the doubles sidelines. */}
      <g opacity={0.75}>
        <path
          d={`M-91 ${NET}H${W + 91}`}
          strokeWidth={LINE * 1.6}
          strokeDasharray="26 18"
        />
        <path
          d={`M-91 ${NET - 46}v92M${W + 91} ${NET - 46}v92`}
          strokeWidth={LINE * 2}
        />
      </g>
    </CourtSvg>
  );
}

/**
 * A padel court to FIP dimensions, seen from above: 20 m by 10 m, enclosed by
 * glass and mesh. Padel carries far fewer markings than tennis – only the two
 * service lines 6.95 m from the back wall and the centre service line between
 * them. There are no singles lines and nothing behind the service lines.
 */
function PadelCourt({ landscape, className }: CourtVariantProps) {
  const W = 1000;
  const L = 2000;
  const NET = L / 2;
  const SERVICE = 305; // service line distance from the net (10 m − 6.95 m)
  const MID = W / 2;

  return (
    <CourtSvg
      width={W}
      length={L}
      landscape={landscape}
      className={className}
    >
      {/* The enclosure: glass behind the baselines, mesh along the sides. It
          stands right at the court boundary, hence the small offset only. */}
      <rect
        x={-55}
        y={-55}
        width={W + 110}
        height={L + 110}
        strokeWidth={LINE * 1.4}
        opacity={0.55}
      />

      <g strokeWidth={LINE}>
        {/* Court outline */}
        <rect x={0} y={0} width={W} height={L} />
        {/* Service lines on both sides of the net */}
        <path d={`M0 ${NET - SERVICE}H${W}M0 ${NET + SERVICE}H${W}`} />
        {/* Centre service line: runs from one service line to the other,
            splitting both pairs of service boxes. */}
        <path d={`M${MID} ${NET - SERVICE}V${NET + SERVICE}`} />
      </g>

      {/* The net, spanning the full width between the side walls. */}
      <g opacity={0.75}>
        <path
          d={`M0 ${NET}H${W}`}
          strokeWidth={LINE * 1.6}
          strokeDasharray="26 18"
        />
        <path
          d={`M0 ${NET - 46}v92M${W} ${NET - 46}v92`}
          strokeWidth={LINE * 2}
        />
      </g>
    </CourtSvg>
  );
}

/** A tennis ball with its two curved seams. */
function TennisBallIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="h-11 w-11 sm:h-12 sm:w-12"
      aria-hidden
    >
      <circle cx="24" cy="24" r="18" />
      <path d="M10.5 11.5Q24 24 10.5 36.5" />
      <path d="M37.5 11.5Q24 24 37.5 36.5" />
    </svg>
  );
}

/** A padel racket: perforated solid head on a short handle. */
function PadelRacketIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-11 w-11 sm:h-12 sm:w-12"
      aria-hidden
    >
      {/* Head */}
      <path d="M24 4c8.8 0 15 6.6 15 15 0 8.4-6.7 15-15 15S9 27.4 9 19C9 10.6 15.2 4 24 4Z" />
      {/* Handle */}
      <path d="M20.5 33.4 19 43a2 2 0 0 0 2 2.3h6a2 2 0 0 0 2-2.3l-1.5-9.6" />
      {/* Perforations */}
      <g strokeWidth={2.2}>
        <path d="M18 15h.01M24 15h.01M30 15h.01M18 22h.01M24 22h.01M30 22h.01M21 28.5h.01M27 28.5h.01" />
      </g>
    </svg>
  );
}
