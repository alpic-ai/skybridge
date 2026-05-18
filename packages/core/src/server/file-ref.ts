import { z } from "zod";

export const FileRef = z.object({
  file_id: z.string(),
  download_url: z.string(),
  mime_type: z.string().optional(),
  file_name: z.string().optional(),
});

export type FileRef = z.infer<typeof FileRef>;
