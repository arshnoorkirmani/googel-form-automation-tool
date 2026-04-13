import {
  formatDateTimeSummary,
  isValidDateString,
  normalizeDateForForm
} from "@/lib/utils/date-time";

describe("date-time utils", () => {
  it("validates calendar-safe dd-mm-yyyy dates", () => {
    expect(isValidDateString("29-02-2028")).toBe(true);
    expect(isValidDateString("31-11-2026")).toBe(false);
  });

  it("returns fallback formats for Google Form entry", () => {
    expect(normalizeDateForForm("13-04-2026")).toEqual([
      "13-04-2026",
      "13/04/2026",
      "2026-04-13"
    ]);
  });

  it("formats preview summaries", () => {
    expect(
      formatDateTimeSummary({
        date: "13-04-2026",
        hour: "9",
        minute: "05",
        meridiem: "PM"
      })
    ).toBe("13-04-2026 09:05 PM");
  });
});
