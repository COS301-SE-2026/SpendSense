declare module 'bad-words' {
  type FilterOptions = {
    emptyList?: boolean;
    list?: string[];
    exclude?: string[];
  };

  class Filter {
    constructor(options?: FilterOptions);
    isProfane(value: string): boolean;
  }

  export default Filter;
}
