export interface DemoAnnotatedPart {
  partName: string;
  meshName: string | string[]; // Can match multiple mesh names
  annotationImage: string;
  description: string;
  category: string;
}

export interface DemoModel {
  id: string;
  name: string;
  description: string;
  modelUrl: string;
  previewImage?: string;
  annotatedParts: DemoAnnotatedPart[];
}

export interface DemoConfig {
  models: DemoModel[];
}

let cachedDemoModels: DemoModel[] | null = null;

export async function getDemoModels(): Promise<DemoModel[]> {
  if (cachedDemoModels) {
    return cachedDemoModels;
  }

  try {
    const res = await fetch('/demo-models/demo-config.json');
    if (!res.ok) {
      console.warn('Demo config not found, demo mode unavailable');
      return [];
    }
    const data: DemoConfig = await res.json();
    cachedDemoModels = data.models;
    return data.models;
  } catch (error) {
    console.error('Failed to load demo models:', error);
    return [];
  }
}

export function findAnnotationForPart(
  models: DemoModel[],
  modelId: string,
  meshName: string
): DemoAnnotatedPart | null {
  const model = models.find((m) => m.id === modelId);
  if (!model) return null;

  // Try to find exact match first
  const exactMatch = model.annotatedParts.find((part) => {
    if (typeof part.meshName === 'string') {
      return part.meshName === meshName || 
             meshName.toLowerCase().includes(part.meshName.toLowerCase()) ||
             part.meshName.toLowerCase().includes(meshName.toLowerCase());
    } else {
      return part.meshName.some(name => 
        name === meshName ||
        meshName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(meshName.toLowerCase())
      );
    }
  });

  return exactMatch || null;
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

