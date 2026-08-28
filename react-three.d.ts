/// <reference types="@react-three/fiber" />

import type { Object3D } from "three";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      primitive: { object: Object3D; [key: string]: any };
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      hemisphereLight: any;
      mesh: any;
      group: any;
      boxGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhongMaterial: any;
    }
  }
}
