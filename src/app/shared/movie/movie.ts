export interface Movie {
  id?: string;
  hash: string;
  mime_type: string | undefined;
  file_size: number;
  title: string;
  downloaded_length: number;
  content_length: number;
  corrupt: boolean;
}
