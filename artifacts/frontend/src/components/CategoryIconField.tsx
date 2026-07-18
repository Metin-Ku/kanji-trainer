import { SvgIconField } from "./SvgIconField";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryIconField({ value, onChange }: Props) {
  return (
    <SvgIconField value={value} onChange={onChange} namespace="categories" />
  );
}
