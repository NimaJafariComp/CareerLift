import Sidebar from "@/components/Sidebar";
import OllamaStatus from "@/components/OllamaStatus";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12 fade-in">
          {children}
        </div>
      </div>
      <OllamaStatus />
    </>
  );
}
