import { useEffect } from "react";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();

  // SEO
  useEffect(() => {
    document.title = "Login or Sign Up | StudyAssistant";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Login or sign up to StudyAssistant to access your AI study tools.");
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Login or sign up to StudyAssistant to access your AI study tools.";
      document.head.appendChild(m);
    }
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const href = `${window.location.origin}/auth`;
    if (canonical) canonical.href = href; else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigate("/", { replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <h1 className="sr-only">Login or Sign Up</h1>
      <AuthModal isOpen={true} onClose={() => navigate("/", { replace: true })} />
    </main>
  );
};

export default AuthPage;
