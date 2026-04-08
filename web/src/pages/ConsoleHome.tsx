import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import { copy } from '../shared/copy'

export default function ConsoleHome() {
  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={copy.consoleHomeDescription}>
        {copy.consoleHomeHeading}
      </Header>
      <Container>
        <Box variant="p">
          Use the sidebar or the search bar above to navigate to a service.
        </Box>
      </Container>
    </SpaceBetween>
  )
}
