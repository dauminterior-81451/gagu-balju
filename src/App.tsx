import { useMemo, useState } from 'react'
import WardrobeFrontSvg from './components/WardrobeFrontSvg'
import { calculateWardrobeLayout, clampNumber } from './utils/calculateLayout'
import type { BaySectionMap, CabinetSection, SectionItemType, SectionSplit, WardrobeInput } from './types/furniture'
import './App.css'

const initialInput: WardrobeInput = {
  totalW: 3600,
  ceilingH: 2300,
  ceilingGap: 15,
  totalD: 600,
  leftCpEp: 23,
  rightCpEp: 23,
  bodyThickness: 18,
  toeKickH: 80,
  bayCount: 5,
}

type NumberField = {
  key: keyof WardrobeInput
  label: string
  min: number
  max: number
  step?: number
}

type StructurePresetKey = 'twoSplit' | 'threeSplit' | 'longDrawer' | 'shortDrawer' | 'open' | 'shelf' | 'bottomSplit'

type StructurePreset = {
  key: StructurePresetKey
  label: string
}

type CategoryKey = 'wardrobe' | 'shoeCabinet' | 'sinkCabinet' | 'storageCabinet'

type Category = {
  key: CategoryKey
  label: string
  title: string
  description: string
}

const categories: Category[] = [
  {
    key: 'wardrobe',
    label: '붙박이장',
    title: '붙박이장 발주',
    description: '기본 치수를 입력하면 통별 정면도와 계산값을 확인할 수 있습니다.',
  },
  {
    key: 'shoeCabinet',
    label: '신발장',
    title: '신발장 발주',
    description: '신발장 입력폼과 미리보기는 준비중입니다.',
  },
  {
    key: 'sinkCabinet',
    label: '싱크대',
    title: '싱크대 발주',
    description: '싱크대 입력폼과 미리보기는 준비중입니다.',
  },
  {
    key: 'storageCabinet',
    label: '기타수납장',
    title: '기타수납장 발주',
    description: '기타수납장 입력폼과 미리보기는 준비중입니다.',
  },
]

const fields: NumberField[] = [
  { key: 'totalW', label: '전체 W', min: 1000, max: 9000 },
  { key: 'ceilingH', label: '천장 H', min: 1800, max: 3500 },
  { key: 'ceilingGap', label: '천장 이격', min: 0, max: 200 },
  { key: 'totalD', label: '전체 D', min: 300, max: 1200 },
  { key: 'leftCpEp', label: '좌 CP/EP', min: 0, max: 300 },
  { key: 'rightCpEp', label: '우 CP/EP', min: 0, max: 300 },
  { key: 'bodyThickness', label: '몸통 두께', min: 12, max: 30 },
  { key: 'toeKickH', label: '좌대 높이', min: 0, max: 250 },
  { key: 'bayCount', label: '통 개수', min: 1, max: 12, step: 1 },
]

const structurePresets: StructurePreset[] = [
  { key: 'twoSplit', label: '상하 2분할' },
  { key: 'threeSplit', label: '상중하 3분할' },
  { key: 'longDrawer', label: '상단 긴옷 + 하단 서랍' },
  { key: 'shortDrawer', label: '상단 짧은옷 + 하단 서랍 4~5개' },
  { key: 'open', label: '전체 오픈장' },
  { key: 'shelf', label: '선반장' },
  { key: 'bottomSplit', label: '하단 좌우 2분할' },
]

const sectionItemOptions: { value: SectionItemType; label: string }[] = [
  { value: 'open', label: '오픈' },
  { value: 'shelf', label: '선반' },
  { value: 'longHanger', label: '긴옷' },
  { value: 'shortHanger', label: '짧은옷' },
  { value: 'drawer', label: '서랍' },
]

const createVerticalSplits = (section: CabinetSection, splitCount: number): SectionSplit[] => (
  Array.from({ length: splitCount }, (_, index) => {
    const currentSplit = section.splits?.[index]

    return {
      id: currentSplit?.id ?? `${section.id}-vertical-${index + 1}`,
      label: currentSplit?.label ?? `${index + 1}분할`,
      itemType: currentSplit?.itemType ?? section.itemType,
      widthRatio: currentSplit?.widthRatio ?? 1,
      drawerCount: currentSplit?.drawerCount ?? section.drawerCount,
      shelfCount: currentSplit?.shelfCount ?? section.shelfCount,
    }
  })
)

