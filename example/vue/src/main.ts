import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import TopPage from './pages/TopPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/en/top' },
    { path: '/:locale/top', component: TopPage },
  ],
})

const app = createApp(App)
app.use(router)
app.mount('#app')
