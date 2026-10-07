import { Injectable, signal, computed } from '@angular/core';
import { CompileResult, CompileError } from '../models/index';
import { ColorSchemeSim } from '../utils/device-presets.util';
import { detectPageSize, isLandscape, rotatePageSize } from '../utils/page-size.util';

@Injectable({ providedIn: 'root' })
export class PreviewState {
  readonly compiledHtml = signal('');
  readonly isLoading = signal(false);
  readonly deviceWidth = signal(1440);
  readonly deviceHeight = signal(900);
  /** Simulated prefers-color-scheme inside the preview iframe (`auto` = real OS setting). */
  readonly colorScheme = signal<ColorSchemeSim>('auto');
  /** Entry pug file of the last compile; origin for the inspector's Pug line mapping. */
  readonly entryPath = signal<string | null>(null);
  readonly deviceName = signal('Desktop');
  readonly errors = signal<CompileError[]>([]);
  readonly compilationTime = signal(0);

  /** `fit` scales the frame to the available space; a number is a fixed percentage. */
  readonly zoomMode = signal<'fit' | number>('fit');
  /** `null`: follow the template's `@page` (horizontal A4 when it declares none). */
  readonly pdfOrientation = signal<'landscape' | 'portrait' | null>(null);
  readonly isPdf = computed(() => this.deviceName() === 'PDF');
  /** Print page of the template (`@page { size }`), A4 in the chosen orientation when it declares none. */
  readonly pageSize = computed(() => {
    const detected = detectPageSize(this.compiledHtml(), 'landscape');
    const wanted = this.pdfOrientation();
    if (!wanted || (wanted === 'landscape') === isLandscape(detected)) return detected;
    return rotatePageSize(detected);
  });

  readonly hasErrors = computed(() => this.errors().length > 0);

  updateCompiledResult(result: CompileResult): void {
    // On a failed compile keep showing the last good render instead of blanking the preview.
    if (result.html || result.errors.length === 0) this.compiledHtml.set(result.html);
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
