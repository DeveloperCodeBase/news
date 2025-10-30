import LoginForm from '@/components/auth/login-form';

export const metadata = {
  title: 'ورود مدیران - Vista AI News',
  description: 'Sign in to manage AI news ingestion, review, and publication.'
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <LoginForm />
    </div>
  );
}
