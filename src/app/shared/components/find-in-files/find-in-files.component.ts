import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { EditorState } from '../../../core/state/editor.state';
import { getFileType } from '../../../core/models/tab.model';

interface FileMatchGroup {
  path: string;
  matches: { line: number; snippet: string }[];
}

@Component({
  selector: 'app-find-in-files',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fif-overlay" (click)="close()">
        <div class="fif-dialog" (click)="$event.stopPropagation()">
          <div class="fif-header">
            <span class="material-symbols-outlined fif-search-icon">search</span>
            <input
              #searchInput
              class="fif-input"
              placeholder="Buscar en todos los archivos..."
              [value]="query()"
              (input)="onQueryChange($any($event.target).value)"
              (keydown.escape)="close()" />
            <button class="fif-close" (click)="close()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="fif-results">
            @if (query().trim().length < 2) {
              <div class="fif-hint">Escribe al menos 2 caracteres</div>
            } @else if (results().length === 0) {
              <div class="fif-hint">Sin resultados para "{{ query() }}"</div>
            } @else {
              @for (group of results(); track group.path) {
                <div class="fif-file-group">
                  <div class="fif-file-header">
                    <span class="material-symbols-outlined" style="font-size: 14px;">description</span>
                    <span class="fif-file-path">{{ group.path }}</span>
                    <span class="fif-count">{{ group.matches.length }}</span>
                  </div>
                  @for (m of group.matches; track m.line) {
                    <div class="fif-match" (click)="goTo(group.path, m.line)">
                      <span class="fif-line-num">{{ m.line }}</span>
                      <span class="fif-snippet">{{ m.snippet }}</span>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .fif-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
      z-index: 2000;
      animation: fadeIn 0.1s ease-out;
    }

    .fif-dialog {
      width: 560px;
      max-width: 90vw;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .fif-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .fif-search-icon {
      color: var(--text-tertiary);
      font-size: 18px;
    }

    .fif-input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
    }

    .fif-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }

    .fif-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .fif-results {
      overflow-y: auto;
      padding: 8px 0;
    }

    .fif-hint {
      padding: 24px 16px;
      text-align: center;
      color: var(--text-tertiary);
      font-size: 13px;
    }

    .fif-file-group {
      margin-bottom: 4px;
    }

    .fif-file-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 16px;
      color: var(--text-secondary);
      font-size: 12px;
      font-family: var(--font-mono);
    }

    .fif-file-path {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fif-count {
      color: var(--text-tertiary);
      font-size: 11px;
    }

    .fif-match {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 3px 16px 3px 38px;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .fif-match:hover {
      background: var(--bg-surface-variant);
    }

    .fif-line-num {
      color: var(--text-tertiary);
      min-width: 24px;
      text-align: right;
      flex-shrink: 0;
    }

    .fif-snippet {
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class FindInFilesComponent implements AfterViewChecked {
  private editorState = inject(EditorState);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  protected isOpen = signal(false);
  protected query = signal('');
  private shouldFocus = false;

  protected results = computed<FileMatchGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];

    const groups: FileMatchGroup[] = [];
    for (const [path, content] of this.editorState.files().entries()) {
      const lines = content.split('\n');
      const matches: { line: number; snippet: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          matches.push({ line: i + 1, snippet: lines[i].trim().slice(0, 200) });
          if (matches.length >= 50) break;
        }
      }
      if (matches.length > 0) groups.push({ path, matches });
    }
    return groups.sort((a, b) => a.path.localeCompare(b.path));
  });

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.open();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocus && this.searchInput) {
      this.shouldFocus = false;
      this.searchInput.nativeElement.focus();
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.shouldFocus = true;
  }

  close(): void {
    this.isOpen.set(false);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
  }

  goTo(path: string, line: number): void {
    const files = this.editorState.files();
    if (!files.has(path)) return;
    const name = path.split('/').pop() ?? path;
    this.editorState.openFile(path, name, getFileType(name), files.get(path) ?? '');
    this.editorState.requestGoToLine(path, line);
    this.close();
  }
}
