import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

interface DrilldownChartProps {
  data: any[]
  reportType?: string
}

const DrilldownChart: React.FC<DrilldownChartProps> = ({ data, reportType }) => {
  const rootTitle = reportType === 'consolidated' ? 'All Articles' : 'All Locations'
  const [history, setHistory] = useState<any[][]>([data])
  const [titles, setTitles] = useState<string[]>([rootTitle])
  const [sortAsc, setSortAsc] = useState(false) // default: high to low

  const currentLevelData = history[history.length - 1]

  const onChartClick = (params: any) => {
    let clickedName: string | null = null

    if (params.componentType === 'series') {
      // Clicked on a bar
      clickedName = params.name
    } else if (params.componentType === 'xAxis') {
      // Clicked on an x-axis label
      clickedName = params.value
    }

    if (!clickedName) return

    const seriesData = option.series[0].data as any[]
    const clicked = seriesData.find(d => d.name === clickedName)?.recordBody
    if (clicked?.children?.length > 0) {
      setHistory([...history, clicked.children])
      setTitles([...titles, clickedName])
    }
  }

  const goBack = () => {
    if (history.length > 1) {
      setHistory(history.slice(0, -1))
      setTitles(titles.slice(0, -1))
    }
  }

  const option = useMemo(() => {
    const sorted = [...(currentLevelData || [])]
      .filter(item => item.name && !item.name.toLowerCase().includes('total'))
      .sort((a, b) => sortAsc
        ? (a.value || 0) - (b.value || 0)   // low → high
        : (b.value || 0) - (a.value || 0)   // high → low (default)
      )

    // Always group top 12 + Others
    let vizData: any[]
    if (sorted.length > 12) {
      const top12 = sorted.slice(0, 12)
      const rest = sorted.slice(12)
      const restValue = rest.reduce((s, i) => s + (i.value || 0), 0)
      // Only average positive sell-through values — negative values skew the group average
      const positivePcts = rest.filter(i => (i.saleThruPercent || 0) > 0)
      const restAvg = positivePcts.length > 0
        ? positivePcts.reduce((s, i) => s + i.saleThruPercent, 0) / positivePcts.length
        : 0
      vizData = [
        ...top12,
        { name: `Others (${rest.length})`, value: restValue, saleThruPercent: restAvg, isOthers: true, children: rest }
      ]
    } else {
      vizData = sorted
    }

    // Scale Y-axis based on top 12 only (ignore Others which inflates scale)
    const top12Values = vizData.filter(i => !i.isOthers).map(i => i.value || 0)
    const yMax = top12Values.length > 0
      ? Math.ceil((Math.max(...top12Values) * 1.25) / 1000) * 1000
      : undefined

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(28, 25, 23, 0.95)',
        borderColor: 'rgba(176, 125, 58, 0.4)',
        textStyle: { color: '#F5F0E8' },
        formatter: (params: any) => {
          const item = params[0]
          const rec = item.data?.recordBody || {}
          const pct = (rec.saleThruPercent || 0).toFixed(1)
          const pctColor = rec.saleThruPercent > 80 ? '#22c55e' : rec.saleThruPercent > 40 ? '#eab308' : '#ef4444'
          const row = (label: string, val: string | number) =>
            `<div style="display:flex;justify-content:space-between;gap:28px;margin-top:4px">
               <span style="color:#B07D3A">${label}</span>
               <strong>${val}</strong>
             </div>`
          return `
            <div style="padding:8px 14px;font-family:Inter,sans-serif;min-width:180px">
              <div style="font-weight:700;color:#D4A85A;margin-bottom:6px;font-size:13px">${item.name}</div>
              ${row('Net Sales', (item.value || 0).toLocaleString())}
              ${row('GIT Qty',   (rec.gitQty  || 0).toLocaleString())}
              ${row('CBS Qty',   (rec.cbsQty  || 0).toLocaleString())}
              ${row('Sell Thru', `<strong style="color:${pctColor}">${pct}%</strong>`)}
            </div>`
        }
      },
      grid: { top: '8%', left: '5%', right: '3%', bottom: '22%', containLabel: true },
      xAxis: {
        type: 'category',
        data: vizData.map(i => i.name),
        axisLabel: {
          color: '#78716C',
          fontSize: 10,
          rotate: 35,
          interval: 0,
          formatter: (val: string) => val.length > 15 ? val.substring(0, 13) + '…' : val
        },
        axisLine: { lineStyle: { color: 'rgba(196,186,176,0.4)' } },
        axisTick: { show: false },
        triggerEvent: true  // enables clicking on axis labels to drill down
      },
      yAxis: {
        type: 'value',
        max: yMax,                  // Smart scale: based on top bars, not Others
        name: 'Net Sales Qty',
        nameTextStyle: { color: '#78716C', fontSize: 11 },
        axisLabel: { color: '#78716C', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(196,186,176,0.25)' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        barWidth: '55%',
        data: vizData.map(item => ({
          name: item.name,
          value: item.value || 0,
          recordBody: item,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: item.isOthers
              ? {
                  type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
                  colorStops: [{ offset: 0, color: '#78716C' }, { offset: 1, color: '#A8A29E' }]
                }
              : item.saleThruPercent > 80
                ? {
                    type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
                    colorStops: [{ offset: 0, color: '#2D6A4F' }, { offset: 1, color: '#6BAE82' }]
                  }
                : item.saleThruPercent > 40
                  ? {
                      type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
                      colorStops: [{ offset: 0, color: '#92400E' }, { offset: 1, color: '#D4A85A' }]
                    }
                  : {
                      type: 'linear', x: 0, y: 1, x2: 0, y2: 0,
                      colorStops: [{ offset: 0, color: '#9B1C1C' }, { offset: 1, color: '#E57373' }]
                    }
          }
        })),
        emphasis: {
          itemStyle: { shadowBlur: 16, shadowColor: 'rgba(176, 125, 58, 0.35)' }
        },
        animationDuration: 700,
        animationEasing: 'cubicOut'
      }]
    }
  }, [currentLevelData, sortAsc])

  return (
    <div className="chart-container glass-morphism">
      <div className="chart-header">
        <div className="breadcrumbs">
          {titles.map((title, i) => {
            const isLast = i === titles.length - 1
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  className="breadcrumb-item"
                  onClick={() => {
                    if (!isLast) {
                      // Jump to this level: slice history and titles to i+1
                      setHistory(history.slice(0, i + 1))
                      setTitles(titles.slice(0, i + 1))
                    }
                  }}
                  style={{
                    cursor: isLast ? 'default' : 'pointer',
                    opacity: isLast ? 1 : 0.7,
                    textDecoration: 'none',
                    transition: 'opacity 0.15s',
                    fontWeight: isLast ? 700 : 600,
                  }}
                  onMouseEnter={e => { if (!isLast) (e.target as HTMLElement).style.opacity = '1' }}
                  onMouseLeave={e => { if (!isLast) (e.target as HTMLElement).style.opacity = '0.7' }}
                  title={isLast ? '' : `Go back to ${title}`}
                >
                  {title}
                </span>
                {!isLast && (
                  <span style={{ color: '#B07D3A', fontWeight: 300 }}>›</span>
                )}
              </span>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Sort Toggle */}
          <button
            onClick={() => setSortAsc(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: sortAsc ? 'rgba(176,125,58,0.1)' : 'rgba(176,125,58,0.06)',
              border: '1.5px solid rgba(176,125,58,0.3)',
              color: '#B07D3A',
              padding: '0.4rem 0.9rem',
              borderRadius: '0.65rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
              letterSpacing: '0.01em'
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>{sortAsc ? '↑' : '↓'}</span>
            {sortAsc ? 'Low → High' : 'High → Low'}
          </button>
          {history.length > 1 && (
            <button onClick={goBack} className="back-button">← Back</button>
          )}
        </div>
      </div>
      {/* ── Color Legend ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '0.55rem 1rem 0.45rem',
        margin: '0 0 -4px',
        borderTop: '1px solid rgba(196,186,176,0.12)',
        flexWrap: 'wrap'
      }}>
        {[
          {
            label: 'High Sell-Thru',
            sublabel: '> 80%',
            from: '#2D6A4F',
            to: '#6BAE82',
          },
          {
            label: 'Medium Sell-Thru',
            sublabel: '40 – 80%',
            from: '#92400E',
            to: '#D4A85A',
          },
          {
            label: 'Low Sell-Thru',
            sublabel: '< 40%',
            from: '#9B1C1C',
            to: '#E57373',
          },
          {
            label: 'Others',
            sublabel: 'grouped remainder',
            from: '#78716C',
            to: '#A8A29E',
          },
        ].map(({ label, sublabel, from, to }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {/* gradient swatch matching the exact bar gradient */}
            <div style={{
              width: '28px',
              height: '12px',
              borderRadius: '4px',
              background: `linear-gradient(to top, ${from}, ${to})`,
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
            }} />
            <div style={{ lineHeight: 1.2 }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#C4BAB0',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.01em'
              }}>{label}</span>
              <span style={{
                fontSize: '0.65rem',
                color: '#78716C',
                fontFamily: 'Inter, sans-serif',
                marginLeft: '4px'
              }}>({sublabel})</span>
            </div>
          </div>
        ))}
      </div>

      <ReactECharts
        option={option}
        onEvents={{ click: onChartClick }}
        style={{ height: '560px', width: '100%' }}
      />
    </div>
  )
}

export default DrilldownChart
