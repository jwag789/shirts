import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import CollectionsPage from './pages/CollectionsPage.vue'
import CollectionDetailPage from './pages/CollectionDetailPage.vue'
import ProductDetailPage from './pages/ProductDetailPage.vue'
import CheckoutSuccessPage from './pages/CheckoutSuccessPage.vue'
import CheckoutCancelPage from './pages/CheckoutCancelPage.vue'
import OrderLookupPage from './pages/OrderLookupPage.vue'
import SharedDesignPage from './pages/SharedDesignPage.vue'
import MyDesignsPage from './pages/MyDesignsPage.vue'
import PetPortraitPage from './pages/PetPortraitPage.vue'
import TeamShirtPage from './pages/TeamShirtPage.vue'
import SeoLandingPage from './pages/SeoLandingPage.vue'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/pet-portrait',
      name: 'pet-portrait',
      component: PetPortraitPage,
    },
    {
      path: '/team-shirt',
      name: 'team-shirt',
      component: TeamShirtPage,
    },
    {
      path: '/collections',
      name: 'collections',
      component: CollectionsPage,
    },
    {
      path: '/collections/:slug',
      name: 'collection',
      component: CollectionDetailPage,
      props: true,
    },
    {
      path: '/products/:slug',
      name: 'product',
      component: ProductDetailPage,
      props: true,
    },
    {
      path: '/info/:slug',
      name: 'seo-landing',
      component: SeoLandingPage,
      props: true,
    },
    {
      path: '/orders',
      name: 'order-lookup',
      component: OrderLookupPage,
    },
    {
      path: '/d/:id',
      name: 'shared-design',
      component: SharedDesignPage,
    },
    {
      path: '/my-designs',
      name: 'my-designs',
      component: MyDesignsPage,
    },
    {
      path: '/checkout/success',
      name: 'checkout-success',
      component: CheckoutSuccessPage,
    },
    {
      path: '/checkout/cancel',
      name: 'checkout-cancel',
      component: CheckoutCancelPage,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 24 }
    }

    return { top: 0, behavior: 'smooth' }
  },
})

export default router
