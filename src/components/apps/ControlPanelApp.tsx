import './ControlPanelApp.css'
import type { AppProps } from '../../types'
import { useControlPanelModel } from './ControlPanelApp.model'
import { ControlPanelView } from './ControlPanelApp.view'

export function ControlPanelApp({ payload }: AppProps) {
  return <ControlPanelView model={useControlPanelModel(payload)} />
}
