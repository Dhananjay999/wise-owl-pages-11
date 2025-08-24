import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain,
  User,
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMode, User as UserType } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ChatHeaderProps {
  selectedMode: 'pdf' | 'web';
  chatModes: ChatMode[];
  onModeChange: (mode: 'pdf' | 'web') => void;
  isAuthenticated: boolean;
  user: UserType | null;
}

const ChatHeader = ({
  selectedMode,
  chatModes,
  onModeChange,
  isAuthenticated,
  user
}: ChatHeaderProps) => {
  return (
    <div className="border-b bg-card/30 backdrop-blur-sm">
      {/* Mode Selection Tabs */}
      <div className="flex items-center justify-between p-4">
        <div className="grid grid-cols-2 gap-4 w-full bg-gradient-to-r from-academic-teal/10 via-academic-burgundy/10 to-academic-rose/10 rounded-xl px-4 py-2 shadow-lg border border-border/20">
          {chatModes.map((mode) => {
            const IconComponent = mode.icon;
            return (
              <Button
                key={mode.id}
                variant="ghost"
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  "py-3 px-4 rounded-lg transition-all duration-300 font-medium",
                  selectedMode === mode.id
                    ? "bg-gradient-to-r from-academic-teal to-academic-burgundy text-white shadow-lg scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {mode.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Login Prompt Banner */}
      {!isAuthenticated && (
        <div className="border-t border-academic-teal/20 bg-gradient-to-r from-academic-teal/5 to-academic-burgundy/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-academic-teal/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-3 h-3 text-academic-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground leading-tight">
                  Save your chat history
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Login or sign up to save your conversations and access them later
                </p>
              </div>
            </div>
            <Button 
              variant="academic" 
              size="sm" 
              className="text-xs px-3 py-1 h-7 flex-shrink-0"
            >
              Login / Sign Up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
