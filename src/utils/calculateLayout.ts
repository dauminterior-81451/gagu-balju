import type {
  BaySectionMap,
  CabinetSection,
  CalculatedCabinetSection,
  CalculatedSectionSplit,
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
  if (!section.splits?.length) {
    return undefined
  }

  const totalRatio = section.splits.reduce((sum, split) => sum + Math.max(split.widthRatio ?? 1, 0.1), 0)

  return section.splits.map((split) => ({
    ...split,
    calculatedW: Math.round(innerW * (Math.max(split.widthRatio ?? 1, 0.1) / totalRatio)),
  }))
}

const calculateSections = (sections: CabinetSection[], innerH: number, innerW: number): CalculatedCabinetSection[] => {
  const safeSections = sections.length > 0 ? sections : createDefaultSections()
  const autoSections = safeSections.filter((section) => section.height === undefined || section.height <= 0)
  let remainingH = innerH

  const fixedSections = safeSections.map((section) => {
    if (section.height === undefined || section.height <= 0) {
      return section
    }

    const calculatedH = clampNumber(section.height, 0, remainingH)
    remainingH = Math.max(remainingH - calculatedH, 0)

    return {
      ...section,
      calculatedH,
      splits: calculateSectionSplits(section, innerW),
    }
  })

  const autoH = autoSections.length > 0 ? Math.floor(remainingH / autoSections.length) : 0
  let autoRemainder = autoSections.length > 0 ? remainingH - autoH * autoSections.length : 0

  return fixedSections.map((section) => {
    if ('calculatedH' in section) {
      return section
    }

    const extra = autoRemainder > 0 ? 1 : 0
    autoRemainder -= extra

    return {
      ...section,
      calculatedH: autoH + extra,
      splits: calculateSectionSplits(section, innerW),
    }
  })
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

    return {
      id,
      outerW,
      innerW,
      innerH,
      sections: calculateSections(baySections[id] ?? createDefaultSections(), innerH, innerW),
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
