import { manifest as discManifest } from "./disc/manifest.js";
import { DiscTest } from "./disc/render.js";

export const TestRegistry = {
  disc: { manifest: discManifest, runner: DiscTest },
};

export function getTest(testId){
  const t = TestRegistry[testId];
  if(!t) throw new Error(`Test tidak ditemukan: ${testId}`);
  return t;
}