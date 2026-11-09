import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { LayoutService } from '../../../core/services/layout.service';
import { PreviewState } from '../../../core/state/preview.state';

/**
 * Anuncios para lector de pantalla de cambios que solo se ven: la disposición, el dispositivo de la vista previa y la
 * corrección de un error de compilación. Una región `aria-live` fuera de la vista; el primer valor no se anuncia.
 */
@Component({
  selector: 'app-announcer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="sr" role="status" aria-live="polite" aria-atomic="true" data-testid="announcer">{{ message() }}</div>`,
  styles: [`.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }`],
})
export class AnnouncerComponent {
  private readonly layout = inject(LayoutService);
  private readonly preview = inject(PreviewState);
  protected readonly message = signal('');

  constructor() {
    let prevLayout: string | null = null;
    let prevDevice: string | null = null;
    let hadErrors = false;
    effect(() => {
      const label = this.layout.def().label;
      untracked(() => { if (prevLayout !== null && prevLayout !== label) this.say(`Disposición: ${label}`); prevLayout = label; });
    });
    effect(() => {
      const device = this.preview.deviceName();
      untracked(() => { if (prevDevice !== null && prevDevice !== device) this.say(`Vista previa: ${device === 'PDF' ? 'modo PDF' : device}`); prevDevice = device; });
    });
    effect(() => {
      const has = this.preview.errors().length > 0;
      untracked(() => { if (hadErrors && !has) this.say('Error corregido: la vista previa se actualizó'); hadErrors = has; });
    });
  }

  /** Se alterna un carácter invisible para que el mismo texto dos veces seguidas se vuelva a anunciar. */
  private say(text: string): void {
    this.message.update((m) => (m === text ? text + ' ' : text));
  }
}
