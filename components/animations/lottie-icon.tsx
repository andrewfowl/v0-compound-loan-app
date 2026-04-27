"use client"

import dynamic from "next/dynamic"
import { ComponentProps, useMemo } from "react"

const LottieComponent = dynamic(() => import("lottie-react"), { ssr: false })

export interface LottieIconProps extends Omit<ComponentProps<typeof LottieComponent>, "animationData"> {
  type: "checkmark" | "error" | "warning" | "info" | "loading" | "success" | "liquidation" | "safe" | "monitor" | "at-risk"
  size?: "sm" | "md" | "lg" | "xl"
  loop?: boolean
  autoplay?: boolean
  speed?: number
}

/**
 * Lottie animation presets for common UI states and icons.
 * Each animation is a minimal JSON spec for demonstration.
 * In production, replace with real Lottie files from design tools.
 */
const LOTTIE_ANIMATIONS: Record<string, object> = {
  // Success state: animated checkmark
  checkmark: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 30,
    w: 100,
    h: 100,
    nm: "Checkmark",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Checkmark",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[20, 50], [40, 70], [80, 20]],
                    o: [[], [], []],
                    i: [[], [], []],
                  },
                },
                nm: "Path",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 6 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Shape",
            np: 2,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 30,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Error state: animated X
  error: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 30,
    w: 100,
    h: 100,
    nm: "Error",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "X Mark",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: false,
                    v: [[20, 20], [80, 80]],
                    o: [[], []],
                    i: [[], []],
                  },
                },
                nm: "Path 1",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ind: 1,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: false,
                    v: [[80, 20], [20, 80]],
                    o: [[], []],
                    i: [[], []],
                  },
                },
                nm: "Path 2",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.9, 0.2, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 6 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Shape",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 30,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Loading spinner
  loading: {
    v: "5.7.0",
    fr: 60,
    ip: 0,
    op: 120,
    w: 100,
    h: 100,
    nm: "Loading",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Spinner",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [0] }, { t: 120, s: [360] }] },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[0, -35], [35, 0], [0, 35], [-35, 0]],
                    o: [[19, 0], [0, 19], [-19, 0], [0, -19]],
                    i: [[-19, 0], [0, -19], [19, 0], [0, 19]],
                  },
                },
                nm: "Circle",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.5, 1, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 4 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
              {
                ty: "tm",
                s: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [0] }, { t: 120, s: [100] }] },
                e: { a: 0, k: 75 },
                o: { a: 0, k: 0 },
                m: 1,
                nm: "Trim Paths",
                mn: "ADBE Vector Filter - Trim",
                hd: false,
              },
            ],
            nm: "Group",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 120,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Safe/Low risk: green checkmark
  safe: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Safe",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Shield",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 10], [80, 25], [80, 50], [50, 80], [20, 50], [20, 25]],
                    o: [[], [], [], [], [], []],
                    i: [[], [], [], [], [], []],
                  },
                },
                nm: "Shield Path",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.2, 0.8, 0.2, 0.1] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Shield",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },

  // At risk: warning triangle pulse
  "at-risk": {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "At Risk",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Warning",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [100] }, { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 30, s: [60] }, { t: 60, s: [100] }] },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 10], [85, 75], [15, 75]],
                    o: [[], [], []],
                    i: [[], [], []],
                  },
                },
                nm: "Triangle",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.95, 0.7, 0.2, 0.15] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.95, 0.7, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Warning",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Critical: red alert pulse
  liquidation: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Critical",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Alert",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [100] }, { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 15, s: [50] }, { t: 30, s: [100] }] },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[20, 20], [80, 20], [80, 80], [20, 80]],
                    o: [[], [], [], []],
                    i: [[], [], [], []],
                  },
                },
                nm: "Square",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.9, 0.2, 0.2, 0.15] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.9, 0.2, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2.5 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Alert",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Monitor: info circle
  monitor: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Monitor",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Info",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 15], [85, 15], [85, 85], [15, 85], [15, 15]],
                    o: [[], [], [], [], []],
                    i: [[], [], [], [], []],
                  },
                },
                nm: "Circle",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.2, 0.5, 1, 0.1] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.5, 1, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Circle",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Success state with full animation
  success: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 90,
    w: 100,
    h: 100,
    nm: "Success",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Circle",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [80] }, { t: 30, s: [100] }] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 10], [90, 50], [50, 90], [10, 50]],
                    o: [[22, 0], [0, 22], [-22, 0], [0, -22]],
                    i: [[-22, 0], [0, -22], [22, 0], [0, 22]],
                  },
                },
                nm: "Path",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.2, 0.8, 0.2, 0.2] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Circle",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 30,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Warning/info pulse
  warning: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Warning",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Exclamation",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [80] }, { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 30, s: [100] }, { t: 60, s: [80] }] },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 15], [85, 80], [15, 80]],
                    o: [[], [], []],
                    i: [[], [], []],
                  },
                },
                nm: "Triangle",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.95, 0.7, 0.2, 0.15] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.95, 0.7, 0.2, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Warning Triangle",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },

  // Info state: pulsing info circle
  info: {
    v: "5.7.0",
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: "Info",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "InfoCircle",
        sr: 1,
        ks: {
          o: { a: 1, k: [{ i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 0, s: [100] }, { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 30, s: [70] }, { t: 60, s: [100] }] },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [50, 50, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              {
                ind: 0,
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: true,
                    v: [[50, 15], [85, 50], [50, 85], [15, 50]],
                    o: [[19.33, 0], [0, 19.33], [-19.33, 0], [0, -19.33]],
                    i: [[-19.33, 0], [0, -19.33], [19.33, 0], [0, 19.33]],
                  },
                },
                nm: "Circle",
                mn: "ADBE Vector Shape - Group",
                hd: false,
              },
              {
                ty: "fl",
                c: { a: 0, k: [0.2, 0.5, 1, 0.1] },
                o: { a: 0, k: 100 },
                nm: "Fill",
                mn: "ADBE Vector Graphic - Fill",
                hd: false,
              },
              {
                ty: "st",
                c: { a: 0, k: [0.2, 0.5, 1, 1] },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 2 },
                lc: 2,
                lj: 2,
                ml: 4,
                nm: "Stroke",
                mn: "ADBE Vector Graphic - Stroke",
                hd: false,
              },
            ],
            nm: "Circle",
            np: 3,
            cix: 2,
            bm: 0,
            ix: 1,
            mn: "ADBE Vector Group",
            hd: false,
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
        bm: 0,
      },
    ],
  },
}

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
}

export function LottieIcon({
  type,
  size = "md",
  loop = true,
  autoplay = true,
  speed = 1,
  className,
  ...props
}: LottieIconProps) {
  const animationData = useMemo(() => LOTTIE_ANIMATIONS[type], [type])
  const sizePixels = SIZE_MAP[size]

  if (!animationData) {
    return <div className={`w-${sizePixels} h-${sizePixels} ${className}`} />
  }

  return (
    <LottieComponent
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      speed={speed}
      style={{ width: sizePixels, height: sizePixels }}
      className={className}
      {...props}
    />
  )
}
