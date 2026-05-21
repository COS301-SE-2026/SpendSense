import {apiFetch} from '../../lib/api'

export type Category = {
    id: string
    name: string
    type: 'OBLIGATION' | 'EXPENSE' | 'BOTH'
    iconKey: string
    colourKey: string
    isDefault: boolean
}

type CategoriesResponse = {
    data: Category[]
}

// categoriesApi: seeded category lookup for obligation and expense forms
// no user ownership, categories are global defaults seeded by the backend type filter defaults to ALL if not provided

// planned endpoints:
// GET /api/v1/categories?type=OBLIGATION|EXPENSE|ALL

export async function getCategories(type?: 'OBLIGATION' | 'EXPENSE' | 'ALL'){
    const query = type? `?type=${type}` : ''
    return apiFetch<CategoriesResponse>(`/categories${query}`)
}