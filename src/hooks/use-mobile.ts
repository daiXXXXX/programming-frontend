import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const MOBILE_BREAKPOINT = 720

/**
 * Returns whether the viewport is mobile-sized.
 * - `undefined` while not yet determined (SSR / first render)
 * - `true` / `false` once measured
 */
function useIsMobileRaw(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    mql.addEventListener("change", check)
    return () => mql.removeEventListener("change", check)
  }, [])

  return isMobile
}

/** Public convenience hook – returns a stable boolean (defaults to false before hydration). */
export function useIsMobile() {
  return useIsMobileRaw() ?? false
}

// Mobile route mapping
const MOBILE_ROUTES = [
  '/',
  '/login',
  '/workspace',
  '/profile',
  '/ranking',
]

/**
 * Hook to auto-redirect between mobile and desktop routes.
 * Mobile routes end with -mobile, e.g. /workspace -> /workspace-mobile
 *
 * IMPORTANT: does nothing until the viewport size has been measured,
 * so we never redirect based on the wrong initial value.
 */
export function useMobileRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobileRaw()          // ← raw value, may be undefined

  useEffect(() => {
    // Don't redirect until we know the actual viewport size
    if (isMobile === undefined) return

    const isMobileRoute = pathname.endsWith('-mobile') || pathname.includes('-mobile/')

    if (isMobile && !isMobileRoute) {
      // Desktop route but mobile viewport → redirect to mobile route
      if (pathname.startsWith('/submission/')) {
        const id = pathname.split('/').pop()
        router.replace(`/submission-mobile/${id}`)
        return
      }
      const matchedRoute = MOBILE_ROUTES.find(r => pathname === r)
      if (matchedRoute) {
        router.replace(matchedRoute === '/' ? '/home-mobile' : `${matchedRoute}-mobile`)
      }
    } else if (!isMobile && isMobileRoute) {
      // Mobile route but desktop viewport → redirect to desktop route
      if (pathname.startsWith('/submission-mobile/')) {
        const id = pathname.split('/').pop()
        router.replace(`/submission/${id}`)
        return
      }
      if (pathname === '/home-mobile') {
        router.replace('/')
        return
      }
      router.replace(pathname.replace('-mobile', ''))
    }
  }, [isMobile, pathname, router])

  return isMobile ?? false
}
