import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

import type { StoreBreakdown } from '../types';

interface SalesBarChartProps {
  data: StoreBreakdown[];
}

const SalesBarChart: React.FC<SalesBarChartProps> = ({ data }) => {
  const option = useMemo(() => {
    const safeData = Array.isArray(data) ? data.filter(d => d.locationName !== 'NETWORK_WIDE') : [];
    // Sort by sales but keep linked data
    const sortedData = [...safeData].sort((a, b) => b.netSlsQty - a.netSlsQty).slice(0, 8);

    const locations = sortedData.map(d => d.locationName);
    const salesData = sortedData.map(d => d.netSlsQty);
    const gitData = sortedData.map(d => d.gitQty);
    const saleThruData = sortedData.map(d => d.saleThruPct);

    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      if (typeof v === 'object' && v && 'value' in v) {
        const vv = (v as { value?: unknown }).value;
        return toNumber(vv);
      }
      return 0;
    };

    return {
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: '0%',
        right: '5%',
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#78716C', fontSize: 11, fontWeight: 500 },
        data: ['Net Sales', 'Git (In-Transit)', 'CBS Sell-Thru %']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(212, 168, 90, 0.4)',
        borderWidth: 1,
        padding: [12, 16],
        shadowBlur: 15,
        shadowColor: 'rgba(0,0,0,0.1)',
        textStyle: { color: '#1C1917', fontSize: 13 },
        formatter: (params: unknown) => {
          const paramArr = Array.isArray(params) ? params : [];
          const first = paramArr[0] as { axisValue?: unknown; axisValueLabel?: unknown } | undefined;
          const storeName =
            (typeof first?.axisValue === 'string' ? first.axisValue : null) ??
            (typeof first?.axisValueLabel === 'string' ? first.axisValueLabel : null) ??
            '';

          let html = `<div style="margin-bottom: 8px; font-weight: 800; color: #B07D3A; border-bottom: 1px solid #EEE; padding-bottom: 4px;">${storeName}</div>`;

          paramArr.forEach((p: unknown) => {
            const pp = p as {
              seriesName?: unknown;
              value?: unknown;
              data?: unknown;
              color?: unknown;
            };

            const seriesName = typeof pp.seriesName === 'string' ? pp.seriesName : '';
            const raw = pp.value ?? pp.data;
            const num = toNumber(raw);

            const color =
              (pp.color as { colorStops?: { color: string }[] } | undefined)?.colorStops?.[0]?.color ??
              (typeof pp.color === 'string' ? pp.color : '#B07D3A');

            const formattedValue =
              seriesName === 'CBS Sell-Thru %' ? `${num.toFixed(1)}%` : num.toLocaleString();

            html += `
              <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 3px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                  <span style="opacity: 0.7;">${seriesName}</span>
                </span>
                <span style="font-weight: 700;">${formattedValue}</span>
              </div>
            `;
          });

          return html;
        }
      },
      grid: {
        top: '15%',
        left: '3%',
        right: '4%',
        bottom: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: locations,
        axisLabel: {
          color: '#78716C',
          fontSize: 10,
          fontWeight: 500,
          rotate: 25,
          formatter: (val: string) => val.length > 12 ? val.substring(0, 10) + '..' : val
        },
        axisLine: { lineStyle: { color: 'rgba(212, 168, 90, 0.15)' } },
        axisTick: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Units',
          axisLabel: { color: '#78716C', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(212, 168, 90, 0.08)', type: 'dashed' } },
          axisLine: { show: false }
        },
        {
          type: 'value',
          name: 'Sell-Thru %',
          position: 'right',
          min: 0,
          max: 100,
          axisLabel: { color: '#78716C', fontSize: 10 },
          splitLine: { show: false },
          axisLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Net Sales',
          type: 'bar',
          data: salesData,
          yAxisIndex: 0,
          barGap: '20%',
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#D4A85A' },
                { offset: 1, color: '#B07D3A' }
              ]
            }
          },
          label: {
            show: true,
            position: 'top',
            color: '#1C1917',
            fontSize: 10,
            fontWeight: 700,
            formatter: (v: unknown) => {
              const num = toNumber(v);
              return num > 0 ? num.toLocaleString() : '';
            }
          }
        },
        {
          name: 'Git (In-Transit)',
          type: 'bar',
          data: gitData,
          yAxisIndex: 0,
          barGap: '20%',
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#4A7C59' },
                { offset: 1, color: '#2E5A41' }
              ]
            }
          },
          label: {
            show: true,
            position: 'top',
            color: '#1C1917',
            fontSize: 10,
            fontWeight: 700,
            formatter: (v: unknown) => {
              const num = toNumber(v);
              return num > 0 ? num.toLocaleString() : '';
            }
          }
        },
        {
          name: 'CBS Sell-Thru %',
          type: 'line',
          yAxisIndex: 1,
          data: saleThruData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: {
            width: 3,
            color: '#B07D3A'
          },
          itemStyle: { color: '#B07D3A' },
          tooltip: {
            valueFormatter: (v: number) => `${v.toFixed(1)}%`
          },
          label: { show: false }
        }
      ]
    };
  }, [data]);

  const isEmpty = !Array.isArray(data) || data.length === 0;
  if (isEmpty) {
    return (
      <div
        style={{
          height: 300,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#78716C',
          fontSize: 13,
          padding: 16,
          textAlign: 'center',
          border: '1px solid rgba(212, 168, 90, 0.18)',
          borderRadius: 12,
        }}
      >
        No store sales data yet. Upload a report to see analytics.
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height: '300px', width: '100%' }} />;
};

export default SalesBarChart;
