import type { CalculatedCabinetSection, WardrobeInput, WardrobeLayout } from '../types/furniture'

type WardrobeFrontSvgProps = {
  input: WardrobeInput
  layout: WardrobeLayout
}

const VIEW_W = 1080
const VIEW_H = 680
const MARGIN_X = 92
const MARGIN_TOP = 76
const MARGIN_BOTTOM = 132
const MIN_LABEL_W = 48
const MIN_DIM_H = 28

const getSectionText = (itemType: string) => {
  if (itemType === 'longHanger') {
    return '긴옷'
  }

  if (itemType === 'shortHanger') {
    return '짧은옷'
  }

  if (itemType === 'drawer') {
    return '서랍'
  }

  if (itemType === 'shelf') {
    return '선반'
  }

  return '오픈'
}

const getSectionName = (section: CalculatedCabinetSection, sectionIndex: number, sectionCount: number) => {
  if (sectionCount === 1) {
    return section.label || getSectionText(section.itemType)
  }

  if (sectionIndex === 0) {
    return '상부'
  }

  if (sectionIndex === sectionCount - 1) {
    return '하부'
  }

  return '중부'
}

export default function WardrobeFrontSvg({ input, layout }: WardrobeFrontSvgProps) {
  const drawingMaxW = VIEW_W - MARGIN_X * 2
  const drawingMaxH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM
  const scale = Math.min(drawingMaxW / Math.max(input.totalW, 1), drawingMaxH / layout.furnitureH)
  const drawingW = input.totalW * scale
  const drawingH = layout.furnitureH * scale
  const originX = (VIEW_W - drawingW) / 2
  const originY = MARGIN_TOP
  const bodyT = Math.max(input.bodyThickness * scale, 2)
  const toeH = input.toeKickH * scale
  const caseH = Math.max(layout.usableH * scale, 1)
  const usableStartX = originX + input.leftCpEp * scale

  let currentX = usableStartX

  const renderDrawerRows = (
    x: number,
    y: number,
    width: number,
    height: number,
    drawerCount = 3,
    drawerHeight: number,
  ) => {
    const safeCount = Math.max(Math.floor(drawerCount), 1)
    const rowH = height / safeCount

    return Array.from({ length: safeCount }, (_, index) => {
      const rowY = y + rowH * index
      const lineY = rowY + rowH

      return (
        <g key={`drawer-${rowY}`}>
          {index < safeCount - 1 ? (
            <line className="section-detail-line" x1={x} y1={lineY} x2={x + width} y2={lineY} />
          ) : null}
          {rowH > MIN_DIM_H ? (
            <text className="drawer-dim" x={x + width / 2} y={rowY + rowH / 2}>
              {drawerHeight}H
            </text>
          ) : null}
        </g>
      )
    })
  }

  const renderShelfLines = (x: number, y: number, width: number, height: number, shelfCount = 4) => {
    const safeCount = Math.max(Math.floor(shelfCount), 1)

    return Array.from({ length: safeCount - 1 }, (_, index) => {
      const lineY = y + (height / safeCount) * (index + 1)

      return <line className="section-detail-line" key={`shelf-${lineY}`} x1={x} y1={lineY} x2={x + width} y2={lineY} />
    })
  }

  const renderSectionItem = (
    itemType: string,
    x: number,
    y: number,
    width: number,
    height: number,
    drawerCount?: number,
    shelfCount?: number,
    calculatedH?: number,
  ) => {
    if (itemType === 'drawer') {
      const safeCount = Math.max(Math.floor(drawerCount ?? 3), 1)
      const drawerHeight = Math.round((calculatedH ?? 0) / safeCount)

      return renderDrawerRows(x, y, width, height, safeCount, drawerHeight)
    }

    if (itemType === 'shelf') {
      return renderShelfLines(x, y, width, height, shelfCount)
    }

    if (itemType === 'longHanger' || itemType === 'shortHanger') {
      const rodY = y + Math.min(height * 0.28, 34)

      return <line className="hanger-rod" x1={x + 10} y1={rodY} x2={x + width - 10} y2={rodY} />
    }

    return null
  }

  return (
    <svg className="front-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="붙박이장 정면도">
      <defs>
        <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      <line className="ceiling-line" x1={originX} y1={originY - input.ceilingGap * scale} x2={originX + drawingW} y2={originY - input.ceilingGap * scale} />
      <rect className="toe" x={originX} y={originY + caseH} width={drawingW} height={toeH} />
      <rect className="side-filler" x={originX} y={originY} width={input.leftCpEp * scale} height={caseH} />
      <rect className="side-filler" x={originX + drawingW - input.rightCpEp * scale} y={originY} width={input.rightCpEp * scale} height={caseH} />

      {layout.bays.map((bay) => {
        const bayX = currentX
        const bayW = bay.outerW * scale
        currentX += bayW

        return (
          <g key={bay.id}>
            <rect className="cabinet-box" x={bayX} y={originY} width={bayW} height={caseH} />
            <rect className="cabinet-inner" x={bayX + bodyT} y={originY + bodyT} width={Math.max(bayW - bodyT * 2, 0)} height={Math.max(caseH - bodyT * 2, 0)} />
            {(() => {
              const innerX = bayX
              const innerY = originY
              const innerW = bayW
              let currentY = innerY

              return bay.sections.map((section, sectionIndex) => {
                const sectionH = Math.max(section.calculatedH * scale, 0)
                const sectionY = currentY
                currentY += sectionH

                if (sectionH <= 0) {
                  return null
                }

                return (
                  <g key={section.id}>
                    <rect className="cabinet-section" x={innerX} y={sectionY} width={innerW} height={sectionH} />
                    {section.splits?.length ? (
                      (() => {
                        let splitX = innerX

                        return section.splits.map((split, splitIndex) => {
                          const splitW = splitIndex === section.splits!.length - 1
                            ? innerX + innerW - splitX
                            : Math.max(split.calculatedW * scale, 0)
                          const currentSplitX = splitX
                          splitX += splitW

                          return (
                            <g key={split.id}>
                              {splitIndex > 0 ? (
                                <line className="section-split-line" x1={currentSplitX} y1={sectionY} x2={currentSplitX} y2={sectionY + sectionH} />
                              ) : null}
                              {renderSectionItem(split.itemType, currentSplitX, sectionY, splitW, sectionH, split.drawerCount, split.shelfCount, section.calculatedH)}
                              {splitW > MIN_LABEL_W ? (
                                <>
                                  <text className="split-type-label" x={currentSplitX + splitW / 2} y={sectionY + 24}>
                                    {split.label || getSectionText(split.itemType)}
                                  </text>
                                  <text className="split-type-label" x={currentSplitX + splitW / 2} y={sectionY + Math.min(sectionH / 2, sectionH - 18)}>
                                    {getSectionText(split.itemType)}
                                  </text>
                                  <text className="split-width-dim" x={currentSplitX + splitW / 2} y={sectionY + sectionH - 8}>
                                    {split.calculatedW}W
                                  </text>
                                </>
                              ) : null}
                            </g>
                          )
                        })
                      })()
                    ) : (
                      <>
                        {renderSectionItem(section.itemType, innerX, sectionY, innerW, sectionH, section.drawerCount, section.shelfCount, section.calculatedH)}
                        {innerW > MIN_LABEL_W ? (
                          <text className="split-type-label" x={innerX + innerW / 2} y={sectionY + Math.min(sectionH / 2, sectionH - 18)}>
                            {getSectionText(section.itemType)}
                          </text>
                        ) : null}
                      </>
                    )}
                    <text className="section-label" x={innerX + innerW / 2} y={sectionY + 12}>
                      {getSectionName(section, sectionIndex, bay.sections.length)}
                    </text>
                    {sectionH > MIN_DIM_H ? (
                      <text className="section-dim" x={innerX + innerW - 8} y={sectionY + sectionH - 8}>
                        {section.calculatedH}H
                      </text>
                    ) : null}
                  </g>
                )
              })
            })()}
            <text className="bay-number" x={bayX + bayW / 2} y={originY + 30}>
              {bay.id}통
            </text>
            <text className="bay-size" x={bayX + bayW / 2} y={originY + caseH + toeH + 34}>
              {bay.outerW} mm
            </text>
            <text className="bay-inner-size" x={bayX + bayW / 2} y={originY + caseH + toeH + 50}>
              내부W {bay.innerW} mm
            </text>
            <line className="bay-dim" x1={bayX + 8} y1={originY + caseH + toeH + 14} x2={bayX + bayW - 8} y2={originY + caseH + toeH + 14} />
          </g>
        )
      })}

      <line className="main-dim" x1={originX} y1={originY - 34} x2={originX + drawingW} y2={originY - 34} />
      <text className="dim-label" x={originX + drawingW / 2} y={originY - 46}>
        전체 W {input.totalW}
      </text>
      <line className="main-dim" x1={originX - 36} y1={originY} x2={originX - 36} y2={originY + drawingH} />
      <text className="dim-label vertical" x={originX - 52} y={originY + drawingH / 2} transform={`rotate(-90 ${originX - 52} ${originY + drawingH / 2})`}>
        실제 가구 H {layout.furnitureH}
      </text>
      <text className="note" x={originX} y={originY + drawingH + 76}>
        좌 CP/EP {input.leftCpEp} | 우 CP/EP {input.rightCpEp} | 몸통 {input.bodyThickness}T | 좌대 H {input.toeKickH} | D {input.totalD}
      </text>
    </svg>
  )
}
