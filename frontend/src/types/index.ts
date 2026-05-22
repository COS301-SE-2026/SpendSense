// shared typescript interfaces and types
//
// put types here when they're used across multiple different features
// feature-specific types should live inside their own feature folder


// API RESPONSE ENVELOPE SHAPES

export interface ApiResponse<T>{
    data: T
}

export interface ApiListResponse<T>{
  data: T[]
  meta:{
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface ApiError{
  statusCode: number
  message: string
  timestamp: string
  path?: string
}