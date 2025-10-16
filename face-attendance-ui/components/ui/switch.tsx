"use client"
import * as React from "react"
type Props = React.ComponentProps<"button"> & { checked?: boolean; onCheckedChange?: (v: boolean) => void }
export function Switch({ checked = false, onCheckedChange, className, ...props }: Props) {
  const [on, setOn] = React.useState(checked)
  React.useEffect(() => setOn(checked), [checked])
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        setOn(!on)
        onCheckedChange?.(!on)
      }}
      className={[
        "inline-flex h-5 w-9 items-center rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-background transform transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  )
}
