declare module "three" {
  export class MeshBasicMaterial {
    constructor(params?: { color?: number });
    onBeforeCompile: (shader: { fragmentShader: string }) => void;
  }
}
