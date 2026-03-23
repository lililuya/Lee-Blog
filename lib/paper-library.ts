import { PaperReadingStatus } from "@prisma/client";

export const paperReadingStatusOptions = [
  { value: PaperReadingStatus.TO_READ, label: "待读" },
  { value: PaperReadingStatus.READING, label: "在读" },
  { value: PaperReadingStatus.COMPLETED, label: "已读完" },
  { value: PaperReadingStatus.ARCHIVED, label: "已归档" },
] as const;

export const paperLibraryNoticeMap: Record<string, string> = {
  saved: "论文已保存到你的研究库。",
  updated: "阅读状态已更新。",
  progress: "阅读进度已同步。",
  removed: "论文已从研究库移除。",
  annotated: "批注已保存。",
  "annotation-deleted": "批注已删除。",
};

export const paperLibraryErrorMap: Record<string, string> = {
  "library-item-not-found": "这篇论文已不在你的研究库中。",
  "annotation-not-found": "这条批注已不存在。",
};

export function formatPaperReadingStatus(status: PaperReadingStatus | string) {
  switch (status) {
    case PaperReadingStatus.TO_READ:
    case "TO_READ":
      return "待读";
    case PaperReadingStatus.READING:
    case "READING":
      return "在读";
    case PaperReadingStatus.COMPLETED:
    case "COMPLETED":
      return "已读完";
    case PaperReadingStatus.ARCHIVED:
    case "ARCHIVED":
      return "已归档";
    default:
      return String(status);
  }
}
