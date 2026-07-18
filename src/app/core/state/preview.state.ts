import { Injectable, signal, computed } from '@angular/core';
import { CompileResult, CompileError } from '../models/index';

@Injectable({ providedIn: 'root' })
export class PreviewState {
  readonly compiledHtml = signal('');
  readonly isLoading = signal(false);
  readonly deviceWidth = signal(1200);
  readonly deviceHeight = signal(800);
  readonly deviceName = signal('Desktop');
  readonly errors = signal<CompileError[]>([]);
  readonly compilationTime = signal(0);

  readonly hasErrors = computed(() => this.errors().length > 0);

  updateCompiledResult(result: CompileResult): void {
    this.compiledHtml.set(result.html);
    this.compilationTime.set(result.compilationTime);
    this.errors.set(result.errors);
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

}
