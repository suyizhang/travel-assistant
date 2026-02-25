import type { UserConfigExport } from "@tarojs/cli"

export default {
  mini: {},
  h5: {
    devServer: {
      proxy: {
        '/api': {
          target: 'https://suyi.fun',
          changeOrigin: true,
        }
      }
    }
  }
} satisfies UserConfigExport<'vite'>
