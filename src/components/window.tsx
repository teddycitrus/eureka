"use client";

import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Minus, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CHROME_HEIGHT = 40;
const ANIM_MS = 320;
const EASE = "cubic-bezier(.2,.8,.2,1)";

type Pos = { x: number; y: number };
type Size = { width: number; height: number };

export type WindowProps = {
  title: string;
  defaultPos: Pos;
  defaultSize: Size;
  minSize?: Size;
  zIndex?: number;
  onFocus?: () => void;
  bounds?: string;
  /** Pixel inset from edges when maximizing (e.g. {top: 60} keeps a header visible). */
  maxInsets?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  /** Extra controls injected into the title-bar (e.g. tab pills). */
  titleAccessory?: React.ReactNode;
  /** If provided, adds a close (X) button to the titlebar. */
  onClose?: () => void;
  /** Render in the page flow instead of floating (narrow screens). */
  docked?: boolean;
  /** A dialog: draggable, but without minimize and maximize. */
  dialog?: boolean;
  children: React.ReactNode;
};

/**
 * A draggable / resizable / minimizable / maximizable panel.
 * Drag-to-move uses CSS transform (instant). Min/max actions briefly enable
 * a transition on width/height/transform so the resize/move is smooth, then
 * disable it again so the next drag is responsive.
 */
export function Window({
  title,
  defaultPos,
  defaultSize,
  minSize,
  zIndex = 10,
  onFocus,
  bounds = "parent",
  maxInsets,
  className,
  titleAccessory,
  onClose,
  docked = false,
  dialog = false,
  children,
}: WindowProps) {
  const [pos, setPos] = useState<Pos>(defaultPos);
  const [size, setSize] = useState<Size>(defaultSize);
  const [isMin, setIsMin] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Saves so we can restore from min/max
  const restoreFromMin = useRef<Size | null>(null);
  const restoreFromMax = useRef<{ pos: Pos; size: Size } | null>(null);

  // Track viewport so maximize fills available space
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const u = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  const animate = (mut: () => void) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setAnimating(true);
    mut();
    window.setTimeout(() => setAnimating(false), ANIM_MS + 40);
  };

  const toggleMin = () => {
    onFocus?.();
    animate(() => {
      if (isMin) {
        setIsMin(false);
        if (restoreFromMin.current) setSize(restoreFromMin.current);
      } else {
        if (isMax) return; // max takes precedence
        restoreFromMin.current = size;
        setIsMin(true);
        setSize({ width: size.width, height: CHROME_HEIGHT });
      }
    });
  };

  const toggleMax = () => {
    onFocus?.();
    animate(() => {
      if (isMax) {
        setIsMax(false);
        if (restoreFromMax.current) {
          setPos(restoreFromMax.current.pos);
          setSize(restoreFromMax.current.size);
        }
      } else {
        if (isMin) {
          setIsMin(false);
          restoreFromMin.current = null;
        }
        restoreFromMax.current = { pos, size };
        setIsMax(true);
        const t = maxInsets?.top ?? 16;
        const r = maxInsets?.right ?? 16;
        const b = maxInsets?.bottom ?? 16;
        const l = maxInsets?.left ?? 16;
        setPos({ x: l, y: t });
        setSize({ width: vp.w - l - r, height: vp.h - t - b });
      }
    });
  };

  const titlebar = (
    <div
      className={cn(
        "window-titlebar flex shrink-0 select-none items-center justify-between gap-3 border-b border-rule pl-4 pr-2",
        !docked && "cursor-grab active:cursor-grabbing",
        isMax && "cursor-default active:cursor-default",
      )}
      style={{ height: CHROME_HEIGHT }}
      onDoubleClick={docked || dialog ? undefined : toggleMax}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        {titleAccessory && (
          <span className="truncate text-xs text-ink-muted">{titleAccessory}</span>
        )}
      </div>
      <div className="flex items-center text-ink-muted">
        {!docked && !dialog && (
          <>
            <Ctl onClick={toggleMin} title={isMin ? `Restore ${title}` : `Minimize ${title}`}>
              <Minus className="h-3.5 w-3.5" />
            </Ctl>
            <Ctl onClick={toggleMax} title={isMax ? `Restore ${title}` : `Maximize ${title}`}>
              {isMax ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Ctl>
          </>
        )}
        {onClose && (
          <Ctl onClick={onClose} title={`Close ${title}`}>
            <X className="h-3.5 w-3.5" />
          </Ctl>
        )}
      </div>
    </div>
  );

  if (docked) {
    return (
      <section className={cn("panel flex flex-col overflow-hidden rounded-md", className)}>
        {titlebar}
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    );
  }

  return (
    <Rnd
      position={pos}
      size={size}
      onDragStart={() => onFocus?.()}
      onDragStop={(_e, d) => setPos({ x: d.x, y: d.y })}
      onResizeStart={() => onFocus?.()}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        setSize({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
        });
        setPos({ x: position.x, y: position.y });
      }}
      minWidth={minSize?.width ?? 240}
      minHeight={minSize?.height ?? CHROME_HEIGHT}
      bounds={bounds}
      enableResizing={!isMin && !isMax}
      disableDragging={isMax}
      dragHandleClassName="window-titlebar"
      cancel="button"
      style={{
        zIndex,
        transition: animating
          ? `width ${ANIM_MS}ms ${EASE}, height ${ANIM_MS}ms ${EASE}, transform ${ANIM_MS}ms ${EASE}`
          : undefined,
      }}
    >
      <section
        onMouseDownCapture={onFocus}
        className={cn("panel flex h-full w-full flex-col overflow-hidden rounded-md", className)}
      >
        {titlebar}
        {/* ── Body (collapses on minimize) ─────────────────────── */}
        <div
          className="min-h-0 flex-1 overflow-hidden"
          style={{
            transition: animating ? `opacity ${ANIM_MS}ms ${EASE}` : undefined,
            opacity: isMin ? 0 : 1,
            pointerEvents: isMin ? "none" : "auto",
          }}
        >
          {children}
        </div>
      </section>
    </Rnd>
  );
}

function Ctl({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  );
}
