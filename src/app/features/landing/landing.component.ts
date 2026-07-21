import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_VERSION } from '../../core/models/version.token';
import { PreferencesState } from '../../core/services/preferences.state';

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-root" [class.light-mode]="!isDark">
      <div class="bg-glow top-left"></div>
      <div class="bg-glow bottom-right"></div>

      <header class="landing-topbar">
        <span class="logo">PugIDE</span>
        <button class="theme-btn" (click)="toggleTheme()" [attr.aria-label]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
          <span class="material-symbols-outlined">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
        </button>
      </header>

      <main class="landing-main">
        <section class="hero-section">
          <div class="version-badge">
            <span class="version-dot"></span>
            <span class="version-text">Version {{ version }}</span>
          </div>

          <h1 class="hero-title">
            Desarrollo visual para <span class="text-gradient">Pug/Jade</span>, sin fricciones.
          </h1>

          <p class="hero-desc">
            Detecta variables, genera mocks y previsualiza en tiempo real.
            La herramienta definitiva para desarrolladores frontend que buscan velocidad y precisi&oacute;n.
          </p>

          <div class="hero-actions">
            <button class="btn btn-primary" (click)="goToIde()">
              Empezar a crear
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
            <button class="btn btn-secondary" (click)="goToDemo()">
              Ver demo interactiva
            </button>
          </div>

          <div class="hero-visual">
            <div class="visual-glow"></div>
            <div class="visual-frame">
              <div class="visual-inner">
                <div class="mock-sidebar">
                  <div class="mock-dots">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                  </div>
                  <div class="mock-lines">
                    <div class="line w-full"></div>
                    <div class="line w-3/4"></div>
                    <div class="line w-5/6"></div>
                    <div class="line w-1/2"></div>
                  </div>
                </div>
                <div class="mock-main">
                  <div class="code-overlay">
                    <pre><span class="token-keyword">main</span>.container
  <span class="token-keyword">h1</span><span class="token-operator">=</span> title
  <span class="token-keyword">ul</span>.list
    each item in items
      <span class="token-keyword">li</span>.item<span class="token-operator">=</span> item.name</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="features-section">
          <h2 class="section-title">Potencia tu flujo de trabajo</h2>
          <p class="section-desc">Herramientas dise&ntilde;adas para la precisi&oacute;n del frontend.</p>

          <div class="features-grid">
            <div class="feature-card wide">
              <div class="feature-icon">
                <span class="material-symbols-outlined">edit_note</span>
              </div>
              <h3 class="feature-title">Smart Data Editor</h3>
              <p class="feature-desc">Adi&oacute;s a los JSON manuales. Generamos formularios autom&aacute;ticos basados en la detecci&oacute;n inteligente de variables en tu c&oacute;digo Pug.</p>
              <div class="feature-preview">
                <div class="preview-header">
                  <span class="preview-label">VARIABLES DETECTADAS</span>
                  <span class="material-symbols-outlined sync-icon">sync</span>
                </div>
                <div class="preview-row">
                  <span class="preview-key">title</span>
                  <span class="preview-value">"PugIDE Rocks"</span>
                </div>
                <div class="preview-row">
                  <span class="preview-key">count</span>
                  <span class="preview-value">42</span>
                </div>
              </div>
            </div>

            <div class="feature-card tall">
              <div class="feature-icon round">
                <span class="material-symbols-outlined">bolt</span>
              </div>
              <h3 class="feature-title">Vista Previa en Tiempo Real</h3>
              <p class="feature-desc">Mira el resultado al instante, sin esperas. Cada cambio en tu c&oacute;digo se refleja instant&aacute;neamente en el canvas de previsualizaci&oacute;n.</p>
            </div>

            <div class="feature-card full">
              <div class="feature-icon">
                <span class="material-symbols-outlined">account_tree</span>
              </div>
              <div class="feature-content">
                <div>
                  <h3 class="feature-title">JSON Tree &amp; Mocking</h3>
                  <p class="feature-desc">Visualiza estructuras complejas y genera datos de prueba con un solo clic. PugIDE entiende tus arrays y objetos anidados para poblar tu UI en segundos.</p>
                  <button class="mock-btn" (click)="goToDemo()">
                    Explorar sistema de mocks
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                <div class="mock-code-panel">
                  <pre>{{ '{' }}<br>  "users": [<br>    &#123; "id": 1, "name": "John Doe" &#125;,<br>    &#123; "id": 2, "name": "Jane Smith" &#125;<br>  ]<br>{{ '}' }}</pre>
                  <div class="mock-overlay-btn">
                    <button class="btn btn-tertiary" (click)="goToDemo()">
                      <span class="material-symbols-outlined">casino</span>
                      Generate Mock
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .landing-root {
      min-height: 100vh;
      background: var(--bg-surface);
      color: var(--text-primary);
      position: relative;
      overflow-x: hidden;
    }

    .landing-topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle, var(--border-color));
    }
    .logo {
      font-family: 'Geist', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--accent-color);
    }
    .theme-btn {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-lg);
      background: var(--bg-surface-container);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }
    .theme-btn:hover {
      background: var(--bg-surface-container-high);
    }

    .bg-glow {
      position: fixed;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    .bg-glow.top-left {
      top: -10%;
      left: -10%;
      width: 500px;
      height: 500px;
      background: var(--accent-color);
      opacity: 0.08;
      filter: blur(120px);
    }
    .bg-glow.bottom-right {
      bottom: -10%;
      right: -10%;
      width: 600px;
      height: 600px;
      background: var(--accent-container);
      opacity: 0.04;
      filter: blur(150px);
    }

    .landing-main {
      position: relative;
      z-index: 1;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 var(--margin-mobile, 16px);
    }

    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 96px 0 64px;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
      background: color-mix(in srgb, var(--accent-color) 5%, transparent);
      margin-bottom: 32px;
    }
    .version-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-color);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .version-text {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      font-weight: 500;
      color: var(--accent-color);
      text-transform: uppercase;
    }

    .hero-title {
      font-family: 'Geist', sans-serif;
      font-size: 48px;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.02em;
      max-width: 900px;
      margin-bottom: 24px;
    }
    @media (min-width: 768px) {
      .hero-title { font-size: 72px; }
    }

    .text-gradient {
      background: linear-gradient(135deg, var(--accent-color), var(--accent-container));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-desc {
      font-family: 'Geist', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 600px;
      margin-bottom: 40px;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 16px;
      margin-bottom: 80px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      border-radius: var(--radius-lg);
      font-family: 'Geist', sans-serif;
      font-size: 16px;
      font-weight: 700;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn:active {
      transform: scale(0.95);
    }
    .btn-primary {
      background: var(--accent-color);
      color: var(--text-on-primary);
    }
    .btn-primary:hover {
      box-shadow: 0 0 30px -5px color-mix(in srgb, var(--accent-container) 40%, transparent);
    }
    .btn-secondary {
      background: var(--bg-surface-container);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .btn-secondary:hover {
      background: var(--bg-surface-container-high);
    }
    .btn-tertiary {
      background: var(--tertiary-color);
      color: var(--text-on-primary);
      font-size: 14px;
      padding: 12px 20px;
    }

    .hero-visual {
      width: 100%;
      max-width: 1152px;
      position: relative;
    }
    .visual-glow {
      position: absolute;
      inset: 0;
      background: var(--accent-color);
      opacity: 0.12;
      filter: blur(100px);
      border-radius: 50%;
      transition: opacity 0.3s;
    }
    .hero-visual:hover .visual-glow {
      opacity: 0.2;
    }
    .visual-frame {
      position: relative;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      background: var(--bg-surface-container-lowest);
      padding: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .visual-inner {
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border-color);
      background: var(--bg-surface-dim);
      aspect-ratio: 16 / 9;
      display: flex;
    }

    .mock-sidebar {
      width: 200px;
      border-right: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
      padding: 16px 12px;
      display: none;
      flex-direction: column;
    }
    @media (min-width: 768px) {
      .mock-sidebar { display: flex; }
    }

    .mock-dots {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
      padding: 0 8px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot.red { background: rgba(239, 68, 68, 0.5); }
    .dot.yellow { background: rgba(234, 179, 8, 0.5); }
    .dot.green { background: rgba(34, 197, 94, 0.5); }

    .mock-lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .line {
      height: 16px;
      background: var(--bg-surface-container-highest);
      border-radius: 4px;
      opacity: 0.2;
    }
    .w-full { width: 100%; }
    .w-3\\/4 { width: 75%; }
    .w-5\\/6 { width: 83.333%; }
    .w-1\\/2 { width: 50%; }

    .mock-main {
      flex: 1;
      position: relative;
    }

    .code-overlay {
      position: absolute;
      top: 40px;
      left: 40px;
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
      background: color-mix(in srgb, var(--bg-surface-container) 80%, transparent);
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      display: none;
    }
    @media (min-width: 1024px) {
      .code-overlay { display: block; }
    }

    .code-overlay pre {
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 20px;
      color: var(--accent-color);
    }
    .token-keyword { color: var(--secondary-color); }
    .token-operator { color: var(--text-tertiary); }

    .features-section {
      padding: 96px 0;
    }

    .section-title {
      font-family: 'Geist', sans-serif;
      font-size: 32px;
      line-height: 40px;
      letter-spacing: -0.02em;
      font-weight: 600;
      text-align: center;
      margin-bottom: 16px;
    }

    .section-desc {
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 20px;
      margin-bottom: 64px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    @media (min-width: 768px) {
      .features-grid {
        grid-template-columns: repeat(12, 1fr);
        grid-template-rows: 300px 300px;
      }
      .feature-card.wide { grid-column: span 7; }
      .feature-card.tall { grid-column: span 5; }
      .feature-card.full { grid-column: span 12; }
    }

    .feature-card {
      background: var(--bg-surface-container);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 32px;
      display: flex;
      flex-direction: column;
      transition: border-color 0.3s;
      position: relative;
      overflow: hidden;
    }
    .feature-card:hover {
      border-color: color-mix(in srgb, var(--accent-color) 50%, transparent);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--accent-color) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent-color) 20%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    .feature-icon span { color: var(--accent-color); }
    .feature-icon.round {
      border-radius: 50%;
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
    }
    .feature-icon.round span {
      font-size: 40px;
    }

    .feature-title {
      font-family: 'Geist', sans-serif;
      font-size: 24px;
      line-height: 32px;
      letter-spacing: -0.01em;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .feature-desc {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 20px;
    }

    .feature-preview {
      margin-top: auto;
      position: relative;
      height: 160px;
      transform: translateY(16px);
      transition: transform 0.3s;
    }
    .feature-card:hover .feature-preview {
      transform: translateY(0);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .preview-label {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .sync-icon {
      font-size: 16px;
      color: var(--accent-color);
    }
    .preview-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .preview-key {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      width: 64px;
      color: var(--text-tertiary);
    }
    .preview-value {
      flex: 1;
      height: 32px;
      background: var(--bg-surface-container);
      border-radius: 4px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      font-size: 14px;
      border: 1px solid var(--border-color);
    }

    .feature-content {
      display: flex;
      flex-direction: column;
      gap: 48px;
      flex: 1;
    }
    @media (min-width: 768px) {
      .feature-content {
        flex-direction: row;
        align-items: center;
      }
    }

    .mock-code-panel {
      flex: 1;
      height: 256px;
      background: var(--bg-surface-container-low);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 24px;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 20px;
      position: relative;
      overflow: hidden;
      color: color-mix(in srgb, var(--tertiary-color) 80%, transparent);
    }

    .mock-overlay-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .mock-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--tertiary-color);
      font-weight: 700;
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
      font-size: inherit;
      margin-top: 24px;
    }
    .mock-btn:hover {
      text-decoration: underline;
    }

    .feature-card.tall {
      align-items: center;
      text-align: center;
    }
    .feature-card.tall:hover .feature-icon.round {
      transform: scale(1.1);
    }
    .feature-card.tall .feature-desc {
      max-width: 400px;
    }
  `],
})
export class LandingComponent {
  private router = inject(Router);
  private prefs = inject(PreferencesState);
  protected version = inject(APP_VERSION);

  constructor() {
    document.documentElement.classList.toggle('light-mode', this.prefs.theme() === 'light');
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

  goToDemo(): void {
    this.router.navigate(['/ide'], { queryParams: { demo: true } });
  }
}