const createPresetSections = (presetKey: StructurePresetKey): CabinetSection[] => {
  if (presetKey === 'twoSplit') {
    return [
      { id: 'top', label: '상단', itemType: 'open' },
      { id: 'bottom', label: '하단', itemType: 'open' },
    ]
  }

  if (presetKey === 'threeSplit') {
    return [
      { id: 'top', label: '상단', itemType: 'open' },
      { id: 'middle', label: '중단', itemType: 'open' },
      { id: 'bottom', label: '하단', itemType: 'open' },
    ]
  }

  if (presetKey === 'longDrawer') {
    return [
      { id: 'long-hanger', label: '긴옷', itemType: 'longHanger' },
      { id: 'drawer', label: '하단 서랍', itemType: 'drawer', drawerCount: 3 },
    ]
  }

  if (presetKey === 'shortDrawer') {
    return [
      { id: 'short-hanger', label: '짧은옷', itemType: 'shortHanger' },
      { id: 'drawer', label: '하단 서랍', itemType: 'drawer', drawerCount: 4 },
    ]
  }

  if (presetKey === 'shelf') {
    return [
      { id: 'shelf', label: '선반장', itemType: 'shelf', shelfCount: 5 },
    ]
  }

  if (presetKey === 'bottomSplit') {
    return [
      { id: 'top-open', label: '상단', itemType: 'open' },
      {
        id: 'bottom-split',
        label: '하단 좌우분할',
        itemType: 'open',
        verticalSplitCount: 2,
        splits: [
          { id: 'left', label: '좌측', itemType: 'shelf', widthRatio: 1, shelfCount: 3 },
          { id: 'right', label: '우측', itemType: 'drawer', widthRatio: 1, drawerCount: 3 },
        ],
      },
    ]
  }

  return [
    { id: 'open-full', label: '전체 오픈', itemType: 'open' },
  ]
}

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('wardrobe')
  const [input, setInput] = useState<WardrobeInput>(initialInput)
  const [selectedBayId, setSelectedBayId] = useState(1)
  const [baySections, setBaySections] = useState<BaySectionMap>({ 1: createPresetSections('longDrawer') })
  const layout = useMemo(() => calculateWardrobeLayout(input, baySections), [input, baySections])
  const currentCategory = categories.find((category) => category.key === selectedCategory) ?? categories[0]
  const safeSelectedBayId = Math.min(selectedBayId, layout.bays.length)
  const selectedBay = layout.bays.find((bay) => bay.id === safeSelectedBayId) ?? layout.bays[0]
  const selectedSections = baySections[safeSelectedBayId] ?? createPresetSections('open')

  const updateValue = (field: NumberField, value: string) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) {
      return
    }

    const nextValue = field.key === 'bayCount'
      ? Math.floor(clampNumber(numericValue, field.min, field.max))
      : clampNumber(numericValue, field.min, field.max)

    setInput((current) => ({
      ...current,
      [field.key]: nextValue,
    }))
  }

  const applyPresetToBay = (presetKey: StructurePresetKey) => {
    setBaySections((current) => ({
      ...current,
      [safeSelectedBayId]: createPresetSections(presetKey),
    }))
  }

  const updateSection = (sectionIndex: number, nextSection: CabinetSection) => {
    setBaySections((current) => {
      const currentSections = current[safeSelectedBayId] ?? createPresetSections('open')
      const nextSections = currentSections.map((section, index) => (
        index === sectionIndex ? nextSection : section
      ))

      return {
        ...current,
        [safeSelectedBayId]: nextSections,
      }
    })
  }

  const updateSectionValue = (
    sectionIndex: number,
    key: keyof CabinetSection,
    value: string,
  ) => {
    const currentSection = selectedSections[sectionIndex]
    if (!currentSection) {
      return
    }

    if (key === 'height') {
      updateSection(sectionIndex, {
        ...currentSection,
        height: value === '' ? undefined : clampNumber(Number(value), 0, selectedBay?.innerH ?? 1),
      })
      return
    }

    if (key === 'drawerCount' || key === 'shelfCount') {
      updateSection(sectionIndex, {
        ...currentSection,
        [key]: Math.floor(clampNumber(Number(value), 1, 8)),
      })
      return
    }

    if (key === 'verticalSplitCount') {
      const splitCount = Math.floor(clampNumber(Number(value), 1, 8))

      updateSection(sectionIndex, {
        ...currentSection,
        verticalSplitCount: splitCount,
        splits: splitCount > 1 ? createVerticalSplits(currentSection, splitCount) : undefined,
      })
      return
    }

    updateSection(sectionIndex, {
      ...currentSection,
      [key]: value,
    })
  }

  const updateSectionSplitValue = (
    sectionIndex: number,
    splitIndex: number,
    key: keyof SectionSplit,
    value: string,
  ) => {
    const currentSection = selectedSections[sectionIndex]
    if (!currentSection) {
      return
    }

    const splitCount = Math.floor(clampNumber(currentSection.verticalSplitCount ?? currentSection.splits?.length ?? 1, 1, 8))
    const currentSplits = createVerticalSplits(currentSection, splitCount)
    const nextSplits = currentSplits.map((split, index) => {
      if (index !== splitIndex) {
        return split
      }

      if (key === 'drawerCount' || key === 'shelfCount') {
        return {
          ...split,
          [key]: Math.floor(clampNumber(Number(value), 1, 8)),
        }
      }

      if (key === 'widthRatio') {
        return {
          ...split,
          widthRatio: clampNumber(Number(value), 0.1, 10),
        }
      }

      return {
        ...split,
        [key]: value,
      }
    })

    updateSection(sectionIndex, {
      ...currentSection,
      verticalSplitCount: splitCount,
      splits: nextSplits,
    })
  }

  return (
    <main className="app-shell">
      <aside className="category-sidebar" aria-label="가구 카테고리">
        <div className="sidebar-header">
          <p>가구발주 MVP</p>
          <h1>카테고리</h1>
        </div>

        <nav className="category-tabs">
          {categories.map((category) => (
            <button
              className={category.key === selectedCategory ? 'category-tab active' : 'category-tab'}
              key={category.key}
              type="button"
              aria-current={category.key === selectedCategory ? 'page' : undefined}
              onClick={() => setSelectedCategory(category.key)}
            >
              {category.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="work-area" aria-label={`${currentCategory.label} 작업영역`}>
        <header className="work-header">
          <div>
            <p>{currentCategory.label}</p>
            <h2>{currentCategory.title}</h2>
            <span>{currentCategory.description}</span>
          </div>
        </header>

        {selectedCategory === 'wardrobe' ? (
          <div className="wardrobe-workspace">
            <aside className="input-panel" aria-label="붙박이장 입력 패널">
              <div className="panel-header">
                <p>입력 영역</p>
                <h3>기본 치수</h3>
              </div>

              <section className="form-section" aria-label="기본 치수">
                {fields.map((field) => (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    <div className="number-input">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={input[field.key]}
                        onChange={(event) => updateValue(field, event.target.value)}
                      />
                      <b>mm</b>
                    </div>
                  </label>
                ))}
              </section>

              <section className="calc-summary" aria-label="자동 계산">
                <div>
                  <span>실제 가구 H</span>
                  <strong>{layout.furnitureH} mm</strong>
                </div>
                <div>
                  <span>내부 사용폭</span>
                  <strong>{layout.usableW} mm</strong>
                </div>
                <div>
                  <span>통 외경</span>
                  <strong>{layout.bays.map((bay) => bay.outerW).join(' / ')} mm</strong>
                </div>
                {selectedBay?.heightError ? (
                  <p className="error-message">{selectedBay.heightError}</p>
                ) : null}
              </section>
            </aside>

            <aside className="structure-panel" aria-label="통별 내부 구조 편집 패널">
              <section className="section-editor" aria-label="통별 내부 구조 편집">
                <div className="panel-header section-editor-header">
                  <p>통별 구조</p>
                  <h3>{safeSelectedBayId}통 내부 설정</h3>
                </div>

                <div className="bay-tabs" role="tablist" aria-label="통 선택">
                  {layout.bays.map((bay) => (
                    <button
                      className={bay.id === safeSelectedBayId ? 'bay-tab active' : 'bay-tab'}
                      key={bay.id}
                      type="button"
                      onClick={() => setSelectedBayId(bay.id)}
                    >
                      {bay.id}통
                    </button>
                  ))}
                </div>

                <label className="field">
                  <span>구조 프리셋</span>
                  <select className="select-input" defaultValue="" onChange={(event) => applyPresetToBay(event.target.value as StructurePresetKey)}>
                    <option value="" disabled>구조 선택</option>
                    {structurePresets.map((preset) => (
                      <option key={preset.key} value={preset.key}>{preset.label}</option>
                    ))}
                  </select>
                </label>

                <div className="section-list">
                  {selectedSections.map((section, sectionIndex) => (
                    <article className="section-card" key={section.id}>
                      <div className="section-card-title">
                        <strong>{sectionIndex + 1}구간</strong>
                        <span>{section.height ? `${section.height} mm` : '자동 높이'}</span>
                      </div>

                      <label className="field">
                        <span>표시 텍스트</span>
                        <input
                          className="text-input"
                          value={section.label}
                          onChange={(event) => updateSectionValue(sectionIndex, 'label', event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span>구간 타입</span>
                        <select
                          className="select-input"
                          value={section.itemType}
                          onChange={(event) => updateSectionValue(sectionIndex, 'itemType', event.target.value)}
                        >
                          {sectionItemOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>높이</span>
                        <div className="number-input">
                          <input
                            type="number"
                            min={0}
                            max={selectedBay?.innerH ?? 1}
                            placeholder="자동"
                            value={section.height ?? ''}
                            onChange={(event) => updateSectionValue(sectionIndex, 'height', event.target.value)}
                          />
                          <b>mm</b>
                        </div>
                      </label>

                      <label className="field">
                        <span>세로분할 개수</span>
                        <input
                          className="text-input"
                          type="number"
                          min={1}
                          max={8}
                          value={section.verticalSplitCount ?? section.splits?.length ?? 1}
                          onChange={(event) => updateSectionValue(sectionIndex, 'verticalSplitCount', event.target.value)}
                        />
                      </label>

                      {section.itemType === 'drawer' ? (
                        <label className="field">
                          <span>서랍 개수</span>
                          <input
                            className="text-input"
                            type="number"
                            min={1}
                            max={8}
                            value={section.drawerCount ?? 3}
                            onChange={(event) => updateSectionValue(sectionIndex, 'drawerCount', event.target.value)}
                          />
                        </label>
                      ) : null}

                      {section.itemType === 'shelf' ? (
                        <label className="field">
                          <span>선반 칸수</span>
                          <input
                            className="text-input"
                            type="number"
                            min={1}
                            max={8}
                            value={section.shelfCount ?? 4}
                            onChange={(event) => updateSectionValue(sectionIndex, 'shelfCount', event.target.value)}
                          />
                        </label>
                      ) : null}

                      {section.splits?.length ? (
                        <div className="split-list">
                          {section.splits.map((split, splitIndex) => (
                            <div className="split-card" key={split.id}>
                              <label className="field">
                                <span>분할 텍스트</span>
                                <input
                                  className="text-input"
                                  value={split.label}
                                  onChange={(event) => updateSectionSplitValue(sectionIndex, splitIndex, 'label', event.target.value)}
                                />
                              </label>

                              <label className="field">
                                <span>분할 타입</span>
                                <select
                                  className="select-input"
                                  value={split.itemType}
                                  onChange={(event) => updateSectionSplitValue(sectionIndex, splitIndex, 'itemType', event.target.value)}
                                >
                                  {sectionItemOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </label>

                              {split.itemType === 'drawer' ? (
                                <label className="field">
                                  <span>분할 서랍 개수</span>
                                  <input
                                    className="text-input"
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={split.drawerCount ?? 3}
                                    onChange={(event) => updateSectionSplitValue(sectionIndex, splitIndex, 'drawerCount', event.target.value)}
                                  />
                                </label>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            </aside>

            <section className="preview-area" aria-label="SVG 정면도 미리보기">
              <header className="preview-header">
                <div>
                  <p>정면도 미리보기</p>
                  <h3>통별 독립 구조</h3>
                </div>
                <dl>
                  <div>
                    <dt>W</dt>
                    <dd>{input.totalW}</dd>
                  </div>
                  <div>
                    <dt>H</dt>
                    <dd>{layout.furnitureH}</dd>
                  </div>
                  <div>
                    <dt>D</dt>
                    <dd>{input.totalD}</dd>
                  </div>
                </dl>
              </header>

              <div className="drawing-board">
                <WardrobeFrontSvg input={input} layout={layout} />
              </div>
            </section>
          </div>
        ) : (
          <section className="coming-soon-panel" aria-label={`${currentCategory.label} 준비중`}>
            <p>{currentCategory.label}</p>
            <h3>준비중입니다</h3>
            <span>현재는 붙박이장 입력폼과 SVG 미리보기만 연결되어 있습니다.</span>
          </section>
        )}
      </section>
    </main>
  )
}
