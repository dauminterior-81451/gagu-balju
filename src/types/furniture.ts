export type WardrobeInput = {
  totalW: number
  ceilingH: number
  ceilingGap: number
  totalD: number
  leftCpEp: number
  rightCpEp: number
  bodyThickness: number
  toeKickH: number
  bayCount: number
}

export type SectionItemType = 'open' | 'shelf' | 'longHanger' | 'shortHanger' | 'drawer'

export type SectionSplit = {
  id: string
  label: string
  itemType: SectionItemType
  widthRatio?: number
  drawerCount?: number
  shelfCount?: number
}

export type CabinetSection = {
  id: string
  label: string
  itemType: SectionItemType
  height?: number
  verticalSplitCount?: number
  drawerCount?: number
  shelfCount?: number
  splits?: SectionSplit[]
}

export type CalculatedSectionSplit = SectionSplit & {
  calculatedW: number
}

export type CalculatedCabinetSection = Omit<CabinetSection, 'splits'> & {
  calculatedH: number
  splits?: CalculatedSectionSplit[]
}

export type CabinetBay = {
  id: number
  outerW: number
  innerW: number
  innerH: number
  heightError?: string
  sections: CalculatedCabinetSection[]
}

export type WardrobeBay = CabinetBay

export type BaySectionMap = Record<number, CabinetSection[]>

export type WardrobeLayout = {
  furnitureH: number
  usableH: number
  usableW: number
  bays: CabinetBay[]
}
