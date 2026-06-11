import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import { tools } from '../tools'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: tools.map((tool) => ({
        path: tool.path,
        name: tool.name,
        component: tool.component,
      })),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})
