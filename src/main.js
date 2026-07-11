import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'
import { initAnalytics, trackPageview } from './analytics'

const app = createApp(App)

app.directive('reveal', {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-revealed')
          observer.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    observer.observe(el)
  },
})

initAnalytics()
router.afterEach((to) => trackPageview(to.fullPath))

app.use(router).mount('#app')
