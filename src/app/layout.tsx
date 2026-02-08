import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/context/SidebarContext";
import MainContent from "@/components/MainContent";
import { BackgroundJobsInitializer } from "@/components/BackgroundJobsInitializer";
import { AuthProvider } from "@/context/AuthContext";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <AuthProvider>
          <AuthLoadingScreen>
            <BackgroundJobsInitializer />
            <SidebarProvider>
              <Navbar />
              <Sidebar />
              <MainContent>{children}</MainContent>
            </SidebarProvider>
          </AuthLoadingScreen>
        </AuthProvider>
      </body>
    </html>
  );
}

