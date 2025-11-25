    export interface DemoAnnotation {
    name: string;
    description: string;
    category: string;
    annotatedImage: string; // Path to image in public folder
    }

    export interface DemoModel {
    id: string;
    name: string;
    path: string; // Path to GLB file in public folder
    annotation: DemoAnnotation; // Single default annotation for the entire model
    }

    export const DEMO_MODELS: DemoModel[] = [
    {
        id: "demo-1",
        name: "Drone",
        path: "/models/drone.glb",
        annotation: {
        name: "Drone System",
        description: "A high-performance aerial drone featuring quad-rotor propulsion and advanced stabilization. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Aerial Vehicle",
        annotatedImage: "/annotations/drone-annotate.jpeg"
        }
    },
    {
        id: "demo-2",
        name: "Audi R8",
        path: "/models/audi_r8.glb",
        annotation: {
        name: "Audi R8 System",
        description: "A high-performance sports car featuring a mid-mounted engine and quattro all-wheel drive. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Vehicle",
        annotatedImage: "/annotations/audi-annotate.jpeg"
        }
    },
    {
        id: "demo-3",
        name: "Batman",
        path: "/models/batman.glb",
        annotation: {
        name: "Batman",
        description: "A flowing piece of fabric attached to the shoulders and back, often part of a superhero's suit. For Batman, it serves as a tool for gliding and defensive purposes. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Superhero",
        annotatedImage: "/annotations/batman-annotate.jpeg"
        }
    },
    {
        id: "demo-4",
        name: "Human Brain",
        path: "/models/human-brain.glb",
        annotation: {
        name: "Brain",
        description: "A flowing piece of fabric attached to the shoulders and back, often part of a superhero's suit. For Batman, it serves as a tool for gliding and defensive purposes. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Superhero",
        annotatedImage: "/annotations/brain-annotate.jpeg"
        }
    },
    {
        id: "demo-5",
        name: "F16 Jet",
        path: "/models/human-brain.glb",
        annotation: {
        name: "F16 Jet System",
        description: "A high-performance fighter jet aircraft designed for air superiority and ground attack missions. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Aircraft",
        annotatedImage: "/annotations/f16-annotate.jpeg"
        }
    },
    {
        id: "demo-6",
        name: "F1 Car",
        path: "/models/f1_car.glb",
        annotation: {
        name: "F1 Car System",
        description: "This part represents the car's suspension system, consisting of wishbones and connecting rods. These components link the wheels to the chassis, controlling wheel movement, managing forces, and ensuring the tires maintain contact with the track surface. Note this is a demo annotation and actual diagram will depend on the object and mesh selected.",
        category: "Vehicle",
        annotatedImage: "/annotations/f1-annotate.jpeg"
        }
    }
    ];

    export const getDemoAnnotation = (modelId: string): DemoAnnotation | null => {
    const model = DEMO_MODELS.find(m => m.id === modelId);
    return model?.annotation || null;
    };
