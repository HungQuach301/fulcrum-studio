/** Infrastructure contracts only. WP-002 supplies the serialized repository store. */
export interface ArtifactRef {
  path: string;
  sourceCommit: string;
}

export interface ArtifactWrite {
  path: string;
  content: string;
  schemaId: string;
  expectedSourceCommit: string;
  writeId: string;
}

export interface WriteReceipt {
  writeId: string;
  commit: string;
  blob: string;
}

export interface ArtifactStore {
  read(ref: ArtifactRef): Promise<string>;
  /** Caller validates content against schemaId before enqueueing the write. */
  write(request: ArtifactWrite): Promise<WriteReceipt>;
  appendLine(request: ArtifactWrite): Promise<WriteReceipt>;
}

export class UnimplementedArtifactStore implements ArtifactStore {
  async read(_ref: ArtifactRef): Promise<string> { throw new Error("NotImplemented"); }
  async write(_request: ArtifactWrite): Promise<WriteReceipt> { throw new Error("NotImplemented"); }
  async appendLine(_request: ArtifactWrite): Promise<WriteReceipt> { throw new Error("NotImplemented"); }
}
