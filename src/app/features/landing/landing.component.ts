import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_VERSION } from '../../core/models/version.token';
import { PreferencesState } from '../../core/services/preferences.state';
import { PersistenceService } from '../../core/services/persistence.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private router = inject(Router);
  private prefs = inject(PreferencesState);
  private persistence = inject(PersistenceService);
  protected version = inject(APP_VERSION);

  protected hasSavedSession = false;

  constructor() {
    document.documentElement.classList.toggle('light-mode', this.prefs.theme() === 'light');
    const saved = this.persistence.loadProjectState();
    this.hasSavedSession = !!saved && Object.keys(saved.files).length > 0;
  }

  get isDark(): boolean {
    return this.prefs.theme() === 'dark';
  }

  toggleTheme(): void {
    const next = this.isDark ? 'light' : 'dark';
    this.prefs.update({ theme: next });
    document.documentElement.classList.toggle('light-mode', next === 'light');
  }

  goToIde(): void {
    this.router.navigate(['/ide']);
  }

  startNewSession(): void {
    this.persistence.clearProjectState();
    this.router.navigate(['/ide']);
  }

  goToDemo(): void {
    this.router.navigate(['/ide'], { queryParams: { demo: true } });
  }
}
