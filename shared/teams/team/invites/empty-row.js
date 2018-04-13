// @flow
import * as React from 'react'
import {Box, Text} from '../../../common-adapters'
import {globalColors, globalMargins, globalStyles} from '../../../styles'

export default () => (
  <Box style={{...globalStyles.flexBoxRow, ...globalStyles.flexBoxCenter}}>
    <Text
      type="BodySmall"
      key="noRequestsOrInvites"
      style={{
        color: globalColors.black_40,
        paddingTop: globalMargins.large,
      }}
    >
      This team has no pending invites.
    </Text>
  </Box>
)
