import { ShaderFill } from '@/lib/custom-effect-runtime/index';
import { manifest, render, setup } from '@/lib/custom-effects/moving-gradient';
import { useIsFocused } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

// The animated orange gradient behind the dashboard's summary card (Figma
// node 238:161). It is Figma's own "Moving gradient" shader, run with
// Figma's shader runtime (lib/custom-effect-runtime, copied as-is), using
// the settings from the design. Colors are the Orange/300, /100 and /400
// variables.
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
const renderAtDeviceSize: typeof render = (device, frame) => {
  const output = frame.output as (typeof frame.output & SizedTexture) | null;
  if (output?.physicalWidth !== undefined && output.physicalHeight !== undefined) {
    Object.defineProperty(output, 'width', { value: output.physicalWidth, configurable: true });
    Object.defineProperty(output, 'height', { value: output.physicalHeight, configurable: true });
  }
  return render(device, frame);
};

const SHADER = {
  setup,
  render: renderAtDeviceSize,
  manifest,
  params: {
    intensity: 5,
    gradient: {
      stops: [
        { position: 0, color: { r: 1, g: 0.6274510025978088, b: 0.3450980484485626, a: 1 } },
        { position: 0.5, color: { r: 1, g: 0.8823529481887817, b: 0.7960784435272217, a: 1 } },
        { position: 1, color: { r: 1, g: 0.46666666865348816, b: 0.05882352963089943, a: 1 } },
      ],
    },
    gradientBalance: 0,
    material: 0,
    morphSpeed: 3.240000009536743,
    detail: 4.980000019073486,
    twist: 0,
    zoom: 2,
    gradientMethod: 1,
    warp: 0.5999999642372131,
    rotationSpeed: 9,
  },
};

export function MovingGradientFill({ borderRadius }: { borderRadius: number }) {
  const focused = useIsFocused();
  // Decided after mount: the server-rendered page can't know about WebGPU.
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => {
    setSupported(Platform.OS === 'web' && typeof navigator !== 'undefined' && 'gpu' in navigator);
  }, []);

  if (!supported || !focused) return null;
  return <ShaderFill shader={SHADER} style={{ position: 'absolute', inset: 0, borderRadius }} />;
}
