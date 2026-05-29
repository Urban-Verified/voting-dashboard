import { bytesToHex, hexToBytes } from "viem";

export { bytesToHex, hexToBytes };

export function u32be(n: number): Uint8Array {
  const b = new Uint8Array(4);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, n >>> 0, false);
  return b;
}

export function u16be(n: number): Uint8Array {
  const b = new Uint8Array(2);
  const dv = new DataView(b.buffer);
  dv.setUint16(0, n & 0xffff, false);
  return b;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

