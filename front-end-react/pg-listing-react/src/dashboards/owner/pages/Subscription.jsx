export default function Subscription({ user }) {
  return <section className="card"><h1>Subscription</h1><p>Current plan: {user?.subscriptionPlan || 'No active subscription'}</p><p>Online checkout is not configured. Contact your administrator to arrange a subscription.</p><a className="btn btn-primary" href="/dashboard/owner/notifications">Contact administrator</a></section>;
}
