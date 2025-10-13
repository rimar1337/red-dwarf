import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/callback/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const redirectPath = sessionStorage.getItem('postLoginRedirect') || '/';
  navigate({to:redirectPath})
  sessionStorage.removeItem('postLoginRedirect');
  return <div>Hello "/callback/"!</div>
}
