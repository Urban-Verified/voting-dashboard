import { initCurves } from "@shutter-network/urban-verified-crypto";

let _initPromise: Promise<void> | null = null;

export function ensureCurvesReady(): Promise<void> {
  if (!_initPromise) _initPromise = initCurves();
  return _initPromise;
}

