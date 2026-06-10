import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import PasswordGeneratorView from '../views/PasswordGeneratorView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'password-generator',
          component: PasswordGeneratorView,
        },
      ],
    },
  ],
})
