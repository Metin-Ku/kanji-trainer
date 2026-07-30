import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { prepareCategoryIconSvg } from "@/lib/categoryIconSvg";

type IconProps = {
  svg?: string | null;
  size?: number;
  color?: string;
};

export function CategoryIcon({ svg, size = 20, color }: IconProps) {
  if (!svg?.trim()) return null;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SvgXml
        xml={prepareCategoryIconSvg(svg)}
        width={size}
        height={size}
        color={color}
      />
    </View>
  );
}

type TitleProps = {
  name: string;
  iconSvg?: string | null;
  iconSize?: number;
  color?: string;
  nameSize?: number;
  nameWeight?: "600" | "700";
};

export function CategoryTitle({
  name,
  iconSvg,
  iconSize = 20,
  color,
  nameSize = 12,
  nameWeight = "700",
}: TitleProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
      <CategoryIcon svg={iconSvg} size={iconSize} color={color} />
      <Text
        style={{
          fontSize: nameSize,
          fontWeight: nameWeight,
          color,
          flexShrink: 1,
        }}
        numberOfLines={2}
      >
        {name}
      </Text>
    </View>
  );
}
