import type { Metadata } from "next";
import MovieWall from "@/components/MovieWall";

export const metadata: Metadata = {
  title: "Films",
  description: "Every movie I've watched, on one wall.",
  openGraph: {
    title: "Films — Shalini Mookerjee",
    description: "Every movie I've watched, on one wall.",
    url: "https://www.shalini.one/films",
  },
};

export default function FilmsPage() {
  return <MovieWall />;
}
