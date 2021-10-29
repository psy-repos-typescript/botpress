import renderer, { defaultMessageConfig } from '@botpress/messaging-components'
import { IO } from 'botpress/sdk'
import { Collapsible } from 'botpress/shared'
import cx from 'classnames'
import React, { FC } from 'react'
import style from '../../style.scss'
import '../../botpress.css'

const renderPayload = (event: IO.Event) => {
  const { payload } = event
  try {
    return (
      <Collapsible name={`type: ${payload.type}`}>
        <div>{JSON.stringify(payload, null, 2)}</div>
      </Collapsible>
    )
  } catch (error) {
    return null
  }
}

const translateMessage = (type: string, payload: any) => {
  switch (type) {
    case 'carousel':
      return {
        carousel: {
          elements: payload.items.map(i => ({
            ...i,
            picture: i.image,
            buttons: i.actions.map(a => ({
              ...a,
              type: a.action
            }))
          }))
        }
      }
    case 'video':
      return { ...payload, url: payload.video }
    case 'image':
      return { ...payload, url: payload.image }
    case 'audio':
      return { ...payload, url: payload.audio }
    default:
      return payload
  }
}

//TODO: To support complex content types, export message from webchat in ui-shared lite and show it here
export const Message: FC<IO.StoredEvent> = props => {
  const { type, payload } = props.event
  const newPayload = translateMessage(type, payload)

  return (
    <div className={cx(style.messageContainer, props.direction === 'incoming' ? style.user : style.bot)}>
      <div className={cx(style.message)}>
        {/* {preview && <span>{preview}</span>} */}
        <ErrorBoundary>{renderer.render({ type, payload: newPayload, config: defaultMessageConfig })}</ErrorBoundary>
        {/* {!preview && renderPayload(props.event)} */}
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  state: {
    hasError: boolean
  }
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {}

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>
    }

    return this.props.children
  }
}
