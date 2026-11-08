/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:process.env.MODULE_NEXT_DIST_DIR||'.next',
  transpilePackages:['@smartapply/data'],
  experimental:{optimizePackageImports:['@phosphor-icons/react'],serverActions:{bodySizeLimit:'6mb'}},
  async rewrites(){const api=process.env.CV_MODULE_BACKEND_URL||'http://127.0.0.1:4300';return [{source:'/api/cv-module/:path*',destination:api+'/api/:path*'},{source:'/module-docs',destination:api+'/docs'},{source:'/module-docs/:path*',destination:api+'/docs/:path*'},{source:'/docs-json',destination:api+'/docs-json'}];},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {source:'/api/cv-module/cvs/:id/file',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'}]},
    ];
  },
};

export default nextConfig;
