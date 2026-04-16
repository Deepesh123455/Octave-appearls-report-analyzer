import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface SellThroughGaugeProps {
  value: number;
}

const SellThroughGauge: React.FC<SellThroughGaugeProps> = ({ value }) => {
  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 6,
              color: [
                [0.4, '#ef4444'],
                [0.8, '#B07D3A'],
                [1, '#4A7C59']
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 10,
            offsetCenter: [0, '-60%'],
            itemStyle: { color: '#D4A85A' }
          },
          axisTick: { length: 8, lineStyle: { color: 'auto', width: 2 } },
          splitLine: { length: 12, lineStyle: { color: 'auto', width: 4 } },
          axisLabel: { color: '#78716C', fontSize: 11, distance: -40 },
          title: { text: 'Sell-Through Rate', offsetCenter: [0, '-20%'], fontSize: 14, color: '#1C1917' },
          detail: {
            fontSize: 24,
            offsetCenter: [0, '20%'],
            valueAnimation: true,
            formatter: '{value}%',
            color: '#D4A85A'
          },
          data: [{ value, name: 'Sell-Through Rate' }]
        }
      ]
    };
  }, [value]);

  return <ReactECharts option={option} style={{ height: '240px', width: '100%' }} />;
};

export default SellThroughGauge;
