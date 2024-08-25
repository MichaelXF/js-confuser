export interface ObfuscationResult {
  code: string;
}

export interface ProfileData {
  obfuscationTime: number;
  compileTime: number;
  parseTime: number;
  totalPossibleTransforms: number;
  totalTransforms: number;
  transformTimeMap: {
    [key: string]: number;
  };
}

export type ProfilerCallback = (log: ProfilerLog) => void;
export interface ProfilerLog {
  currentTransform: string;
  currentTransformNumber: number;
  nextTransform: string;
  totalTransforms: number;
}
