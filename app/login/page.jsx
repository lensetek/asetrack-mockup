import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  return <LoginForm next={sp?.next || '/'} />;
}