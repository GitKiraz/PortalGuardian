import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand size="lg" />
        </div>
        {children}
      </div>
    </main>
  );
}
