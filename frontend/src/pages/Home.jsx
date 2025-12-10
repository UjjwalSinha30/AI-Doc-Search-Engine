export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Welcome to AI Search Engine</h1>

      <a href="/login" className="btn btn-primary">Login</a>
      <a href="/register" className="btn btn-secondary">Register</a>
    </div>
  )
}
