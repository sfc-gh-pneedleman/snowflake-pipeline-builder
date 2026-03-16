"use client";

import dynamic from "next/dynamic";

const ETLBuilder = dynamic(() => import("@/components/etl-builder"), {
  ssr: false,
});

export default function BuilderPage() {
  return <ETLBuilder />;
}
