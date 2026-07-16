// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Base64HistoryDrawer from './Base64HistoryDrawer.vue'

describe('Base64HistoryDrawer', () => {
  it('只在滑入期間展開，點擊不會固定展開', async () => {
    const wrapper = mount(Base64HistoryDrawer, {
      props: {
        history: [],
      },
      global: {
        stubs: {
          ScrollArea: {
            template: '<div><slot /></div>',
          },
          Teleport: true,
        },
      },
    })

    const railButton = wrapper.get('button[aria-controls="base64-history-drawer-content"]')

    expect(wrapper.get('aside').attributes('style')).toContain('translateX(calc(100% - 3.25rem))')

    await wrapper.get('aside').trigger('mouseenter')
    expect(wrapper.get('aside').attributes('style')).toContain('translateX(0)')

    await wrapper.get('aside').trigger('mouseleave')
    expect(wrapper.get('aside').attributes('style')).toContain('translateX(calc(100% - 3.25rem))')

    await wrapper.get('aside').trigger('mouseenter')
    await wrapper.get('aside').trigger('pointerdown')
    await railButton.trigger('click')
    await wrapper.get('aside').trigger('pointerup')
    await wrapper.get('aside').trigger('mouseleave')
    expect(wrapper.get('aside').attributes('style')).toContain('translateX(calc(100% - 3.25rem))')
  })
})
