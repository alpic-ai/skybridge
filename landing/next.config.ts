import type { NextConfig } from "next";
import withExportImages from "next-export-optimize-images";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH || "",
  images: {
    loader: "default",
  },
};

export default withExportImages(nextConfig);
