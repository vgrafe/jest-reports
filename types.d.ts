interface Annotation {
  start_line?: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
  path: string;
  message: string;
  annotation_level: string;
}
