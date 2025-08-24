import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  User,
  Bot,
  Bookmark,
  Copy,
  Share2,
  FileDown,
  Volume2,
  Network,
  ChevronDown,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onScrollToBottom: () => void;
}

const ChatMessages = ({
  messages,
  isLoading,
  onScrollToBottom
}: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleSaveToNote = (content: string) => {
    // Implement save to note functionality
    console.log('Save to note:', content);
  };

  const handleGenerateAudio = (content: string) => {
    // Implement audio generation functionality
    console.log('Generate audio:', content);
  };

  const handleGenerateMindMap = (content: string) => {
    // Implement mind map generation functionality
    console.log('Generate mind map:', content);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3",
            message.type === 'user' ? "justify-end" : "justify-start"
          )}
        >
          {message.type === 'bot' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-academic-teal to-academic-burgundy flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}
          
          <div
            className={cn(
              "max-w-[280px] sm:max-w-md lg:max-w-lg p-4 rounded-lg",
              message.type === 'user'
                ? "bg-academic-teal text-white"
                : "bg-muted text-foreground"
            )}
          >
            {message.type === 'bot' ? (
              <div className="space-y-3">
                <div className="prose-chat">
                  <ReactMarkdown
                    components={{
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-academic-teal hover:underline"
                        >
                          {children}
                        </a>
                      ),
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => (
                        <code className="bg-background/50 px-1 py-0.5 rounded text-sm font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-background/50 p-2 rounded text-sm font-mono overflow-x-auto">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Action buttons for bot messages */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveToNote(message.content)}
                    className="h-7 px-2 text-xs hover:bg-background/50"
                  >
                    <Bookmark className="w-3 h-3 mr-1" />
                    Save to note
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyMessage(message.content)}
                    className="h-7 w-7 p-0 text-xs hover:bg-background/50"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-xs hover:bg-background/50"
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Advanced action buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveToNote(message.content)}
                    className="h-8 px-3 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Add note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateAudio(message.content)}
                    className="h-8 px-3 text-xs"
                  >
                    <Volume2 className="w-3 h-3 mr-1" />
                    Audio Overview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateMindMap(message.content)}
                    className="h-8 px-3 text-xs"
                  >
                    <Network className="w-3 h-3 mr-1" />
                    Mind map
                  </Button>
                </div>

                {/* Sources */}
                {message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div className="pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{message.metadata.sources.length} source{message.metadata.sources.length !== 1 ? 's' : ''}</span>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm">{message.content}</p>
            )}
          </div>

          {message.type === 'user' && (
            <div className="w-8 h-8 rounded-full bg-academic-rose flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-academic-teal to-academic-burgundy flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-academic-teal rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-academic-burgundy rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-academic-rose rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to bottom anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
