const withLess = require('next-with-less')

/** @type {import('next').NextConfig} */
const nextConfig = {  
  // 直接使用 Next.js 内置 Route Handlers 提供 API，避免再转发到 Go 服务。
  reactStrictMode: true,
}

module.exports = withLess(nextConfig)
