import type {
  BaySectionMap,
  CabinetSection,
  CalculatedSectionSplit,
  CabinetBay,
  WardrobeBay,
  WardrobeInput,
  WardrobeLayout,
} from '../types/furniture'

export const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

const createDefaultSections = (): CabinetSection[] => [
  {
    id: 'open-full',
    label: '전체 오픈',
    itemType: 'open',
  },
]

const calculateSectionSplits = (section: CabinetSection, innerW: number): CalculatedSectionSplit[] | undefined => {
  const splitCount = Math.floor(clampNumber(section.verticalSplitCount ?? section.splits?.length ?? 1, 1, 8))
  const sourceSplits = section.splits?.length
    ? section.splits.slice(0, splitCount)
    : Array.from({ length: splitCount }, (_, index) => ({
      id: `${section.id}-vertical-${index + 1}`,
      label: `${index + 1}분할`,
      itemType: section.itemType,
      drawerCount: section.drawerCount,
      drawerLabel: section.drawerLabel,
      shelfCount: section.shelfCount,
      widthRatio: 1,
    }))

  if (sourceSplits.length <= 1) {
    return undefined
  }

  const totalRatio = sourceSplits.reduce((sum, split) => sum + Math.max(split.widthRatio ?? 1, 0.1), 0)
  let usedW = 0

  return sourceSplits.map((split, index) => {
    const calculatedW = index === sourceSplits.length - 1
      ? Math.max(innerW - usedW, 0)
      : Math.round(innerW * (Math.max(split.widthRatio ?? 1, 0.1) / totalRatio))
    usedW += calculatedW

    return {
      ...split,
      calculatedW,
    }
  })
}

const calculateSections = (
  sections: CabinetSection[],
  innerH: number,
  innerW: number,
): Pick<CabinetBay, 'heightError' | 'sections'> => {
  const safeSections = sections.length > 0 ? sections : createDefaultSections()
  const fixedTotalH = safeSections.reduce((sum, section) => sum + Math.max(section.height ?? 0, 0), 0)
  const autoSectionCount = safeSections.filter((section) => section.height === undefined || section.height <= 0).length
  const remainingH = innerH - fixedTotalH
  const autoBaseH = autoSectionCount > 0 && remainingH > 0 ? Math.floor(remainingH / autoSectionCount) : 0
  const autoRemainderH = autoSectionCount > 0 && remainingH > 0 ? remainingH - autoBaseH * autoSectionCount : 0
  let autoIndex = 0

  const calculatedSections = safeSections.map((section) => {
    const isAutoHeight = section.height === undefined || section.height <= 0
    const calculatedH = isAutoHeight
      ? autoBaseH + (autoIndex === autoSectionCount - 1 ? autoRemainderH : 0)
      : Math.max(section.height ?? 0, 0)

    if (isAutoHeight) {
      autoIndex += 1
    }

    // 고정 높이 합계가 내부 사용 H를 초과하면 오류를 표시하고 SVG 높이는 0 이하로 내려가지 않게 유지한다.
    return {
      ...section,
      calculatedH,
      splits: calculateSectionSplits(section, innerW),
    }
  })

  return {
    heightError: fixedTotalH > innerH
      ? `고정 구간 높이 합계 ${fixedTotalH}mm가 내부 사용 H ${innerH}mm를 초과합니다.`
      : undefined,
    sections: calculatedSections,
  }
}

const distributeWidths = (
  total: number,
  count: number,
  innerH: number,
  bodyThickness: number,
  baySections: BaySectionMap,
): WardrobeBay[] => {
  const base = Math.floor(total / count)
  let remainder = total - base * count

  return Array.from({ length: count }, (_, index) => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    const id = index + 1
    const outerW = base + extra
    const innerW = Math.max(outerW - bodyThickness * 2, 0)

    const calculatedSections = calculateSections(baySections[id] ?? createDefaultSections(), innerH, innerW)

    return {
      id,
      outerW,
      innerW,
      innerH,
      heightError: calculatedSections.heightError,
      sections: calculatedSections.sections,
    }
  })
}

export const calculateWardrobeLayout = (input: WardrobeInput, baySections: BaySectionMap = {}): WardrobeLayout => {
  const bayCount = Math.floor(clampNumber(input.bayCount, 1, 12))
  const furnitureH = Math.max(input.ceilingH - input.ceilingGap, 1)
  const usableW = Math.max(input.totalW - input.leftCpEp - input.rightCpEp, 0)
  const usableH = Math.max(furnitureH - input.toeKickH, 1)

  return {
    furnitureH,
    usableH,
    usableW,
    bays: distributeWidths(usableW, bayCount, usableH, input.bodyThickness, baySections),
  }
}
