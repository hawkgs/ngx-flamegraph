import { Data, RawData, SiblingLayout } from '../utils';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ngx-flamegraph-graph',
  templateUrl: './flamegraph.component.html',
  styleUrls: ['./flamegraph.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlamegraphComponent implements OnInit, OnDestroy {
  private readonly _ngZone = inject(NgZone);
  private readonly _renderer = inject(Renderer2);
  private readonly _elementRef = inject(ElementRef);

  private _unlisteners: (() => void)[] = [];

  selectedData: Data[] = [];
  entries: Data[] = [];

  @Output() frameClick = new EventEmitter<RawData>();
  @Output() frameMouseEnter = new EventEmitter<RawData>();
  @Output() frameMouseLeave = new EventEmitter<RawData>();
  @Output() zoom = new EventEmitter<Data>();

  @Input() width: number;
  @Input() levelHeight: number;
  @Input() layout: SiblingLayout;
  @Input() depth: number;
  @Input() minimumBarSize: number | undefined;

  @Input() set data(data: Data[]) {
    this.entries = data;
  }

  ngOnInit() {
    this._initEventListeners();
  }

  ngOnDestroy() {
    for (const unlisten of this._unlisteners) {
      unlisten();
    }
  }

  getTop(entry: Data) {
    return entry.rowNumber * this.levelHeight + entry.rowNumber;
  }

  getLeft(entry: Data) {
    return entry.leftRatio * this.width;
  }

  getWidth(entry: Data) {
    return entry.widthRatio * this.width - 1 || 0;
  }

  private _initEventListeners() {
    const el = this._elementRef.nativeElement;
    let currentTarget: Element | null = null;
    let currentEntry: Data | null = null;

    // Zoneless
    this._ngZone.runOutsideAngular(() => {
      this._unlisteners.push(
        this._renderer.listen(el, 'mousemove', (e: MouseEvent) => {
          if (currentTarget !== e.target) {
            currentTarget = e.target as Element | null;
            currentEntry = this._getBarElementEntry(currentTarget);

            if (currentEntry) {
              this.frameMouseEnter.emit(currentEntry.original);
            }
          }
        }),
        this._renderer.listen(el, 'mouseleave', () => {
          if (currentEntry) {
            this.frameMouseLeave.emit(currentEntry.original);
            currentTarget = null;
            currentEntry = null;
          }
        })
      );
    });

    // Inside Zone
    this._unlisteners.push(
      this._renderer.listen(el, 'click', (e: MouseEvent) => {
        const entry = this._getBarElementEntry(e.target as Element | null);
        if (entry) {
          this.frameClick.emit(entry.original);
        }
      }),
      this._renderer.listen(el, 'dblclick', (e: MouseEvent) => {
        const entry = this._getBarElementEntry(e.target as Element | null);
        if (entry) {
          this.zoom.emit(entry);
        }
      })
    );
  }

  private _getBarElementEntry(element: Element | null): Data | null {
    if (!element) {
      return null;
    }
    const dataIdx = element.getAttribute('data-idx');

    if (!dataIdx) {
      return null;
    }

    const idx = parseInt(dataIdx, 10);
    return this.entries[idx] ?? null;
  }
}
