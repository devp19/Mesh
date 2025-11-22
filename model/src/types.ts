import * as THREE from 'three';

export interface ComponentData {
    mesh: THREE.Mesh;
    originalLocalPos: THREE.Vector3;
    centroid: THREE.Vector3;
}

export interface ExplodedGroupData {
    originalCenter: THREE.Vector3;
    components: ComponentData[];
}

export interface MeshUserData {
    name: string;
    description: string;
    type: string;
    mats: {
        holo: THREE.Material;
        solid: THREE.Material;
    };
}

export type ViewMode = 'holo' | 'solid';

export interface SimpleNoise {
    noise(x: number, y: number, z: number): number;
    fbm(x: number, y: number, z: number, octaves: number): number;
}

