import { useNavigate } from 'react-router-dom'
import Header from '@cloudscape-design/components/header'
import Box from '@cloudscape-design/components/box'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { copy } from '../shared/copy'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <SpaceBetween size="l">
      <Header variant="h1">{copy.notFoundHeading}</Header>
      <Box variant="p">{copy.notFoundBody}</Box>
      <Link
        onFollow={(e) => {
          e.preventDefault()
          navigate('/')
        }}
        href="/"
      >
        {copy.notFoundLink}
      </Link>
    </SpaceBetween>
  )
}
