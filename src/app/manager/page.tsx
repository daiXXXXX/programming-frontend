'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ManagerPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/manager/my-classes')
  }, [router])

  return null
}
