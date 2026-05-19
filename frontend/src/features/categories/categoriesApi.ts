import {apiFetch} from '../../lib/api'

// categoriesApi: seeded category lookup for obligation and expense forms
// no user ownership, categories are global defaults seeded by the backend type filter defaults to ALL if not provided

// planned endpoints:
// GET /api/v1/categories?type=OBLIGATION|EXPENSE|ALL

export async function getCategories(type?: 'OBLIGATION' | 'EXPENSE' | 'ALL'){
    const query = type? `?type=${type}` : ''
    return apiFetch(`/categories${query}`)
}