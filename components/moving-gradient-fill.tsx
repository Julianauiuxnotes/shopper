import { ShaderFill } from '@/lib/custom-effect-runtime/index';
import { manifest, render, setup } from '@/lib/custom-effects/moving-gradient';
import { useIsFocused } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

// The animated orange gradient behind the dashboard's summary card (Figma
// node 238:161). It is Figma's own "Moving gradient" shader, run with
// Figma's shader runtime (lib/custom-effect-runtime, copied as-is), using
// the settings from the design.
//
// Web only, and only in browsers with WebGPU: anywhere else this renders
// nothing and the card's plain background color shows instead. It is also
// unmounted while the dashboard isn't the page in view, so the shader
// doesn't keep animating behind other pages.
//
// One adapter sits between the runtime and the effect: the runtime reports
// the canvas texture's size in CSS pixels, but this effect sizes its
// multisample and depth buffers from that figure and they must match the
// texture's real size in device pixels. On any screen with a pixel ratio
// other than 1 (every phone) the GPU otherwise rejects each frame and
// nothing is drawn. So the real size is put back just before the effect
// runs; neither Figma file is modified.
type SizedTexture = { physicalWidth?: number; physicalHeight?: number };
// The same adapter also fixes how the effect's transparency reaches the
// page. The "Iridescent" material writes ordinary (straight) alpha, while
// the runtime's canvas expects colors already multiplied by their alpha;
// left alone the browser adds the page behind on top at full strength and
// the card comes out washed out next to Figma's own rendering. So the
// effect's main pipeline is given a blend that does that multiplication as
// it writes. Nothing about what the shader computes changes.
const PREMULTIPLY: GPUBlendState = {
  color: { srcFactor: 'src-alpha', dstFactor: 'zero', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'zero', operation: 'add' },
};
const renderAtDeviceSize: typeof render = (device: GPUDevice, frame) => {
  const output = frame.output as (typeof frame.output & SizedTexture) | null;
  if (output?.physicalWidth !== undefined && output.physicalHeight !== undefined) {
    Object.defineProperty(output, 'width', { value: output.physicalWidth, configurable: true });
    Object.defineProperty(output, 'height', { value: output.physicalHeight, configurable: true });
  }
  // Only while the effect runs: it builds its pipelines inside render().
  const createRenderPipeline = device.createRenderPipeline;
  device.createRenderPipeline = (descriptor) => {
    const fragment = descriptor.fragment;
    const isMainPass = fragment?.entryPoint === 'fs_main';
    return createRenderPipeline.call(
      device,
      isMainPass && fragment
        ? {
            ...descriptor,
            fragment: {
              ...fragment,
              targets: Array.from(fragment.targets, (target) =>
                target ? { ...target, blend: PREMULTIPLY } : target
              ),
            },
          }
        : descriptor
    );
  };
  try {
    return render(device, frame);
  } finally {
    device.createRenderPipeline = createRenderPipeline;
  }
};

const SHADER = {
  setup,
  render: renderAtDeviceSize,
  manifest,
  params: {
    intensity: 1.090000033378601,
    gradient: {
      stops: [
        // Purple/300, Orange/200, Orange/400
        {
          position: 0.2163461595773697,
          color: { r: 0.6941176652908325, g: 0.6039215922355652, b: 0.8549019694328308, a: 1 },
        },
        {
          position: 0.629807710647583,
          color: { r: 1, g: 0.7607843279838562, b: 0.5803921818733215, a: 1 },
        },
        {
          position: 0.9567307829856873,
          color: { r: 1, g: 0.46666666865348816, b: 0.05882352963089943, a: 1 },
        },
      ],
    },
    gradientBalance: 0,
    // 4 = "Iridescent": a glassy surface that is partly see-through.
    material: 4,
    morphSpeed: 0.6200000047683716,
    detail: 2,
    twist: 0,
    zoom: 2,
    gradientMethod: 1,
    warp: 0,
    rotationSpeed: 0,
  },
};

// Safari doesn't know the "device-pixel-content-box" option the runtime
// passes to ResizeObserver.observe() and throws on it, which took the
// whole page down on iPhone. The runtime already has a fallback for
// browsers without that measurement, so where the option is unsupported
// the same call is retried with the ordinary content box.
let resizeObserverPatched = false;
function allowContentBoxFallback() {
  if (resizeObserverPatched || typeof ResizeObserver === 'undefined') return;
  resizeObserverPatched = true;
  const observe = ResizeObserver.prototype.observe;
  ResizeObserver.prototype.observe = function (target, options) {
    try {
      return observe.call(this, target, options);
    } catch (error) {
      if (options?.box !== 'device-pixel-content-box') throw error;
      return observe.call(this, target, { ...options, box: 'content-box' });
    }
  };
}

// The gradient is decoration: if anything in the shader fails, the card
// must simply keep its plain background rather than break the page.
class FillBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Dashboard gradient disabled', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function MovingGradientFill({ borderRadius }: { borderRadius: number }) {
  const focused = useIsFocused();
  // Decided after mount: the server-rendered page can't know about WebGPU.
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => {
    const hasWebGpu =
      Platform.OS === 'web' && typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (hasWebGpu) allowContentBoxFallback();
    setSupported(hasWebGpu);
  }, []);

  if (!supported || !focused) return null;
  return (
    <FillBoundary>
      {/* White behind the canvas, as on the Figma page: the iridescent
          material is partly transparent, and over the card's own orange
          it would come out darker than designed. */}
      <ShaderFill
        shader={SHADER}
        style={{ position: 'absolute', inset: 0, borderRadius, backgroundColor: '#ffffff' }}
      />
    </FillBoundary>
  );
}
