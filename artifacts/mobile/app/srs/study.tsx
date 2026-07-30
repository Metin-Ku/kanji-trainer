import { useRef } from "react";
import { getSrsSession } from "@/lib/srsStore";
import { SrsStudyScreen } from "@/components/SrsStudyScreen";
import { ExampleSrsStudyScreen } from "@/components/ExampleSrsStudyScreen";

export default function SrsStudyRoute() {
  const sessionRef = useRef(getSrsSession());
  if (sessionRef.current.deck === "example") {
    return <ExampleSrsStudyScreen />;
  }
  return <SrsStudyScreen />;
}
