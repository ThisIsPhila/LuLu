/** Offsets refer to the unchanged input, in UTF-16 code units, end exclusive. */
export interface DetectedEntity {
  start: number;
  end: number;
  label: string;
  confidence: number;
  detector: string;
}

export type ProcessingMode = 'journal_only' | 'local' | 'cloud_demo';
export interface PrivacyResult {
  sanitised: string;
  detectedEntities: DetectedEntity[];
  provider: 'local' | 'cloud_demo';
  modelVersion: string;
  /** Detection and distancing do not constitute outbound approval. */
  review: 'required';
  distancing: 'none' | 'existing_phrase_rules';
}

export interface PrivacyProcessor {
  readonly provider: 'local' | 'cloud_demo';
  initialise(): Promise<void>;
  process(input: string, options?: { distance?: boolean }): Promise<PrivacyResult>;
  dispose(): Promise<void>;
}

/** A runtime adapter owns sessions/tensors, never installation or transport. */
export interface LocalEntityDetector {
  readonly modelVersion: string;
  initialise(): Promise<void>;
  detect(input: string): Promise<DetectedEntity[]>;
  dispose(): Promise<void>;
}

export interface ModelArtifact {
  name: string;
  url: string;
  bytes: number;
  sha256: string;
}
export interface ModelManifest {
  id: string;
  version: string;
  license: string;
  artifacts: readonly ModelArtifact[];
}
export type ModelState =
  | { status: 'not_installed' | 'unsupported' }
  | { status: 'downloading'; receivedBytes: number; totalBytes: number }
  | { status: 'ready'; version: string }
  | { status: 'failed'; reason: 'installation_failed' };

/** Store publishes a complete verified package atomically. Native storage can
 * return paths; browser storage can return bytes. Originals never enter it. */
export interface ModelPackageStore {
  has(id: string, version: string): Promise<boolean>;
  commit(manifest: ModelManifest, files: ReadonlyMap<string, Uint8Array>): Promise<void>;
  remove(id: string, version: string): Promise<void>;
}
export interface ModelManager {
  state(): ModelState;
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
  remove(): Promise<void>;
}
