export interface ObfuscationResult {
  code: string;
}

export type ProfilerCallback = (log: ProfilerLog) => void;
export interface ProfilerLog {
  currentTransform: string;
  currentTransformNumber: number;
  nextTransform: string;
  totalTransforms: number;
}
