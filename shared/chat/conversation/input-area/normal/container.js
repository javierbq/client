// @flow
import * as I from 'immutable'
import * as Constants from '../../../../constants/chat2'
import * as Types from '../../../../constants/types/chat2'
import * as Chat2Gen from '../../../../actions/chat2-gen'
import * as RouteTree from '../../../../actions/route-tree'
import HiddenString from '../../../../util/hidden-string'
import Input from '.'
import {
  compose,
  withHandlers,
  withStateHandlers,
  withProps,
  lifecycle,
  connect,
  // isMobile,
} from '../../../../util/container'
// import throttle from 'lodash/throttle'
import {chatTab} from '../../../../constants/tabs'
import type {TypedState, Dispatch} from '../../../../util/container'

type OwnProps = {
  focusInputCounter: number,
  onScrollDown: () => void,
}

// We used to store this in the route state but thats so complicated. We just want a map of id => text if we haven't sent
const unsentText = {}

const mapStateToProps = (state: TypedState) => {
  const _conversationIDKey = Constants.getSelectedConversation(state)
  const editingOrdinal = Constants.getEditingOrdinal(state, _conversationIDKey)
  const _editingMessage = editingOrdinal
    ? Constants.getMessageMap(state, _conversationIDKey).get(editingOrdinal)
    : null
  const _you = state.config.username || ''

  return {
    _you,
    _conversationIDKey,
    _editingMessage,
    _meta: Constants.getMeta(state, _conversationIDKey),
    typing: Constants.getTyping(state, _conversationIDKey),
  }
}

const mapDispatchToProps = (dispatch: Dispatch): * => ({
  // onAttach: (selectedConversation, inputs: Array<any [> Types.AttachmentInput <]>) =>
  // dispatch(
  // RouteTree.navigateAppend([
  // {props: {conversationIDKey: selectedConversation, inputs}, selected: 'attachmentInput'},
  // ])
  // ),
  _onEditLastMessage: (conversationIDKey: Types.ConversationIDKey, you: string) =>
    dispatch(
      Chat2Gen.createMessageSetEditing({
        conversationIDKey,
        editLastUser: you,
        ordinal: null,
      })
    ),
  _onEditMessage: (message: Types.Message, body: string) =>
    dispatch(
      Chat2Gen.createMessageEdit({
        conversationIDKey: message.conversationIDKey,
        ordinal: message.ordinal,
        text: new HiddenString(body),
      })
    ),
  _onPostMessage: (conversationIDKey: Types.ConversationIDKey, text: string) =>
    dispatch(Chat2Gen.createMessageSend({conversationIDKey, text: new HiddenString(text)})),
  // onShowEditor: (message: Types.Message) => {
  // TODO
  // dispatch(ChatGen.createShowEditor({message}))
  // },
  _onStoreInputText: (conversationIDKey: Types.ConversationIDKey, inputText: string) =>
    dispatch(
      RouteTree.setRouteState(I.List([chatTab, conversationIDKey]), {inputText: new HiddenString(inputText)})
    ),
  _onUpdateTyping: (conversationIDKey: Types.ConversationIDKey, typing: boolean) => {
    // dispatch(ChatGen.createUpdateTyping({conversationIDKey, typing})),
  },
  _onCancelEditing: (conversationIDKey: Types.ConversationIDKey) =>
    dispatch(Chat2Gen.createMessageSetEditing({conversationIDKey, ordinal: null})),
})

