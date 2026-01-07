import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '0odjb7zx',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/cli#auto-updates
     */
    autoUpdates: true,
    appId: 'gdqccmm1k5a3q3cga9b6q6kq',
  }
})
