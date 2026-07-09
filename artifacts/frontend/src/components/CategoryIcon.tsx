interface Props {
  svg?: string | null;
  size?: number;
  className?: string;
}

export function CategoryIcon({ svg, size = 20, className = "" }: Props) {
  if (!svg?.trim()) return null;

  return (
    <span
      className={`inline-flex mt-[0.2px] shrink-0 items-center justify-center [&_svg]:block [&_svg]:max-w-full [&_svg]:max-h-full ${className}`}
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
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <CategoryIcon svg={iconSvg} size={iconSize} />
      <span className={`truncate ${nameClassName}`}>{name}</span>
    </span>
  );
}
