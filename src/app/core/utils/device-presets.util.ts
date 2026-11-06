export interface DevicePreset {
  /** Identificador estable (se guarda en las preferencias): no se traduce. */
  name: string;
  /** Texto que ve la persona usuaria. */
  label: string;
  width: number;
  height: number;
  kind: 'mobile' | 'tablet' | 'desktop';
}

/** Real CSS-pixel viewport sizes (portrait for handheld devices). */
export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'Mobile', label: 'Móvil', width: 390, height: 844, kind: 'mobile' }, // iPhone 14
  { name: 'iPhone SE', label: 'iPhone SE', width: 375, height: 667, kind: 'mobile' },
  { name: 'iPhone 14 Pro Max', label: 'iPhone 14 Pro Max', width: 430, height: 932, kind: 'mobile' },
  { name: 'Pixel 7', label: 'Pixel 7', width: 412, height: 915, kind: 'mobile' },
  { name: 'Galaxy S20', label: 'Galaxy S20', width: 360, height: 800, kind: 'mobile' },
  { name: 'Tablet', label: 'Tableta', width: 768, height: 1024, kind: 'tablet' }, // iPad mini
  { name: 'iPad Air', label: 'iPad Air', width: 820, height: 1180, kind: 'tablet' },
  { name: 'iPad Pro 12.9', label: 'iPad Pro 12,9', width: 1024, height: 1366, kind: 'tablet' },
  { name: 'Laptop', label: 'Portátil', width: 1280, height: 800, kind: 'desktop' },
  { name: 'Desktop', label: 'Escritorio', width: 1440, height: 900, kind: 'desktop' },
  { name: 'Full HD', label: 'Full HD', width: 1920, height: 1080, kind: 'desktop' },
];

export function findDevicePreset(name: string): DevicePreset | undefined {
  return DEVICE_PRESETS.find((d) => d.name === name);
}

export type ColorSchemeSim = 'auto' | 'light' | 'dark';
