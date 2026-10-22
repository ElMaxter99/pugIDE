import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/services/analytics.service';
import { ConsentBannerComponent } from './shared/components/consent-banner/consent-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConsentBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-consent-banner />
  `,
})
export class AppComponent {
  constructor() {
    inject(AnalyticsService).init();
  }
}
