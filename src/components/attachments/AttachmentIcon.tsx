import { File, FileArchive, FileImage, FileSpreadsheet, FileText, Link2, PenTool, Presentation, Video } from "lucide-react";
import { fileExtension, youtubeId, type AttachmentItem } from "@/lib/attachments";

export function AttachmentIcon({ item, size = 20 }: { item: AttachmentItem; size?: number }) {
  if (item.kind === "LINK") {
    return youtubeId(item.url) ? <Video size={size} className="text-danger" /> : <Link2 size={size} className="text-primary" />;
  }

  switch (fileExtension(item.fileName)) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return <FileImage size={size} className="text-primary" />;
    case "psd":
    case "fig":
      return <PenTool size={size} className="text-[#7c3aed] dark:text-violet-400" />;
    case "pdf":
      return <FileText size={size} className="text-danger" />;
    case "zip":
    case "rar":
    case "7z":
      return <FileArchive size={size} className="text-warning" />;
    case "xlsx":
      return <FileSpreadsheet size={size} className="text-success" />;
    case "pptx":
      return <Presentation size={size} className="text-[#ea580c] dark:text-orange-400" />;
    case "docx":
    case "txt":
      return <FileText size={size} className="text-[#2563eb] dark:text-blue-400" />;
    default:
      return <File size={size} className="text-muted" />;
  }
}
