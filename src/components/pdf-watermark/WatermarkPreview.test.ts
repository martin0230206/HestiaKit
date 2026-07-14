// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WatermarkPreview from './WatermarkPreview.vue'

describe('WatermarkPreview', () => {
  it('補償 CSS 與 PDF 的 Y 軸方向，讓預覽角度符合輸出', () => {
    const wrapper = mount(WatermarkPreview, {
      props: {
        isPreviewPageSelected: true,
        horizontalSpacingPercent: 20,
        layout: 'center',
        opacityPercent: 25,
        pageCount: 1,
        previewAspectRatio: 612 / 792,
        previewBaseUrl: 'blob:preview',
        previewMessage: '',
        previewPageNumber: 1,
        previewState: 'ready',
        rotation: -45,
        sizePercent: 45,
        verticalSpacingPercent: 30,
        watermarkColor: '#b42318',
        watermarkImageUrl: '',
        watermarkKind: 'text',
        watermarkText: '機密文件',
      },
    })

    expect(wrapper.get('span.font-bold').attributes('style')).toContain('rotate(45deg)')
  })

  it('預覽未在指定頁碼內的頁面時隱藏浮水印並標示不會套用', () => {
    const wrapper = mount(WatermarkPreview, {
      props: {
        isPreviewPageSelected: false,
        horizontalSpacingPercent: 20,
        layout: 'center',
        opacityPercent: 25,
        pageCount: 5,
        previewAspectRatio: 612 / 792,
        previewBaseUrl: 'blob:preview',
        previewMessage: '',
        previewPageNumber: 2,
        previewState: 'ready',
        rotation: -45,
        sizePercent: 45,
        verticalSpacingPercent: 30,
        watermarkColor: '#b42318',
        watermarkImageUrl: '',
        watermarkKind: 'text',
        watermarkText: '機密文件',
      },
    })

    expect(wrapper.get('.pdf-watermark-preview__page').text()).not.toContain('機密文件')
    expect(wrapper.text()).toContain('此頁不套用浮水印')
  })

  it('分別反映水平與垂直平鋪間距', () => {
    const wrapper = mount(WatermarkPreview, {
      props: {
        horizontalSpacingPercent: 20,
        isPreviewPageSelected: true,
        layout: 'tile',
        opacityPercent: 25,
        pageCount: 1,
        previewAspectRatio: 612 / 792,
        previewBaseUrl: 'blob:preview',
        previewMessage: '',
        previewPageNumber: 1,
        previewState: 'ready',
        rotation: -45,
        sizePercent: 45,
        verticalSpacingPercent: 30,
        watermarkColor: '#b42318',
        watermarkImageUrl: '',
        watermarkKind: 'text',
        watermarkText: '機密文件',
      },
    })

    const tileGrid = wrapper
      .findAll('div')
      .find((element) => element.attributes('style')?.includes('grid-template-columns'))
    expect(tileGrid?.attributes('style')).toContain('column-gap: 1.3%')
    expect(tileGrid?.attributes('style')).toContain('row-gap: 1.7%')
  })
})
