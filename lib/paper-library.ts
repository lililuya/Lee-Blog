import { PaperReadingStatus } from "@prisma/client";

export const paperReadingStatusOptions = [
  { value: PaperReadingStatus.TO_READ, label: "To Read" },
  { value: PaperReadingStatus.READING, label: "Reading" },
  { value: PaperReadingStatus.COMPLETED, label: "Completed" },
  { value: PaperReadingStatus.ARCHIVED, label: "Archived" },
] as const;

export const paperLibraryNoticeMap: Record<string, string> = {
  saved: "Paper saved to your research library.",
  updated: "Reading status updated.",
  removed: "Paper removed from your research library.",
  annotated: "Annotation saved.",
  "annotation-deleted": "Annotation removed.",
};

export const paperLibraryErrorMap: Record<string, string> = {
  "library-item-not-found": "That paper is no longer available in your library.",
  "annotation-not-found": "That annotation no longer exists.",
};

export function formatPaperReadingStatus(status: PaperReadingStatus | string) {
  switch (status) {
    case PaperReadingStatus.TO_READ:
    case "TO_READ":
      return "To Read";
    case PaperReadingStatus.READING:
    case "READING":
      return "Reading";
    case PaperReadingStatus.COMPLETED:
    case "COMPLETED":
      return "Completed";
    case PaperReadingStatus.ARCHIVED:
    case "ARCHIVED":
      return "Archived";
    default:
      return String(status);
  }
}