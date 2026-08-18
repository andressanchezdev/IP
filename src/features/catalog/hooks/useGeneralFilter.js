import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, useUi } from '@/app/providers'
import { getGeneralFilter, readGeneralFilterMemory } from '@/features/catalog/api/generalApi'

const INITIAL_STATE = {
  categorias: [],
  marcas: [],
  modelos: [],
  status: 'idle',
  error: '',
}

function listsFromResult(result) {
  return {
    categorias: result.categorias ?? [],
    marcas: result.marcas ?? [],
    modelos: result.modelos ?? [],
  }
}

/**
 * GET /api/v1/general/filter al abrir Filtrar.
 * JSON completo (categorías, marcas, modelos) en memoria (3 min).
 * Las barras buscan sobre esa copia, sin más GET.
 */
export function useGeneralFilter() {
  const { tokenAccess } = useAuth()
  const { drawerOpen, drawerType } = useUi()
  const [state, setState] = useState(INITIAL_STATE)
  const requestIdRef = useRef(0)

  const isFilterDrawerOpen = drawerOpen && drawerType === 'filter'

  const fetchFilterOptions = useCallback(async ({ signal } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!tokenAccess) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: 'Inicie sesión para cargar los filtros',
      })
      return
    }

    setState((current) => ({ ...current, status: 'loading', error: '' }))

    try {
      const result = await getGeneralFilter({
        token: tokenAccess,
        signal,
      })

      if (requestId !== requestIdRef.current) {
        return
      }

      setState({
        ...listsFromResult(result),
        status: 'success',
        error: '',
      })
    } catch (error) {
      if (error?.name === 'AbortError' || signal?.aborted || requestId !== requestIdRef.current) {
        return
      }

      const memory = readGeneralFilterMemory()
      if (memory) {
        setState({
          ...listsFromResult(memory),
          status: 'success',
          error: '',
        })
        return
      }

      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: error?.message || 'No se pudieron cargar los filtros',
      })
    }
  }, [tokenAccess])

  useEffect(() => {
    if (!isFilterDrawerOpen) {
      return undefined
    }

    const controller = new AbortController()
    fetchFilterOptions({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [isFilterDrawerOpen, fetchFilterOptions])

  return state
}
