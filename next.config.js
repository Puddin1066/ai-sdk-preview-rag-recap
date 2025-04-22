/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    COURTLISTENER_API_TOKEN: process.env.COURTLISTENER_API_TOKEN,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = '.';
    return config;
  },
};

module.exports = nextConfig; 