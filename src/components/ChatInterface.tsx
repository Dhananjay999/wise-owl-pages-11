import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Upload, 
  FileText, 
  Globe, 
  Paperclip, 
  X,
  Bot,
  User,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  attachments?: File[];
  metadata?: {
    sources: Array<{
      name: string; // PDF name or web URL
      pageNumber?: number;
      title?: string;
      type: 'pdf' | 'web';
    }>;
  };
}

interface ChatMode {
  id: 'pdf' | 'web';
  label: string;
  icon: typeof FileText;
  description: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your AI study assistant. I can help you with questions from your uploaded PDFs or search the web for academic information. How can I assist you today?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedMode, setSelectedMode] = useState<'pdf' | 'web'>('pdf');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatModes: ChatMode[] = [
    {
      id: 'pdf',
      label: 'From PDF',
      icon: FileText,
      description: 'Ask questions about your uploaded documents'
    },
    {
      id: 'web',
      label: 'Web Results',
      icon: Globe,
      description: 'Search the web for academic information'
    }
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: selectedMode === 'pdf' 
          ? `I've analyzed your ${attachedFiles.length > 0 ? 'uploaded documents' : 'previous PDFs'} and found relevant information about "${inputValue}". Here's what I found...`
          : `I've searched the web for academic information about "${inputValue}". Here are the most relevant findings...`,
        timestamp: new Date(),
        metadata: selectedMode === 'pdf' 
          ? {
              sources: [
                {
                  name: attachedFiles.length > 0 ? attachedFiles[0].name : 'research_paper.pdf',
                  pageNumber: Math.floor(Math.random() * 20) + 1,
                  title: 'Academic Research Paper',
                  type: 'pdf'
                },
                {
                  name: 'academic_study.pdf',
                  pageNumber: Math.floor(Math.random() * 15) + 5,
                  title: 'Related Academic Study',
                  type: 'pdf'
                },
                {
                  name: 'methodology_guide.pdf',
                  pageNumber: Math.floor(Math.random() * 30) + 10,
                  title: 'Research Methodology Guide',
                  type: 'pdf'
                }
              ]
            }
          : {
              sources: [
                {
                  name: 'https://scholar.google.com/example-research-1',
                  title: 'Academic Study on ' + inputValue,
                  type: 'web'
                },
                {
                  name: 'https://researchgate.net/publication/example-2',
                  title: 'Research Publication - ' + inputValue + ' Analysis',
                  type: 'web'
                },
                {
                  name: 'https://arxiv.org/abs/example-3',
                  title: 'Latest Research Paper on ' + inputValue,
                  type: 'web'
                }
              ]
            }
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    setAttachedFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMetadata = (messageId: string) => {
    setShowMetadata(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  return (
    <section id="chat" className="py-20 bg-gradient-to-br from-background to-academic-light-rose/10">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Your Study Session
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your documents or ask questions about any academic topic
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden shadow-xl">
            {/* Chat Mode Selection */}
            <div className="border-b p-4 bg-muted/30">
              <div className="flex flex-col sm:flex-row gap-3">
                {chatModes.map((mode) => {
                  const IconComponent = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 flex-1",
                        selectedMode === mode.id
                          ? "bg-academic-teal text-white shadow-md"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs opacity-80">{mode.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
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
                      "max-w-xs sm:max-w-md p-3 rounded-lg",
                      message.type === 'user'
                        ? "bg-academic-teal text-white"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {/* Metadata toggle button for bot messages */}
                    {message.type === 'bot' && message.metadata && (
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <button
                          onClick={() => toggleMetadata(message.id)}
                          className="flex items-center gap-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <Info className="w-3 h-3" />
                          <span>
                            {showMetadata[message.id] ? 'Hide' : 'Show'} sources ({message.metadata.sources.length})
                          </span>
                        </button>
                        
                        {/* Metadata display when expanded */}
                        {showMetadata[message.id] && (
                          <div className="mt-2 space-y-1">
                            {message.metadata.sources.map((source, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs opacity-70 bg-background/20 p-2 rounded">
                                {source.type === 'web' ? (
                                  <>
                                    <Globe className="w-3 h-3 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{source.title}</div>
                                      <div className="truncate text-xs opacity-60">{source.name}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{source.title}</div>
                                      <div className="truncate text-xs opacity-60">
                                        {source.name} • Page {source.pageNumber}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs opacity-80">
                            <FileText className="w-3 h-3" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-academic-rose flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-academic-teal to-academic-burgundy flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-academic-teal rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-academic-burgundy rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-academic-rose rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File attachments preview */}
            {attachedFiles.length > 0 && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span className="text-xs">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="hover:bg-background/50 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      selectedMode === 'pdf'
                        ? "Ask a question about your uploaded documents..."
                        : "Search for academic information on the web..."
                    }
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  {selectedMode === 'pdf' && (
                    <Button
                      variant="academicOutline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="academic"
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() && attachedFiles.length === 0}
                    className="h-10 w-10"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    </section>
  );
};

export default ChatInterface;