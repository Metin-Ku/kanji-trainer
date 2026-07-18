interface Props {
  svg?: string | null;
  size?: number;
  className?: string;
}

export function CategoryIcon({ svg, size = 20, className = "" }: Props) {
  if (!svg?.trim()) return null;

  return (
    <span
      className={`mt-[0.2px] inline-flex shrink-0 items-center justify-center [&_svg]:block [&_svg]:max-h-full [&_svg]:max-w-full ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg.trim() }}
      aria-hidden
    />
  );
}

interface TitleProps {
  name: string;
  iconSvg?: string | null;
  iconSize?: number;
  nameClassName?: string;
  className?: string;
}

export function CategoryTitle({
  name,
  iconSvg,
  iconSize = 20,
  nameClassName = "",
  className = "",
}: TitleProps) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <CategoryIcon svg={iconSvg} size={iconSize} />
      <span className={`truncate ${nameClassName}`}>{name}</span>
    </span>
  );
}
