export interface MovieFragment {
  id?: number;
  movie_id: string;
  data: ArrayBuffer;
  start: number;
  end: number;
}

export interface MovieFragmentIndex {
  movie_id: string;
  data_id: number;
  start: number;
  end: number;
}
