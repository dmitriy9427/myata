export function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ '--c': color, '--s': `${size}px` } as React.CSSProperties} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}
