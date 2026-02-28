const withLess = require('next-with-less')

/** @type {import('next').NextConfig} */
const nextConfig = {  
  // API代理配置 - 转发到后端
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8080/uploads/:path*',
      },
    ]
  },
  
  // 其他配置
  reactStrictMode: true,
}

module.exports = withLess(nextConfig)
