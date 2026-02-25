export default defineAppConfig({
  entryPagePath: 'pages/index/index',
  pages: [
    'pages/index/index',
    'pages/chat/index',
    'pages/login/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#faf7f2',
    navigationBarTitleText: '旅伴',
    navigationBarTextStyle: 'black'
  },
  requiredPrivateInfos: ['getLocation']
})
