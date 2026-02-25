export default defineAppConfig({
  entryPagePath: 'pages/index/index',
  pages: [
    'pages/index/index',
    'pages/chat/index',
    'pages/login/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#4F46E5',
    navigationBarTitleText: '旅伴',
    navigationBarTextStyle: 'white'
  }
})
