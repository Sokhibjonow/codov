// Free materials promised in the videos (lead magnets): students of the course find them in their cabinet.
// The files live in public/sovga, so no upload or admin step is needed.
export const GIFTS = [
  {
    course: "JavaScript",
    titleUz: "JavaScript shpargalka (PDF)",
    titleRu: "Шпаргалка по JavaScript (PDF)",
    href: "/sovga/codov-javascript-shpargalka.pdf",
  },
];

export type Gift = (typeof GIFTS)[number];

/** Gifts for the courses with these Uzbek titles. */
export function giftsFor(courseTitlesUz: string[]) {
  const titles = new Set(courseTitlesUz.map((t) => t.trim().toLowerCase()));
  return GIFTS.filter((g) => titles.has(g.course.toLowerCase()));
}
