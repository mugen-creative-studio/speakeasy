import { useState, useRef, useEffect } from 'react'

// A two-or-more option segmented control with a sliding active pill. Self-contained
// (its styles live in admin.css, scoped under .sk-shell). `options` is [{ label, value }].
export default function Tabs({ options = [], defaultSelection, onChange }) {
  const [activeIndex, setActiveIndex] = useState(
    Math.max(
      0,
      options.findIndex((o) => o.value === defaultSelection),
    ),
  )
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const containerRef = useRef(null)
  const optionRefs = useRef([])
  const [measurements, setMeasurements] = useState([])

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      setMeasurements(
        optionRefs.current.map((el) => {
          if (!el) return { left: 0, width: 0 }
          const rect = el.getBoundingClientRect()
          return { left: rect.left - containerRect.left, width: rect.width }
        }),
      )
    }
    measure()
    if (document.fonts?.ready) document.fonts.ready.then(measure)
  }, [])

  const handleSelect = (index) => {
    setActiveIndex(index)
    onChange?.(options[index].value)
  }

  const pillLeft = (measurements[activeIndex]?.left ?? 0) - 1
  const pillWidth = measurements[activeIndex]?.width ?? 0
  const hoverLeft = (hoveredIndex !== null ? (measurements[hoveredIndex]?.left ?? 0) : 0) - 1
  const hoverWidth = hoveredIndex !== null ? (measurements[hoveredIndex]?.width ?? 0) : 0
  const showHover = hoveredIndex !== null && hoveredIndex !== activeIndex

  const clipPath =
    pillWidth > 0
      ? `inset(2px calc(100% - ${pillLeft + pillWidth}px) 2px ${pillLeft}px round var(--radius-round))`
      : 'inset(0 100% 0 0)'

  return (
    <div ref={containerRef} className="sk-tabs" role="group">
      <div
        className={`sk-tabs-hover ${showHover ? 'sk-tabs-hover-visible' : ''}`}
        style={{ width: hoverWidth || 'auto', transform: `translateX(${hoverLeft}px)` }}
      />
      <div
        className="sk-tabs-active"
        style={{ width: pillWidth || 'auto', transform: `translateX(${pillLeft}px)` }}
      />
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => (optionRefs.current[index] = el)}
          className="sk-tabs-btn"
          type="button"
          aria-pressed={index === activeIndex}
          onClick={() => handleSelect(index)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {option.label}
        </button>
      ))}
      <div aria-hidden="true" className="sk-tabs-overlay" style={{ clipPath }}>
        {options.map((option) => (
          <span key={option.value} className="sk-tabs-overlay-label">
            {option.label}
          </span>
        ))}
      </div>
    </div>
  )
}
