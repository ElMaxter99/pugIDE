import { Injectable, inject, signal } from '@angular/core';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { AnalyticsConsent, PersistenceService } from './persistence.service';

/**
 * Analítica anónima de visitas (Vercel Web Analytics: sin cookies de seguimiento y sin ningún dato del
 * proyecto del usuario). Es opcional: el script solo se carga si el usuario lo acepta.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private persistence = inject(PersistenceService);
  private loaded = false;

  /** Decisión del usuario; null mientras no haya contestado al aviso. */
  readonly consent = signal<AnalyticsConsent | null>(this.persistence.loadAnalyticsConsent());

  /** Carga la analítica si ya hay consentimiento (al arrancar la app). */
  init(): void {
    if (this.consent() === 'granted') this.load();
  }

  accept(): void {
    this.set('granted');
    this.load();
  }

  reject(): void {
    this.set('denied');
  }

  /** Cambia la decisión (p. ej. desde la paleta). Retirar el permiso surte efecto al recargar la página. */
  toggle(): void {
    if (this.consent() === 'granted') this.reject();
    else this.accept();
  }

  private set(value: AnalyticsConsent): void {
    this.consent.set(value);
    this.persistence.saveAnalyticsConsent(value);
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      injectVercelAnalytics();
    } catch { /* la analítica nunca debe romper la app */ }
  }
}
