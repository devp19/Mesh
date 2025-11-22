import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { ViewMode } from '../types';

export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    public composer: EffectComposer;
    public bloomPass: UnrealBloomPass;
    public shadowPlane: THREE.Mesh;
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(8, 5, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.shadowMap.enabled = false;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 100;

        this.setupLighting();
        this.setupShadowPlane();
        this.setupPostProcessing();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0x222222, 2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = false;
        this.scene.add(dirLight);

        const blueLight = new THREE.SpotLight(0x00aaff, 5);
        blueLight.position.set(-10, 5, -5);
        blueLight.lookAt(0, 0, 0);
        this.scene.add(blueLight);
    }

    private setupShadowPlane(): void {
        const planeGeo = new THREE.PlaneGeometry(50, 50);
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.shadowPlane = new THREE.Mesh(planeGeo, planeMat);
        this.shadowPlane.rotation.x = -Math.PI / 2;
        this.shadowPlane.position.y = -4;
        this.shadowPlane.receiveShadow = true;
        this.shadowPlane.visible = false;
        this.scene.add(this.shadowPlane);
    }

    private setupPostProcessing(): void {
        const renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.bloomPass.threshold = 0.1;
        this.bloomPass.strength = 0.5;
        this.bloomPass.radius = 0.5;
        this.bloomPass.enabled = true;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);
    }

    public setViewMode(mode: ViewMode): void {
        const isSolid = mode === 'solid';
        if (isSolid) {
            this.bloomPass.enabled = false;
            this.scene.background = new THREE.Color(0x1a1a1a);
            this.scene.fog.color.setHex(0x1a1a1a);
            this.shadowPlane.visible = true;
        } else {
            this.bloomPass.enabled = true;
            this.scene.background = new THREE.Color(0x0a0a0a);
            this.scene.fog.color.setHex(0x0a0a0a);
            this.shadowPlane.visible = false;
        }
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    public render(): void {
        this.controls.update();
        this.composer.render();
    }
}

