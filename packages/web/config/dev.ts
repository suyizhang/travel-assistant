import type { UserConfigExport } from "@tarojs/cli"

export default {
  mini: {},
  h5: {
    devServer: {
      proxy: {
        '/api': {
          target: 'http://localhost:712',
          changeOrigin: true,
        }
      }
    }
  }
} satisfies UserConfigExport<'vite'>
