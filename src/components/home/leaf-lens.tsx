"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Leaf, ScanSearch, Sparkles } from "lucide-react";

import { LeafScanOverlay } from "@/components/home/leaf-scan-overlay";
import { useTr } from "@/lib/use-tr";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type AnnotationId = "lesion" | "compare";

const hotspot = {
  id: "lesion",
  x: 64,
  y: 56,
  radius: 9.5,
  title: "Vùng cần chú ý",
  titleEn: "Area to watch",
  description: "Đốm nâu có rìa sẫm trên bề mặt lá.",
  descriptionEn: "Brown spot with a dark edge on the leaf surface.",
  tone: "sun",
  calloutPosition: "left-top",
  connectorAnchor: { x: 37, y: 29 },
} as const;

export function LeafLens() {
  const tr = useTr();
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<AnnotationId | null>(null);
  const [pinnedAnnotation, setPinnedAnnotation] = useState<AnnotationId | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const media = mediaRef.current;

    if (!root || !media) return;

    const matchMedia = gsap.matchMedia();
    const context = gsap.context(() => {
      const scanLine = root.querySelector<HTMLElement>("[data-leaf-scan]");
      const scrim = root.querySelector<HTMLElement>("[data-leaf-scrim]");
      const focusImage = root.querySelector<HTMLElement>("[data-leaf-focus-image]");
      const focusDetail = root.querySelector<HTMLElement>("[data-leaf-focus-detail]");
      const focusRing = root.querySelector<HTMLElement>("[data-leaf-focus-ring]");
      const focusInner = root.querySelector<HTMLElement>("[data-leaf-focus-inner]");
      const activeBorder = root.querySelector<HTMLElement>("[data-leaf-active-border]");
      const halos = gsap.utils.toArray<HTMLElement>("[data-leaf-halo]");
      const connectors = gsap.utils.toArray<SVGPathElement>("[data-leaf-connector]");
      const callouts = gsap.utils.toArray<HTMLElement>("[data-leaf-callout]");
      const scanIcon = root.querySelector<HTMLElement>("[data-leaf-scan-icon]");
      const resultLabel = root.querySelector<HTMLElement>("[data-leaf-result-label]");
      const resultValue = root.querySelector<HTMLElement>("[data-leaf-result-value]");
      const resultFlash = root.querySelector<HTMLElement>("[data-leaf-result-flash]");
      const quality = root.querySelector<HTMLElement>("[data-leaf-quality]");
      const qualityDot = root.querySelector<HTMLElement>("[data-leaf-quality-dot]");

      const setCalloutRestState = () => {
        callouts.forEach((callout, index) => {
          gsap.set(callout, {
            autoAlpha: 0,
            x: index === 0 ? -14 : 14,
            y: 10,
            scale: 0.975,
          });
        });
      };

      const setInitialState = () => {
        gsap.set(media, { autoAlpha: 0.92, scale: 0.985 });
        gsap.set(scanLine, { autoAlpha: 0, yPercent: -120 });
        gsap.set(scrim, { autoAlpha: 0 });
        gsap.set(focusImage, { autoAlpha: 0 });
        gsap.set(focusDetail, { scale: 1, transformOrigin: `${hotspot.x}% ${hotspot.y}%` });
        gsap.set(focusRing, { autoAlpha: 0, scale: 0.72 });
        gsap.set(focusInner, { rotation: -18, transformOrigin: "50% 50%" });
        gsap.set(activeBorder, { autoAlpha: 0 });
        gsap.set(halos, { autoAlpha: 0, scale: 0.72, transformOrigin: "50% 50%" });
        gsap.set(connectors, { strokeDashoffset: 1 });
        setCalloutRestState();
        gsap.set(scanIcon, { rotation: -8, scale: 0.92, transformOrigin: "50% 50%" });
        gsap.set(resultLabel, { autoAlpha: 0.58 });
        gsap.set(resultValue, { autoAlpha: 0.58, y: 8 });
        gsap.set(resultFlash, { autoAlpha: 0, xPercent: -135 });
        gsap.set(quality, { autoAlpha: 0.62 });
        gsap.set(qualityDot, { autoAlpha: 0.35, scale: 0.72 });
      };

      const setDesktopIdleState = () => {
        gsap.set(media, { autoAlpha: 1, scale: 1 });
        gsap.set(scanLine, { autoAlpha: 0, yPercent: -120 });
        gsap.set(scrim, { autoAlpha: 0.14 });
        gsap.set(focusImage, { autoAlpha: 0.24 });
        gsap.set(focusDetail, { scale: 1.008, transformOrigin: `${hotspot.x}% ${hotspot.y}%` });
        gsap.set(focusRing, { autoAlpha: 0.46, scale: 0.92 });
        gsap.set(focusInner, { rotation: -18, transformOrigin: "50% 50%" });
        gsap.set(activeBorder, { autoAlpha: 0 });
        gsap.set(halos, { autoAlpha: 0, scale: 0.72, transformOrigin: "50% 50%" });
        gsap.set(connectors, { strokeDashoffset: 1 });
        setCalloutRestState();
        gsap.set(scanIcon, { rotation: 0, scale: 1, transformOrigin: "50% 50%" });
        gsap.set(resultLabel, { autoAlpha: 0.78 });
        gsap.set(resultValue, { autoAlpha: 0.82, y: 3 });
        gsap.set(resultFlash, { autoAlpha: 0, xPercent: -135 });
        gsap.set(quality, { autoAlpha: 0.76 });
        gsap.set(qualityDot, { autoAlpha: 0.48, scale: 0.82 });
      };

      const setFinalState = () => {
        gsap.set(media, { autoAlpha: 1, scale: 1 });
        gsap.set(scanLine, { autoAlpha: 0, yPercent: -120 });
        gsap.set(scrim, { autoAlpha: 1 });
        gsap.set(focusImage, { autoAlpha: 1 });
        gsap.set(focusDetail, { scale: 1.035, transformOrigin: `${hotspot.x}% ${hotspot.y}%` });
        gsap.set(focusRing, { autoAlpha: 1, scale: 1 });
        gsap.set(focusInner, { rotation: 18, transformOrigin: "50% 50%" });
        gsap.set(activeBorder, { autoAlpha: 0.82 });
        gsap.set(halos, { autoAlpha: 0, scale: 1.45 });
        gsap.set(connectors, { strokeDashoffset: 0 });
        gsap.set(callouts, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
        gsap.set(scanIcon, { rotation: 0, scale: 1 });
        gsap.set(resultFlash, { autoAlpha: 0, xPercent: 135 });
        gsap.set([resultLabel, resultValue, quality, qualityDot], { autoAlpha: 1, y: 0, scale: 1 });
      };

      const buildTimeline = () => {
        const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });

        timeline
          .to(media, { autoAlpha: 1, scale: 1, duration: 0.12 }, 0)
          .fromTo(
            scanLine,
            { autoAlpha: 0, yPercent: -120 },
            { autoAlpha: 0.62, yPercent: 520, duration: 0.16 },
            0.12,
          )
          .to(scanLine, { autoAlpha: 0, duration: 0.05 }, 0.25)
          .to(scrim, { autoAlpha: 1, duration: 0.18 }, 0.24)
          .to(focusImage, { autoAlpha: 1, duration: 0.2 }, 0.34)
          .to(focusDetail, { scale: 1.035, duration: 0.28, ease: "power2.out" }, 0.34)
          .to(focusRing, { autoAlpha: 1, scale: 1, duration: 0.16, ease: "back.out(1.25)" }, 0.36)
          .to(focusInner, { rotation: 18, duration: 0.32, ease: "power2.out" }, 0.38)
          .to(focusRing, { scale: 1.06, duration: 0.06, ease: "power1.out" }, 0.5)
          .to(focusRing, { scale: 1, duration: 0.08, ease: "power1.out" }, 0.56)
          .to(activeBorder, { autoAlpha: 0.82, duration: 0.16 }, 0.4)
          .to(connectors, { strokeDashoffset: 0, duration: 0.18, stagger: 0.025 }, 0.48)
          .to(callouts, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.18, stagger: 0.08, ease: "power2.out" }, 0.6)
          .to(resultLabel, { autoAlpha: 1, duration: 0.12 }, 0.76)
          .to(resultValue, { autoAlpha: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.78)
          .to(quality, { autoAlpha: 1, duration: 0.12 }, 0.84)
          .to(qualityDot, { autoAlpha: 1, scale: 1, duration: 0.14, ease: "back.out(1.35)" }, 0.86);

        return timeline;
      };

      matchMedia.add("(prefers-reduced-motion: reduce)", () => {
        setFinalState();
      });

      matchMedia.add("(prefers-reduced-motion: no-preference) and (min-width: 1100px)", () => {
        const supportsInspectionHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        if (!supportsInspectionHover) {
          setInitialState();
          const timeline = buildTimeline();

          ScrollTrigger.create({
            trigger: media,
            start: "top 28%",
            end: "+=140",
            animation: timeline,
            scrub: 0.6,
            invalidateOnRefresh: true,
            fastScrollEnd: false,
          });

          return;
        }

        setDesktopIdleState();

        let inspectionOpen = false;
        let pointerInside = false;
        let focusInside = false;
        let inspectionTimeline: gsap.core.Timeline | null = null;
        let leaveTimeline: gsap.core.Timeline | null = null;

        const animatedTargets = [
          scanLine,
          scrim,
          focusImage,
          focusDetail,
          focusRing,
          focusInner,
          activeBorder,
          ...halos,
          ...connectors,
          ...callouts,
          scanIcon,
          resultLabel,
          resultValue,
          resultFlash,
          quality,
          qualityDot,
        ].filter(Boolean);

        const stopInspectionAnimations = () => {
          inspectionTimeline?.kill();
          leaveTimeline?.kill();
          gsap.killTweensOf(animatedTargets);
        };

        const playInspection = () => {
          if (inspectionOpen) return;

          inspectionOpen = true;
          stopInspectionAnimations();
          gsap.set(scanLine, { autoAlpha: 0, yPercent: -120 });
          gsap.set(halos, { autoAlpha: 0, scale: 0.72 });
          gsap.set(resultFlash, { autoAlpha: 0, xPercent: -135 });

          inspectionTimeline = gsap.timeline({ defaults: { overwrite: "auto" } });
          inspectionTimeline
            .to(activeBorder, { autoAlpha: 1, duration: 0.16, ease: "power2.out" }, 0)
            .to(scrim, { autoAlpha: 1, duration: 0.2, ease: "power2.out" }, 0)
            .to(focusImage, { autoAlpha: 1, duration: 0.22, ease: "power2.out" }, 0.03)
            .to(focusDetail, { scale: 1.045, duration: 0.48, ease: "power3.out" }, 0.03)
            .fromTo(
              scanLine,
              { autoAlpha: 0, yPercent: -120 },
              { autoAlpha: 0.72, yPercent: 690, duration: 0.52, ease: "power1.inOut" },
              0.05,
            )
            .to(scanLine, { autoAlpha: 0, duration: 0.1, ease: "power1.out" }, 0.5)
            .to(focusRing, { autoAlpha: 1, scale: 1.08, duration: 0.3, ease: "back.out(1.7)" }, 0.09)
            .to(focusRing, { scale: 1, duration: 0.17, ease: "power2.out" }, 0.37)
            .to(focusInner, { rotation: 18, duration: 0.46, ease: "power2.out" }, 0.1)
            .fromTo(
              halos[0],
              { autoAlpha: 0, scale: 0.72 },
              { autoAlpha: 0.58, scale: 1.32, duration: 0.28, ease: "power2.out" },
              0.15,
            )
            .to(halos[0], { autoAlpha: 0, scale: 1.48, duration: 0.2, ease: "power1.out" }, 0.37)
            .fromTo(
              halos[1],
              { autoAlpha: 0, scale: 0.72 },
              { autoAlpha: 0.4, scale: 1.46, duration: 0.34, ease: "power2.out" },
              0.23,
            )
            .to(halos[1], { autoAlpha: 0, scale: 1.62, duration: 0.2, ease: "power1.out" }, 0.5)
            .to(connectors, { strokeDashoffset: 0, duration: 0.27, stagger: 0.035, ease: "power2.inOut" }, 0.26)
            .to(
              callouts,
              { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.3, stagger: 0.08, ease: "power3.out" },
              0.34,
            )
            .to(resultLabel, { autoAlpha: 1, duration: 0.15, ease: "power2.out" }, 0.43)
            .to(resultValue, { autoAlpha: 1, y: 0, duration: 0.22, ease: "power3.out" }, 0.45)
            .to(quality, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, 0.48)
            .to(qualityDot, { autoAlpha: 1, scale: 1, duration: 0.22, ease: "back.out(1.7)" }, 0.49)
            .fromTo(
              resultFlash,
              { autoAlpha: 0, xPercent: -135 },
              { autoAlpha: 0.62, xPercent: 135, duration: 0.56, ease: "power2.inOut" },
              0.38,
            )
            .to(resultFlash, { autoAlpha: 0, duration: 0.1 }, 0.88)
            .to(scanIcon, { rotation: 8, scale: 1.1, duration: 0.2, ease: "back.out(1.8)" }, 0.13)
            .to(scanIcon, { rotation: 0, scale: 1, duration: 0.18, ease: "power2.out" }, 0.34);
        };

        const closeInspection = () => {
          if (!inspectionOpen) return;

          inspectionOpen = false;
          stopInspectionAnimations();

          leaveTimeline = gsap.timeline({ defaults: { duration: 0.22, ease: "power2.out", overwrite: "auto" } });
          callouts.forEach((callout, index) => {
            leaveTimeline?.to(
              callout,
              { autoAlpha: 0, x: index === 0 ? -10 : 10, y: 7, scale: 0.985, duration: 0.17 },
              index * 0.025,
            );
          });
          leaveTimeline
            .to(connectors, { strokeDashoffset: 1, duration: 0.16, stagger: 0.02 }, 0)
            .to(activeBorder, { autoAlpha: 0, duration: 0.18 }, 0)
            .to(scrim, { autoAlpha: 0.14 }, 0)
            .to(focusImage, { autoAlpha: 0.24 }, 0)
            .to(focusDetail, { scale: 1.008, duration: 0.28 }, 0)
            .to(focusRing, { autoAlpha: 0.46, scale: 0.92 }, 0)
            .to(focusInner, { rotation: -18 }, 0)
            .to(resultLabel, { autoAlpha: 0.78 }, 0.03)
            .to(resultValue, { autoAlpha: 0.82, y: 3 }, 0.03)
            .to(quality, { autoAlpha: 0.76 }, 0.03)
            .to(qualityDot, { autoAlpha: 0.48, scale: 0.82 }, 0.03)
            .to(scanIcon, { rotation: 0, scale: 1 }, 0)
            .set(scanLine, { autoAlpha: 0, yPercent: -120 })
            .set(halos, { autoAlpha: 0, scale: 0.72 })
            .set(resultFlash, { autoAlpha: 0, xPercent: -135 });
        };

        const handleMouseEnter = () => {
          pointerInside = true;
          playInspection();
        };

        const handleMouseLeave = () => {
          pointerInside = false;
          if (!focusInside) closeInspection();
        };

        const handleFocusIn = () => {
          focusInside = true;
          playInspection();
        };

        const handleFocusOut = (event: FocusEvent) => {
          if (event.relatedTarget instanceof Node && media.contains(event.relatedTarget)) return;
          focusInside = false;
          if (!pointerInside) closeInspection();
        };

        media.addEventListener("mouseenter", handleMouseEnter);
        media.addEventListener("mouseleave", handleMouseLeave);
        media.addEventListener("focusin", handleFocusIn);
        media.addEventListener("focusout", handleFocusOut);

        return () => {
          media.removeEventListener("mouseenter", handleMouseEnter);
          media.removeEventListener("mouseleave", handleMouseLeave);
          media.removeEventListener("focusin", handleFocusIn);
          media.removeEventListener("focusout", handleFocusOut);
          stopInspectionAnimations();
        };
      });

      matchMedia.add("(prefers-reduced-motion: no-preference) and (min-width: 768px) and (max-width: 1099px)", () => {
        setInitialState();
        const timeline = buildTimeline();

        ScrollTrigger.create({
          trigger: media,
          start: "top 28%",
          end: "+=140",
          animation: timeline,
          scrub: 0.6,
          invalidateOnRefresh: true,
          fastScrollEnd: false,
        });
      });

      matchMedia.add("(prefers-reduced-motion: no-preference) and (max-width: 767px)", () => {
        setInitialState();
        const timeline = buildTimeline();
        timeline.duration(1.15);

        ScrollTrigger.create({
          trigger: media,
          start: "top 74%",
          once: true,
          onEnter: () => timeline.play(),
          invalidateOnRefresh: true,
        });
      });
    }, root);

    return () => {
      matchMedia.revert();
      context.revert();
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinnedAnnotation(null);
        setActiveAnnotation(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const activate = (id: AnnotationId) => setActiveAnnotation(id);
  const restorePinned = () => setActiveAnnotation(pinnedAnnotation);
  const togglePinned = (id: AnnotationId) => {
    const next = pinnedAnnotation === id ? null : id;
    setPinnedAnnotation(next);
    setActiveAnnotation(next);
  };

  const primaryActive = activeAnnotation === "lesion";
  const compareActive = activeAnnotation === "compare";

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-[680px]"
      data-testid="leaf-lens"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPinnedAnnotation(null);
          setActiveAnnotation(null);
        }
      }}
    >
      <div className="absolute -inset-8 -z-10 rounded-[34px] bg-mint/35 blur-3xl" aria-hidden />

      <div className="overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-surface-raised shadow-lg">
        <div ref={mediaRef} data-leaf-media className="relative bg-forest">
          <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/11]">
            <Image
              src="/plant-leaves/agromind-hero-tomato.png"
              alt={tr("Lá cà chua có các đốm nâu đang được hệ thống đánh dấu để kiểm tra.", "Tomato leaf with brown spots being marked by the system for inspection.")}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover object-center"
              onLoad={() => ScrollTrigger.refresh()}
            />

            <div
              data-leaf-scrim
              className="pointer-events-none absolute inset-0 bg-forest/25"
              aria-hidden
            />

            <div
              data-leaf-focus-image
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ clipPath: `circle(${hotspot.radius}% at ${hotspot.x}% ${hotspot.y}%)` }}
              aria-hidden
            >
              <Image
                src="/plant-leaves/agromind-hero-tomato.png"
                alt=""
                fill
                loading="eager"
                sizes="(min-width: 1024px) 52vw, 100vw"
                data-leaf-focus-detail
                className="object-cover object-center"
              />
            </div>

            <div
              data-leaf-scan
              className="pointer-events-none absolute inset-x-0 top-0 h-[14%] border-b border-mint/60 bg-gradient-to-b from-transparent via-mint/10 to-mint/5"
              aria-hidden
            />

            <LeafScanOverlay />

            <div
              data-leaf-active-border
              className="pointer-events-none absolute inset-2 z-20 rounded-[calc(var(--r-xl)-0.5rem)] border border-sun/65 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sun)_16%,transparent),0_0_32px_color-mix(in_srgb,var(--sun)_12%,transparent)]"
              aria-hidden
            />

            <span
              data-leaf-halo
              className="pointer-events-none absolute z-10 aspect-square w-[19%] min-w-[76px] max-w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun/65"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              aria-hidden
            />
            <span
              data-leaf-halo
              className="pointer-events-none absolute z-10 aspect-square w-[19%] min-w-[76px] max-w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun/35"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              aria-hidden
            />

            <div
              data-leaf-focus-ring
              className={cn(
                "pointer-events-none absolute z-10 aspect-square w-[19%] min-w-[76px] max-w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun shadow-[inset_0_0_0_8px_color-mix(in_srgb,var(--sun)_12%,transparent),0_12px_36px_color-mix(in_srgb,var(--forest)_28%,transparent)]",
                primaryActive && "border-2",
              )}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              aria-hidden
            >
              <span data-leaf-focus-inner className="absolute inset-[10%] rounded-full border border-dashed border-sun/80" />
              <span
                className={cn(
                  "absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sun bg-forest/65 transition duration-180",
                  primaryActive && "scale-125 bg-sun",
                )}
              />
            </div>

            <button
              type="button"
              className="absolute z-30 h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              aria-label={tr("Xem dấu hiệu đốm nâu trên lá cà chua.", "View the brown-spot sign on the tomato leaf.")}
              aria-controls="leaf-lesion-callout"
              aria-describedby="leaf-lesion-description"
              aria-pressed={pinnedAnnotation === "lesion"}
              onMouseEnter={() => activate("lesion")}
              onMouseLeave={restorePinned}
              onFocus={() => activate("lesion")}
              onBlur={restorePinned}
              onClick={() => togglePinned("lesion")}
            />

            <svg
              className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full min-[1100px]:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                data-leaf-connector
                d="M64 56 C58 48 49 36 37 29"
                pathLength="1"
                fill="none"
                stroke="var(--sun)"
                strokeOpacity={primaryActive ? 1 : 0.82}
                strokeWidth={primaryActive ? 1.8 : 1.2}
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                data-leaf-connector
                d="M64 56 C70 48 74 36 78 29"
                pathLength="1"
                fill="none"
                stroke="var(--mint)"
                strokeOpacity={compareActive ? 0.96 : 0.76}
                strokeWidth={compareActive ? 1.8 : 1.2}
                strokeLinecap="round"
                strokeDasharray="1"
                strokeDashoffset="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-4 text-on-forest sm:bottom-5 sm:left-5 sm:right-5">
              <div className="max-w-[240px] rounded-[var(--r-md)] bg-forest/76 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-on-forest-muted">{tr("Ảnh lá thực tế", "Real leaf photo")}</p>
                <p className="mt-1 text-xs font-semibold leading-5 sm:text-sm">{tr("AI đang quan sát dấu hiệu trên bề mặt lá.", "AI is observing signs on the leaf surface.")}</p>
              </div>
              <span
                data-leaf-scan-icon
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-on-forest/25 bg-forest/78 text-on-forest backdrop-blur-sm"
              >
                <ScanSearch size={20} aria-hidden />
              </span>
            </div>
          </div>

          <div className="relative z-20 grid gap-3 bg-forest p-4 md:grid-cols-2 min-[1100px]:pointer-events-none min-[1100px]:absolute min-[1100px]:inset-0 min-[1100px]:block min-[1100px]:bg-transparent min-[1100px]:p-0">
            <button
              id="leaf-lesion-callout"
              type="button"
              data-leaf-callout
              className={cn(
                "pointer-events-auto w-full rounded-[var(--r-md)] border bg-surface-raised p-3.5 text-left shadow-md transition-[border-color,box-shadow] duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun min-[1100px]:absolute min-[1100px]:left-[4%] min-[1100px]:top-[7%] min-[1100px]:w-[42%]",
                primaryActive ? "border-sun shadow-lg" : "border-line-strong hover:border-sun/70",
              )}
              aria-pressed={pinnedAnnotation === "lesion"}
              onMouseEnter={() => activate("lesion")}
              onMouseLeave={restorePinned}
              onFocus={() => activate("lesion")}
              onBlur={restorePinned}
              onClick={() => togglePinned("lesion")}
            >
              <span
                className={cn(
                  "flex items-start gap-3 transition-opacity duration-180",
                  activeAnnotation && !primaryActive && "opacity-55",
                )}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-sun-soft text-warning-ink">
                  <Leaf size={17} strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-leaf-strong">{tr(hotspot.title, hotspot.titleEn)}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-ink sm:text-sm">{tr(hotspot.description, hotspot.descriptionEn)}</span>
                </span>
              </span>
            </button>

            <button
              type="button"
              data-leaf-callout
              className={cn(
                "pointer-events-auto w-full rounded-[var(--r-md)] border bg-surface-raised p-3.5 text-left shadow-md transition-[border-color,box-shadow] duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf min-[1100px]:absolute min-[1100px]:right-[4%] min-[1100px]:top-[7%] min-[1100px]:w-[34%]",
                compareActive ? "border-leaf shadow-lg" : "border-line-strong hover:border-leaf/60",
              )}
              aria-pressed={pinnedAnnotation === "compare"}
              onMouseEnter={() => activate("compare")}
              onMouseLeave={restorePinned}
              onFocus={() => activate("compare")}
              onBlur={restorePinned}
              onClick={() => togglePinned("compare")}
            >
              <span
                className={cn(
                  "flex items-start gap-3 transition-opacity duration-180",
                  activeAnnotation && !compareActive && "opacity-55",
                )}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-surface-soft text-leaf-strong">
                  <Sparkles size={17} strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-leaf-strong">{tr("Hệ thống đang đối chiếu", "System is cross-checking")}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-ink">{tr("Màu sắc, hình dạng và vị trí tổn thương được so sánh.", "Color, shape, and lesion location are compared.")}</span>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden bg-surface-raised p-5 sm:p-6">
            <span
              data-leaf-result-flash
              className="pointer-events-none absolute -inset-y-8 left-0 w-[38%] -skew-x-12 bg-gradient-to-r from-transparent via-sun/18 to-transparent blur-md"
              aria-hidden
            />
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-surface-soft text-leaf-strong">
                <Leaf size={19} aria-hidden />
              </span>
              <div>
                <p data-leaf-result-label className="text-xs font-semibold text-leaf-strong">{tr("Dấu hiệu cần quan sát", "Sign to observe")}</p>
                <p data-leaf-result-value className="mt-1 font-display text-lg font-bold text-ink">{tr("Đốm nâu trên lá cà chua", "Brown spots on the tomato leaf")}</p>
              </div>
            </div>
          </div>
          <div data-leaf-quality className="flex items-center justify-between gap-4 bg-surface-soft p-5 sm:p-6">
            <div>
              <p className="text-xs font-medium text-ink-soft">{tr("Chất lượng ảnh", "Image quality")}</p>
              <p className="mt-1 font-semibold text-ink">{tr("Đủ rõ để kiểm tra", "Clear enough to inspect")}</p>
            </div>
            <span
              data-leaf-quality-dot
              role="status"
              className="h-3 w-3 rounded-full bg-leaf shadow-[0_0_0_6px_color-mix(in_srgb,var(--leaf)_14%,transparent)]"
              aria-label={tr("Ảnh đạt điều kiện", "Image meets requirements")}
            />
          </div>
        </div>
      </div>

      <p id="leaf-lesion-description" className="sr-only">
        {tr(
          "Vùng được đánh dấu là đốm nâu có rìa sẫm. Hệ thống đang đối chiếu màu sắc, hình dạng và vị trí tổn thương.",
          "The marked area is a brown spot with a dark edge. The system is cross-checking its color, shape, and lesion location.",
        )}
      </p>
    </div>
  );
}
