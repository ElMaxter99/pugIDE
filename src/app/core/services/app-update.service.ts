import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { OrchestratorService } from './orchestrator.service';

/** Cada cuánto se busca una versión nueva mientras la pestaña está abierta. */
export const UPDATE_CHECK_INTERVAL_MS = 10 * 60_000;
/** Al entrar: si la versión nueva llega dentro de esta ventana y el usuario no ha tocado nada, se aplica sola. */
export const AUTO_APPLY_WINDOW_MS = 20_000;
/** Margen para que la edición pendiente (compilación con debounce) llegue a guardarse antes de recargar. */
const SAVE_GRACE_MS = 500;

/**
 * Mantiene la app en su última versión. El service worker sirve la versión que ya tiene guardada y descarga la nueva en
 * segundo plano, pero solo la usa en la recarga siguiente, y sin avisar: por eso había que borrar la caché.
 *
 * - Al entrar comprueba enseguida. Si la versión nueva llega en los primeros segundos y todavía no se ha editado nada, la
 *   aplica y recarga sola (`applying`: la app muestra «Actualizando…»).
 * - Después comprueba cada 10 minutos y al volver a la pestaña. Si hay versión nueva, `visible` pasa a true y la app
 *   muestra un aviso con «Actualizar ahora» / «Más tarde». Nunca recarga sola mientras se trabaja.
 * - Si el service worker queda en un estado irrecuperable, recarga.
 * Sin service worker (modo desarrollo, navegador sin soporte) no hace nada.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private sw = inject(SwUpdate);
  private injector = inject(Injector);

  /** Hay una versión nueva descargada, lista para activarse en la próxima recarga. */
  readonly ready = signal(false);
  /** El usuario eligió «Más tarde»: el aviso se oculta hasta la próxima comprobación. */
  readonly dismissed = signal(false);
  /** Se está activando la versión nueva y la página va a recargarse. */
  readonly applying = signal(false);
  readonly visible = computed(() => this.ready() && !this.dismissed() && !this.applying());

  private started = false;
  private bootAt = 0;
  private interacted = false;
  private checking = false;

  start(): void {
    if (this.started || !this.sw.isEnabled) return;
    this.started = true;
    this.bootAt = Date.now();

    // «Todavía no ha tocado nada»: el primer gesto del usuario cierra la ventana de actualización automática.
    const markInteracted = (): void => { this.interacted = true; };
    for (const type of ['pointerdown', 'keydown', 'paste', 'drop']) {
      window.addEventListener(type, markInteracted, { capture: true, once: true });
    }

    this.sw.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.onVersionReady();
    });
    this.sw.unrecoverable.subscribe(() => this.reload());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.check();
    });
    setInterval(() => void this.check(), UPDATE_CHECK_INTERVAL_MS);
    void this.check();
  }

  /** Busca una versión nueva. Una comprobación a la vez; un fallo (sin conexión, etc.) no es un error. */
  async check(): Promise<boolean> {
    if (!this.sw.isEnabled || this.checking || this.applying()) return false;
    this.checking = true;
    try {
      const found = await this.sw.checkForUpdate();
      if (this.ready()) this.dismissed.set(false); // sigue habiendo una versión pendiente: se vuelve a avisar
      return found;
    } catch {
      return false;
    } finally {
      this.checking = false;
    }
  }

  /** Activa la versión nueva y recarga, guardando antes la sesión. */
  async apply(): Promise<void> {
    if (this.applying()) return;
    this.applying.set(true);
    try {
      // En la portada no hay proyecto y `saveSession` no hace nada; en el IDE guarda lo que se esté editando.
      this.injector.get(OrchestratorService).saveSession();
      await new Promise((resolve) => setTimeout(resolve, SAVE_GRACE_MS));
      await this.sw.activateUpdate();
    } catch {
      // Si no se pudo activar, la recarga igualmente trae la versión nueva en cuanto el service worker la sirva.
    }
    this.reload();
  }

  dismiss(): void {
    this.dismissed.set(true);
  }

  private onVersionReady(): void {
    const withinBoot = Date.now() - this.bootAt < AUTO_APPLY_WINDOW_MS;
    if (withinBoot && !this.interacted) {
      void this.apply();
      return;
    }
    this.dismissed.set(false);
    this.ready.set(true);
  }

  private reload(): void {
    document.location.reload();
  }
}
