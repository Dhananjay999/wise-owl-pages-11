import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/PDFViewer";
import { 
  Send, 
  Upload, 
  FileText, 
  Globe, 
  Paperclip, 
  X,
  Bot,
  User,
  Info,
  Expand,
  Minimize
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEARCH_MODES } from "@/constants";
import { apiService } from "@/services";
import { 
  Message, 
  ChatMode
} from "@/types";
import { 
  createMessageId, 
  mapAPIMetadataToSourceInfo,
  isValidMessage,
  isValidFile 
} from "@/utils";

const ChatInterface = () => {
  // Separate chat histories for each mode
  const [pdfMessages, setPdfMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your AI study assistant. Upload your PDFs and ask me questions about your documents. How can I help you study today?',
      timestamp: new Date(),
    }
  ]);
  
  const [webMessages, setWebMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your AI study assistant. I can search the web for academic information and research. What would you like to learn about today?',
      timestamp: new Date(),
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [selectedMode, setSelectedMode] = useState<'pdf' | 'web'>('pdf');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<Record<string, boolean>>({});
  const [webMetadata, setWebMetadata] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current mode's data
  const currentMessages = selectedMode === 'pdf' ? pdfMessages : webMessages;
  const setCurrentMessages = selectedMode === 'pdf' ? setPdfMessages : setWebMessages;
  const isLoading = selectedMode === 'pdf' ? pdfLoading : webLoading;
  const setIsLoading = selectedMode === 'pdf' ? setPdfLoading : setWebLoading;
  const showMetadata = selectedMode === 'pdf' ? pdfMetadata : webMetadata;
  const setShowMetadata = selectedMode === 'pdf' ? setPdfMetadata : setWebMetadata;

  const chatModes: ChatMode[] = [
    {
      id: 'pdf',
      label: 'From PDF',
      icon: FileText,
      description: 'Ask questions about your uploaded documents',
      searchMode: 'study_material'
    },
    {
      id: 'web',
      label: 'Web Results',
      icon: Globe,
      description: 'Search the web for academic information',
      searchMode: 'web_search'
    }
  ];

  const handleSendMessage = async () => {
    if (!isValidMessage(inputValue) && attachedFiles.length === 0) return;

    const newMessage: Message = {
      id: createMessageId(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    setCurrentMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const searchMode = chatModes.find(mode => mode.id === selectedMode)?.searchMode || SEARCH_MODES.STUDY_MATERIAL;
      const data = await apiService.sendChatMessage(inputValue, searchMode);
      
      const botResponse: Message = {
        id: createMessageId(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        metadata: {
          sources: data.metadata.map(mapAPIMetadataToSourceInfo)
        }
      };

      setCurrentMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error calling API:', error);
      
      const errorResponse: Message = {
        id: createMessageId(),
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setCurrentMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Selected files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validPdfFiles = files.filter(isValidFile);
    console.log('Valid PDF files:', validPdfFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (validPdfFiles.length === 0) {
      console.log('No valid PDF files found');
      return;
    }

    setUploadLoading(true);
    
    try {
      console.log('Starting file upload for:', validPdfFiles.length, 'files');
      // Upload files to server
      await apiService.uploadFiles(validPdfFiles);
      console.log('File upload completed successfully');
      
      // Only add files to attached files and show PDF viewer after successful upload
      setAttachedFiles(prev => [...prev, ...validPdfFiles]);
      
      // Set the first PDF as the current PDF for viewing
      if (!currentPDF) {
        setCurrentPDF(validPdfFiles[0]);
        setShowPDFViewer(true);
      }
      
      // Add success message
      const uploadMessage: Message = {
        id: createMessageId(),
        type: 'bot',
        content: `Successfully uploaded ${validPdfFiles.length} PDF file(s). You can now ask questions about your documents.`,
        timestamp: new Date()
      };
      
      setCurrentMessages(prev => [...prev, uploadMessage]);
      
    } catch (error) {
      console.error('File upload failed:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: createMessageId(),
        type: 'bot',
        content: 'Failed to upload PDF file(s). Please try again.',
        timestamp: new Date()
      };
      
      setCurrentMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploadLoading(false);
    }
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
    <section 
      id="chat" 
      className={cn(
        "bg-gradient-to-br from-background to-academic-light-rose/10 transition-all duration-500",
        isFullscreen 
          ? "fixed inset-0 z-50 p-4" 
          : "py-20"
      )}
    >
      <div className={cn("transition-all duration-500", isFullscreen ? "h-full" : "container")}>
        {!isFullscreen && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Your Study Session
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your documents or ask questions about any academic topic
            </p>
          </div>
        )}

        <div className={cn("transition-all duration-500", isFullscreen ? "h-full" : "max-w-7xl mx-auto")}>
          {selectedMode === 'pdf' && (showPDFViewer || currentPDF) ? (
            <div className={cn("flex gap-4 transition-all duration-500", isFullscreen ? "h-full" : "")}>
              {/* PDF Viewer */}
              <div className={cn("transition-all duration-500", showPDFViewer ? "w-1/2" : "w-0 overflow-hidden")}>
                <PDFViewer
                  file={currentPDF}
                  isVisible={showPDFViewer}
                  onToggleVisibility={() => setShowPDFViewer(!showPDFViewer)}
                  className={cn("transition-all duration-500", isFullscreen ? "h-full" : "h-[600px]")}
                />
              </div>
              
              {/* Chat Interface */}
              <div className={cn("transition-all duration-500", showPDFViewer ? "w-1/2" : "w-full")}>
                <Card className={cn("overflow-hidden shadow-xl transition-all duration-500", isFullscreen ? "h-full flex flex-col" : "")}>
                  {/* Chat Mode Selection */}
                  <div className="border-b p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row gap-3 flex-1">
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
                      <Button
                        variant="academicOutline"
                        size="icon"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="ml-4 h-10 w-10 flex-shrink-0"
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                      >
                        {isFullscreen ? (
                          <Minimize className="w-4 h-4" />
                        ) : (
                          <Expand className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className={cn("overflow-y-auto p-4 space-y-4 transition-all duration-500", isFullscreen ? "flex-1" : "h-96")}>
                    {currentMessages.map((message) => (
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
                          disabled={uploadLoading}
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
                            disabled={uploadLoading}
                            className="h-10 w-10"
                          >
                            {uploadLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Paperclip className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="academic"
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={(!isValidMessage(inputValue) && attachedFiles.length === 0) || uploadLoading}
                          className="h-10 w-10"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className={cn("overflow-hidden shadow-xl transition-all duration-500", isFullscreen ? "h-full flex flex-col" : "")}>
              {/* Chat Mode Selection */}
              <div className="border-b p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-3 flex-1">
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
                  <Button
                    variant="academicOutline"
                    size="icon"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="ml-4 h-10 w-10 flex-shrink-0"
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Expand className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className={cn("overflow-y-auto p-4 space-y-4 transition-all duration-500", isFullscreen ? "flex-1" : "h-96")}>
                {currentMessages.map((message) => (
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
                      disabled={uploadLoading}
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
                        disabled={uploadLoading}
                        className="h-10 w-10"
                      >
                        {uploadLoading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="academic"
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={(!isValidMessage(inputValue) && attachedFiles.length === 0) || uploadLoading}
                      className="h-10 w-10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

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