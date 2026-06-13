import type { Metadata } from "next";
import MovieWall from "@/components/MovieWall";

export const metadata: Metadata = {
  title: "Films — Shalini Mookerjee",
  description: "Every movie I've watched, on one wall.",
};

export default function FilmsPage() {
  return <MovieWall />;
}
