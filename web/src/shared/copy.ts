export const copy = {
  brand: 'MiniStack',
  brandTagline: 'Local AWS Emulator',
  searchPlaceholder: 'Search services',
  searchEmpty: (q: string) => `No services match "${q}"`,
  searchNoServices:
    'No services are active. Start MiniStack with at least one service enabled.',
  sidebarHeader: 'Services',
  consoleHomeHeading: 'Console Home',
  consoleHomeDescription:
    'Browse and manage all resources in your local MiniStack emulator.',
  serviceHomeDescription: (name: string) =>
    `Resources managed by the ${name} emulator.`,
  serviceHomeEmptyHeading: 'No resources yet',
  serviceHomeEmptyBody:
    'Create resources via the AWS CLI or SDK pointed at http://localhost:4566, then refresh this page.',
  serviceHomeErrorHeading: 'Could not load resources',
  serviceHomeErrorBody: (name: string) =>
    `MiniStack returned an error while reading ${name} state. Check that the service is enabled and try again.`,
  serviceHomeErrorRetry: 'Try Again',
  notFoundHeading: 'Page not found',
  notFoundBody:
    'The page you are looking for does not exist in the MiniStack console.',
  notFoundLink: 'Go to Console Home',
  region: 'us-east-1',
  breadcrumbRoot: 'Console',
} as const
