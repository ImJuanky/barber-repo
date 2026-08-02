import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Chart from 'chart.js/auto';

import { StatsService, StatsResponse } from '../../../core/services/stats.service';

type RangeOption = '6m' | '12m' | 'year';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonToggleModule, MatProgressSpinnerModule],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.scss'
})
export class AdminStats implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly range = signal<RangeOption>('6m');
  readonly loading = signal(false);
  readonly stats = signal<StatsResponse | null>(null);
  private chart: Chart | null = null;

  readonly corteStats = computed(() => this.stats()?.byService?.['corte'] ?? { count: 0, revenue: 0 });
  readonly barbaStats = computed(() => this.stats()?.byService?.['corte_barba'] ?? { count: 0, revenue: 0 });

  constructor(private statsService: StatsService) {}

  ngAfterViewInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  setRange(range: RangeOption): void {
    this.range.set(range);
    this.loadStats();
  }

  private getDateRange(): { from: string; to: string } {
    const now = new Date();
    const to = this.toIso(now);
    let from: Date;
    if (this.range() === '6m') {
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (this.range() === '12m') {
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
      from = new Date(now.getFullYear(), 0, 1);
    }
    return { from: this.toIso(from), to };
  }

  private toIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  loadStats(): void {
    this.loading.set(true);
    const { from, to } = this.getDateRange();
    this.statsService.getStats(from, to, 'month').subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
        this.renderChart(data);
      },
      error: () => this.loading.set(false)
    });
  }

  private formatPeriod(period: string): string {
    // period viene como 'YYYY-MM'
    const [year, month] = period.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  }

  private renderChart(data: StatsResponse): void {
    if (!this.chartCanvas) return;

    const labels = data.series.map((s) => this.formatPeriod(s.period));
    const revenue = data.series.map((s) => s.revenue);
    const counts = data.series.map((s) => s.count);

    this.chart?.destroy();
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Ingresos (€)',
            data: revenue,
            backgroundColor: 'rgba(25, 118, 210, 0.75)',
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Cortes realizados',
            data: counts,
            borderColor: '#2e7d32',
            backgroundColor: '#2e7d32',
            tension: 0.35,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: '€' }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Cortes' }
          }
        }
      }
    });
  }
}