const mergeProps = (stateProps, dispatchProps, ownProps: OwnProps) => {
  // const updateTyping = (typing: boolean) => {
  // if (stateProps.selectedConversationIDKey) {
  // dispatchProps.onUpdateTyping(stateProps.selectedConversationIDKey, typing)
  // }
  // }
  // const wrappedTyping = throttle(updateTyping, 5000)

  return {
    _conversationIDKey: stateProps._conversationIDKey,
    _editingMessage: stateProps._editingMessage,
    // ...stateProps,
    // ...dispatchProps,
    // ...ownProps,
    isEditing: !!stateProps._editingMessage,
    channelName: stateProps._meta.channelname,
    focusInputCounter: ownProps.focusInputCounter,
    // hasResetUsers: !stateProps._meta.resetParticipants.isEmpty(),
    isLoading: false,
    // isPreview: false, // TODO
    // teamname: stateProps._meta.teamname,
    typing: stateProps.typing,
    // onAttach: (inputs: Array<any [> Types.AttachmentInput <]>) =>
    // dispatchProps.onAttach(stateProps.selectedConversationIDKey, inputs),
    onEditLastMessage: () => dispatchProps._onEditLastMessage(stateProps._conversationIDKey, stateProps._you),
    _onSubmit: (text: string) => {
      if (stateProps._editingMessage) {
        dispatchProps._onEditMessage(stateProps._editingMessage, text)
      } else {
        dispatchProps._onPostMessage(stateProps._conversationIDKey, text)
      }
      ownProps.onScrollDown()
    },
    onUpdateTyping: (typing: boolean) => {
      // if (!typing) {
      // // Update the not-typing status immediately, even if we're throttled.
      // wrappedTyping.cancel()
      // updateTyping(typing)
      // } else {
      // wrappedTyping(typing)
      // }
    },
    onJoinChannel: () => dispatchProps.onJoinChannel(stateProps._conversationIDKey),
    onLeaveChannel: () => {
      dispatchProps.onLeaveChannel(stateProps._conversationIDKey, stateProps._meta.teamname)
    },
    onCancelEditing: () => dispatchProps._onCancelEditing(stateProps._conversationIDKey),
  }
}

export default compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withStateHandlers(
    {
      mentionFilter: '',
      mentionPopupOpen: false,
      text: '',
    },
    {
      _setText: () => (text: string) => ({text}),
      // setMentionFilter: () => (mentionFilter: string) => ({mentionFilter}),
      // setMentionPopupOpen: () => (mentionPopupOpen: boolean) => ({mentionPopupOpen}),
    }
  ),
  withProps(props => ({
    setText: (text: string, skipUnsentSaving?: boolean) => {
      props._setText(text)
      if (!skipUnsentSaving) {
        unsentText[Types.conversationIDKeyToString(props._conversationIDKey)] = text
      }
    },
  })),
  withProps(props => ({
    onSubmit: (text: string) => {
      props._onSubmit(text)
      props.setText('')
    },
  })),
  withHandlers(props => {
    let input
    return {
      inputBlur: props => () => input && input.blur(),
      inputFocus: props => () => input && input.focus(),
      inputGetRef: props => () => input,
      inputSelections: props => () => (input && input.selections()) || {},
      inputSetRef: props => i => (input = i),
    }
  }),
  lifecycle({
    componentDidUpdate(prevProps) {
      if (this.props.focusInputCounter !== prevProps.focusInputCounter) {
        this.props.inputFocus()
      }
    },
    componentWillReceiveProps(nextProps) {
      // Fill in the input with an edit or unsent text
      if (this.props._editingMessage !== nextProps._editingMessage) {
        const text =
          nextProps._editingMessage && nextProps._editingMessage.type === 'text'
            ? nextProps._editingMessage.text.stringValue()
            : ''
        this.props.setText('') // blow away any unset stuff if we go into an edit, else you edit / cancel / switch tabs and come back and you see the unsent value
        this.props.setText(text, true)
      } else if (this.props._conversationIDKey !== nextProps._conversationIDKey) {
        const text = unsentText[Types.conversationIDKeyToString(nextProps._conversationIDKey)] || ''
        this.props.setText(text, true)
      }

      if (nextProps.isEditing && !this.props.isEditing) {
        this.props.inputFocus()
      }
    },
  })
)(Input)