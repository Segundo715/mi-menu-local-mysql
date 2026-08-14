"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Stage, Layer, Rect, Circle, Group, Text, Line, Transformer } from "react-konva"
import type Konva from "konva"
import { RestaurantTable, STATUS_META } from "./types"

type Props = {
  tables: RestaurantTable[]
  selectedId: string | null
  showGrid: boolean
  gridSize: number
  /** Si está en modo vista previa, las mesas no se pueden mover ni transformar. */
  preview: boolean
  planWidth: number
  planHeight: number
  onSelect: (id: string | null) => void
  onChange: (table: RestaurantTable) => void
}

const MIN_SIZE = 30

/**
 * Lienzo interactivo (Konva). Es client-only y se monta vía next/dynamic
 * (ssr:false) desde FloorPlanEditor, porque react-konva no soporta SSR.
 */
export default function FloorCanvas({
  tables,
  selectedId,
  showGrid,
  gridSize,
  preview,
  planWidth,
  planHeight,
  onSelect,
  onChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageWidth, setStageWidth] = useState(planWidth)

  // El alto del lienzo es fijo (el del plano); el ancho se adapta al contenedor
  // para ser responsive en tablet/desktop (con scroll si el plano es más ancho).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setStageWidth(el.clientWidth)
    })
    ro.observe(el)
    setStageWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines: React.ReactElement[] = []
    const w = Math.max(stageWidth, planWidth)
    for (let x = 0; x <= w; x += gridSize) {
      lines.push(<Line key={`v${x}`} points={[x, 0, x, planHeight]} stroke="rgba(255,255,255,0.06)" strokeWidth={1} listening={false} />)
    }
    for (let y = 0; y <= planHeight; y += gridSize) {
      lines.push(<Line key={`h${y}`} points={[0, y, w, y]} stroke="rgba(255,255,255,0.06)" strokeWidth={1} listening={false} />)
    }
    return lines
  }, [showGrid, gridSize, stageWidth, planWidth, planHeight])

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Click en zona vacía (el propio Stage) → deseleccionar.
    if (e.target === e.target.getStage()) onSelect(null)
  }

  return (
    <div ref={containerRef} className="w-full overflow-auto rounded-xl" style={{ maxHeight: planHeight + 4 }}>
      <Stage
        width={Math.max(stageWidth, planWidth)}
        height={planHeight}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        style={{ background: "#0b1020" }}
      >
        <Layer listening={false}>
          {/* Fondo del plano */}
          <Rect x={0} y={0} width={Math.max(stageWidth, planWidth)} height={planHeight} fill="#0b1020" />
          {gridLines}
          {/* Borde del área útil del plano */}
          <Rect x={1} y={1} width={planWidth - 2} height={planHeight - 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} dash={[6, 6]} cornerRadius={8} />
        </Layer>

        <Layer>
          {tables.map(t => (
            <TableNode
              key={t.id}
              table={t}
              isSelected={t.id === selectedId}
              preview={preview}
              gridSize={showGrid ? gridSize : 0}
              onSelect={() => onSelect(t.id)}
              onChange={onChange}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

// =============================================================================
// Una mesa: Group centrado en (x,y), con shape según tipo + etiquetas.
// =============================================================================
function TableNode({
  table,
  isSelected,
  preview,
  gridSize,
  onSelect,
  onChange,
}: {
  table: RestaurantTable
  isSelected: boolean
  preview: boolean
  gridSize: number
  onSelect: () => void
  onChange: (t: RestaurantTable) => void
}) {
  const groupRef = useRef<Konva.Group>(null)
  const trRef = useRef<Konva.Transformer>(null)

  // Acoplar el Transformer al grupo cuando la mesa está seleccionada.
  useEffect(() => {
    if (isSelected && !preview && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, preview])

  const meta = STATUS_META[table.status]
  const w = table.width
  const h = table.height
  const round = table.type === "round"

  const snap = (v: number) => (gridSize > 0 ? Math.round(v / gridSize) * gridSize : v)

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ ...table, x: snap(e.target.x()), y: snap(e.target.y()) })
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    // Konva escala el nodo; convertimos esa escala a width/height reales y la reseteamos.
    node.scaleX(1)
    node.scaleY(1)
    onChange({
      ...table,
      x: snap(node.x()),
      y: snap(node.y()),
      width: Math.max(MIN_SIZE, Math.round(w * scaleX)),
      height: Math.max(MIN_SIZE, Math.round((round ? w : h) * (round ? scaleX : scaleY))),
      rotation: Math.round(node.rotation()),
    })
  }

  return (
    <>
      <Group
        ref={groupRef}
        x={table.x}
        y={table.y}
        rotation={table.rotation}
        draggable={!preview}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        opacity={table.status === "blocked" ? 0.55 : 1}
      >
        {round ? (
          <Circle
            radius={w / 2}
            fill={meta.color + "22"}
            stroke={meta.color}
            strokeWidth={isSelected ? 3 : 2}
            shadowColor={meta.color}
            shadowBlur={isSelected ? 16 : 0}
            shadowOpacity={0.6}
          />
        ) : (
          <Rect
            width={w}
            height={h}
            offsetX={w / 2}
            offsetY={h / 2}
            cornerRadius={table.type === "bar" ? 6 : 12}
            fill={meta.color + "22"}
            stroke={meta.color}
            strokeWidth={isSelected ? 3 : 2}
            shadowColor={meta.color}
            shadowBlur={isSelected ? 16 : 0}
            shadowOpacity={0.6}
          />
        )}

        {/* Nombre / número de mesa */}
        <Text
          text={table.name || "—"}
          fontSize={15}
          fontStyle="bold"
          fill="#ffffff"
          width={w}
          offsetX={w / 2}
          offsetY={9}
          align="center"
          listening={false}
        />
        {/* Capacidad */}
        <Text
          text={`${table.capacity}p`}
          fontSize={11}
          fill={meta.color}
          width={w}
          offsetX={w / 2}
          offsetY={-8}
          align="center"
          listening={false}
        />
      </Group>

      {isSelected && !preview && (
        <Transformer
          ref={trRef}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          keepRatio={round}
          enabledAnchors={
            round
              ? ["top-left", "top-right", "bottom-left", "bottom-right"]
              : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
          }
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) return oldBox
            return newBox
          }}
          anchorStroke="#00e676"
          anchorFill="#0b1020"
          borderStroke="#00e676"
        />
      )}
    </>
  )
}
