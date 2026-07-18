import { Injectable, signal, computed } from '@angular/core';
import { CompileResult, CompileError } from '../models/index';

@Injectable({ providedIn: 'root' })
export class PreviewState {
  readonly compiledHtml = signal('');
  readonly compiledCss = signal('');
  readonly isLoading = signal(false);
  readonly deviceWidth = signal(1200);
  readonly deviceHeight = signal(800);
  readonly deviceName = signal('Desktop');
  readonly zoom = signal(100);
  readonly errors = signal<CompileError[]>([]);
  readonly compilationTime = signal(0);
  readonly lastUpdate = signal(0);
  readonly showGrid = signal(false);

  readonly hasErrors = computed(() => this.errors().length > 0);

  updateCompiledResult(result: CompileResult): void {
    this.compiledHtml.set(result.html);
    this.compiledCss.set(result.css);
    this.compilationTime.set(result.compilationTime);
    this.errors.set(result.errors);
    this.lastUpdate.set(Date.now());
    this.isLoading.set(false);
  }

  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  setDevice(name: string, width: number, height: number): void {
    this.deviceName.set(name);
    this.deviceWidth.set(width);
    this.deviceHeight.set(height);
  }

  setZoom(zoom: number): void {
    this.zoom.set(Math.max(25, Math.min(200, zoom)));
  }

  refresh(): void {
    this.lastUpdate.set(Date.now());
  }
}
