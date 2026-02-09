import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { countryNameToId, getDisplayName } from "@/lib/countryMapping";

export interface VisitedCountryData {
  id: string;
  name: string;
  normalizedName: string;
  image: string;
}

export async function GET() {
  try {
    // Read the YAML file
    const yamlPath = path.join(process.cwd(), "data", "visited.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf-8");
    const data = yaml.parse(yamlContent) as { countries: string[] };

    if (!data.countries || !Array.isArray(data.countries)) {
      return NextResponse.json({ countries: [], totalCountries: 195 });
    }

    // Scan for images
    const imagesDir = path.join(process.cwd(), "data", "images");
    let imageFiles: string[] = [];

    if (fs.existsSync(imagesDir)) {
      imageFiles = fs.readdirSync(imagesDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      });
    }

    // Build country data
    const countries: VisitedCountryData[] = data.countries
      .map((normalizedName: string) => {
        const id = countryNameToId[normalizedName];
        if (!id) {
          console.warn(`Unknown country: ${normalizedName}`);
          return null;
        }

        // Find first image for this country
        const countryImage = imageFiles.find((file) => {
          const baseName = file.toLowerCase();
          return baseName.startsWith(normalizedName + "_") ||
                 baseName.startsWith(normalizedName + ".");
        });

        return {
          id,
          name: getDisplayName(normalizedName),
          normalizedName,
          image: countryImage ? `/api/images/${countryImage}` : "",
        };
      })
      .filter((c): c is VisitedCountryData => c !== null);

    return NextResponse.json({
      countries,
      totalCountries: 195,
    });
  } catch (error) {
    console.error("Error loading countries:", error);
    return NextResponse.json(
      { error: "Failed to load countries" },
      { status: 500 }
    );
  }
}
