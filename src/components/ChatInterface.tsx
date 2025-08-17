import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/PDFViewer";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ReactMarkdown from "react-markdown";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Minimize,
  Brain,
  ChevronDown,
  RefreshCw,
  Sparkles,
  MessageSquare
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
import { useToast } from "@/hooks/use-toast";
import NewSessionDialog from "@/components/NewSessionDialog";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

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
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDF, setCurrentPDF] = useState<File | null>(null);
  const [showMobilePDF, setShowMobilePDF] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [rememberDeleteDecision, setRememberDeleteDecision] = useState(false);
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [isLoadingUploadedFiles, setIsLoadingUploadedFiles] = useState(false);
  const [isFilePanelExpanded, setIsFilePanelExpanded] = useState(false);
  const [showPreviewNotAvailable, setShowPreviewNotAvailable] = useState(false);
  const [previewNotAvailableFileName, setPreviewNotAvailableFileName] = useState('');
  const [showMobileFileSheet, setShowMobileFileSheet] = useState(false);
  const [showNewSessionConfirmation, setShowNewSessionConfirmation] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Get current mode's data
  const currentMessages = selectedMode === 'pdf' ? pdfMessages : webMessages;
  const setCurrentMessages = selectedMode === 'pdf' ? setPdfMessages : setWebMessages;
  const isLoading = selectedMode === 'pdf' ? pdfLoading : webLoading;
  const setIsLoading = selectedMode === 'pdf' ? setPdfLoading : setWebLoading;
  const showMetadata = selectedMode === 'pdf' ? pdfMetadata : webMetadata;
  const setShowMetadata = selectedMode === 'pdf' ? setPdfMetadata : setWebMetadata;

  // Fetch uploaded files on component mount
  useEffect(() => {
    const fetchUploadedFiles = async () => {
      if (selectedMode === 'pdf') {
        setIsLoadingUploadedFiles(true);
        try {
          const response = await apiService.getUploadedFiles();
          setUploadedFileNames(response.file_names);
        } catch (error) {
          console.error('Failed to fetch uploaded files:', error);
        } finally {
          setIsLoadingUploadedFiles(false);
        }
      }
    };

    fetchUploadedFiles();
  }, [selectedMode]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const chatModes: ChatMode[] = [
    {
      id: 'pdf',
      label: 'PDF Documents',
      icon: FileText,
      description: 'Ask questions about your uploaded documents',
      searchMode: 'study_material'
    },
    {
      id: 'web',
      label: 'Web Search',
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
      
      // Check if the response contains raw PDF text content and handle it appropriately
      let processedContent = data.answer;
      
      // If this is a PDF-related response and the content seems like raw extracted text,
      // provide a more user-friendly response
      if (selectedMode === 'pdf' && data.metadata.some(meta => meta.source === 'uploaded_pdf')) {
        // Check if the content looks like raw PDF text (very long, unformatted)
        if (data.answer.length > 1000 && !data.answer.includes('\n\n')) {
          processedContent = `I've analyzed your PDF document. The content appears to be ${data.answer.length} characters long. 

**Please ask specific questions about the PDF content**, such as:
- "What is the main topic of this document?"
- "Summarize the key points"
- "What are the main conclusions?"
- "Explain the methodology used"

I can help you understand and work with the content more effectively when you ask targeted questions.`;
        }
      }
      
      const botResponse: Message = {
        id: createMessageId(),
        type: 'bot',
        content: processedContent,
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
        if (isMobile) {
          setShowMobilePDF(true);
        } else {
          setShowPDFViewer(true);
        }
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

  const removeFile = async (index: number) => {
    const fileToDelete = attachedFiles[index];
    if (!fileToDelete) return;

    try {
      // Call API to delete file from server
      const response = await apiService.deleteFile(fileToDelete.name);
      
      // Remove from local state
      setAttachedFiles(prev => {
        const newFiles = prev.filter((_, i) => i !== index);
        
        // If the deleted file is the current PDF, close the viewer and clear current PDF
        if (currentPDF && prev[index] && currentPDF.name === prev[index].name) {
          setCurrentPDF(null);
          setShowPDFViewer(false);
          setShowMobilePDF(false);
        }
        
        return newFiles;
      });

      // Show success toast
      toast({
        title: "File Deleted Successfully",
        description: response.message,
        className: "bg-card/90 backdrop-blur-sm border-primary/20",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        className: "bg-destructive/90 backdrop-blur-sm border-destructive/20",
        duration: 2000,
      });
    }
  };

  const removeUploadedFileName = async (fileName: string) => {
    try {
      // Call API to delete file from server
      const response = await apiService.deleteFile(fileName);
      
      // Remove from local state
      setUploadedFileNames(prev => prev.filter(name => name !== fileName));

      // Show success toast
      toast({
        title: "File Deleted Successfully",
        description: response.message,
        className: "bg-card/90 backdrop-blur-sm border-primary/20",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      
      // Show error toast
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        className: "bg-destructive/90 backdrop-blur-sm border-destructive/20",
        duration: 2000,
      });
    }
  };

  const handleDeleteFile = async (index: number) => {
    if (skipDeleteConfirmation) {
      // Direct delete if user chose to remember their decision
      await removeFile(index);
    } else {
      setFileToDelete(index);
      setShowDeleteConfirmation(true);
    }
  };

  const confirmDeleteFile = async () => {
    try {
      if (fileToDelete !== null) {
        await removeFile(fileToDelete);
        setFileToDelete(null);
      } else if (previewNotAvailableFileName) {
        // Check if this is an uploaded file name (not an attached file)
        const isUploadedFileName = uploadedFileNames.includes(previewNotAvailableFileName);
        if (isUploadedFileName) {
          await removeUploadedFileName(previewNotAvailableFileName);
        }
      }
      
      // If user checked "remember my decision", skip future confirmations
      if (rememberDeleteDecision) {
        setSkipDeleteConfirmation(true);
      }
    } catch (error) {
      // Error is already handled in removeFile/removeUploadedFileName functions
      console.error('Error in confirmDeleteFile:', error);
    } finally {
      setShowDeleteConfirmation(false);
      setRememberDeleteDecision(false); // Reset checkbox for next time
      setPreviewNotAvailableFileName(''); // Reset file name
    }
  };

  const cancelDeleteFile = () => {
    setFileToDelete(null);
    setShowDeleteConfirmation(false);
    setRememberDeleteDecision(false); // Reset checkbox
    setPreviewNotAvailableFileName(''); // Reset file name
  };

  const handleUploadedFileNameClick = (fileName: string) => {
    setPreviewNotAvailableFileName(fileName);
    setShowPreviewNotAvailable(true);
  };

  const handleDeleteUploadedFileName = async (fileName: string) => {
    if (skipDeleteConfirmation) {
      await removeUploadedFileName(fileName);
    } else {
      setPreviewNotAvailableFileName(fileName);
      setShowDeleteConfirmation(true);
    }
  };

  const handlePDFClick = (file: File) => {
    setCurrentPDF(file);
    if (isMobile) {
      setShowMobilePDF(true);
    } else {
      setShowPDFViewer(true);
    }
  };

  const handleStartNewSession = () => {
    console.log('handleStartNewSession', isAuthenticated);
    if (isAuthenticated) {
      confirmNewSession();
    } else {
      setShowNewSessionConfirmation(true);
    }
  };

  const confirmNewSession = async () => {
    try {
      if (selectedMode === 'pdf') {
        // Delete all files from server
        const response = await apiService.deleteAllFiles();
        
        // Clear PDF-related data
        setPdfMessages([
          {
            id: '1',
            type: 'bot',
            content: 'Hello! I\'m your AI study assistant. Upload your PDFs and ask me questions about your documents. How can I help you study today?',
            timestamp: new Date(),
          }
        ]);
        setAttachedFiles([]);
        setUploadedFileNames([]);
        setCurrentPDF(null);
        setShowPDFViewer(false);
        setShowMobilePDF(false);
        setPdfMetadata({});

        // Show success toast
        toast({
          title: "New Session Started",
          description: `Successfully cleared PDF session. ${response.message}`,
          className: "bg-card/90 backdrop-blur-sm border-primary/20",
          duration: 2000,
        });
      } else {
        // Clear web search data only
        setWebMessages([
          {
            id: '1',
            type: 'bot',
            content: 'Hello! I\'m your AI study assistant. I can search the web for academic information and research. What would you like to learn about today?',
            timestamp: new Date(),
          }
        ]);
        setWebMetadata({});

        // Show success toast
        toast({
          title: "New Session Started",
          description: "Successfully cleared web search session.",
          className: "bg-card/90 backdrop-blur-sm border-primary/20",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to start new session:', error);
      
      toast({
        title: "New Session Failed",
        description: "Failed to start new session. Please try again.",
        className: "bg-destructive/90 backdrop-blur-sm border-destructive/20",
        duration: 2000,
      });
    } finally {
      setShowNewSessionConfirmation(false);
    }
  };

  const cancelNewSession = () => {
    setShowNewSessionConfirmation(false);
    // Show auth modal for non-authenticated users
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  };

  // Message Bubble Component
  const MessageBubble = ({ message, showMetadata, setShowMetadata }: {
    message: Message;
    showMetadata: Record<string, boolean>;
    setShowMetadata: (value: Record<string, boolean>) => void;
  }) => {
    const isUser = message.type === 'user';
    const messageId = message.id;
    const hasMetadata = message.metadata?.sources && message.metadata.sources.length > 0;
    
    return (
      <div className={cn(
        "flex gap-4 max-w-4xl animate-fade-in",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}>
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md",
          isUser 
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
            : "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground"
        )}>
          {isUser ? (
            <User className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </div>
        
        <div className={cn(
          "flex-1 space-y-2",
          isUser ? "text-right" : "text-left"
        )}>
          <div className={cn(
            "inline-block p-4 rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md",
            isUser 
              ? "bg-primary/10 border border-primary/20 text-foreground rounded-br-sm" 
              : "bg-card/80 border border-border/50 text-foreground rounded-bl-sm"
          )}>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {message.attachments.map((file, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="flex items-center gap-1 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="text-xs">{file.name}</span>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className={cn(
              "prose prose-sm max-w-none prose-chat",
              isUser ? "text-right" : "text-left"
            )}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
          
          {hasMetadata && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata({ ...showMetadata, [messageId]: !showMetadata[messageId] })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="w-3 h-3 mr-1" />
                {showMetadata[messageId] ? 'Hide Sources' : 'Show Sources'}
              </Button>
              
              {showMetadata[messageId] && message.metadata?.sources && (
                <Card className="p-3 bg-muted/30 border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Sources:</h4>
                  <div className="space-y-1">
                    {message.metadata.sources.map((source, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        <span className="font-medium">{source.title}</span>
                        {source.pageNumber && (
                          <span className="ml-2 text-primary">Page {source.pageNumber}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  // Chat Input Component
  const ChatInput = ({ inputValue, setInputValue, attachedFiles, onSend, onFileUpload, onDeleteFile, fileInputRef, isLoading, uploadLoading, selectedMode }: {
    inputValue: string;
    setInputValue: (value: string) => void;
    attachedFiles: File[];
    onSend: () => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteFile: (index: number) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isLoading: boolean;
    uploadLoading: boolean;
    selectedMode: 'pdf' | 'web';
  }) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="space-y-3">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="flex items-center gap-2 px-3 py-2 bg-card/80 border border-border/50 hover:bg-card transition-colors"
              >
                <FileText className="w-3 h-3" />
                <span className="text-xs font-medium">{file.name}</span>
                <button
                  onClick={() => onDeleteFile(index)}
                  className="hover:bg-background/50 rounded-full p-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <div className="relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedMode === 'pdf' ? "Ask questions about your PDFs..." : "Search the web for information..."}
            className="min-h-[60px] pr-32 resize-none bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-200"
            disabled={isLoading}
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            {selectedMode === 'pdf' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={onFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploadLoading}
                  className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
                >
                  {uploadLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
            
            <Button
              onClick={onSend}
              disabled={(!isValidMessage(inputValue) && attachedFiles.length === 0) || isLoading}
              size="sm"
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // File Panel Component
  const FilePanel = ({ attachedFiles, uploadedFileNames, isLoadingUploadedFiles, onFileUpload, onDeleteFile, fileInputRef, uploadLoading, currentPDF, onPDFClick, onUploadedFileNameClick }: {
    attachedFiles: File[];
    uploadedFileNames: string[];
    isLoadingUploadedFiles: boolean;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteFile: (index: number) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    uploadLoading: boolean;
    currentPDF: File | null;
    onPDFClick: (file: File) => void;
    onUploadedFileNameClick: (fileName: string) => void;
  }) => {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-card/20 to-card/40 backdrop-blur-sm">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documents
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={onFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              size="sm"
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-200"
            >
              {uploadLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Session Files */}
          {attachedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Current Session
              </h4>
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={`attached-${index}`}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-md",
                      currentPDF?.name === file.name && showPDFViewer
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "bg-card/60 border-border/30 hover:bg-card/80"
                    )}
                    onClick={() => onPDFClick(file)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(index);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-background/50 rounded-full p-1 transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Previous Session Files */}
          {uploadedFileNames.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Previous Sessions
              </h4>
              <div className="space-y-2">
                {uploadedFileNames.map((fileName, index) => (
                  <div
                    key={`uploaded-${index}`}
                    className="p-3 rounded-lg border border-dashed border-border/50 cursor-pointer transition-all duration-200 group hover:border-border hover:bg-card/40"
                    onClick={() => onUploadedFileNameClick(fileName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUploadedFileName(fileName);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-background/50 rounded-full p-1 transition-all duration-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {attachedFiles.length === 0 && uploadedFileNames.length === 0 && !isLoadingUploadedFiles && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">No documents uploaded</p>
              <p className="text-xs opacity-70">Upload PDFs to start asking questions</p>
            </div>
          )}
          
          {isLoadingUploadedFiles && (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="chat" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Full-screen Chat Container */}
      <div className="h-screen flex flex-col bg-background/95 backdrop-blur-sm">
        
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-7 w-7 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                StudyBot AI
              </h1>
              <p className="text-xs text-muted-foreground">Your AI Study Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartNewSession}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline ml-2">New Session</span>
            </Button>
          </div>
        </header>

        {/* Mode Selection */}
        <div className="flex items-center justify-center gap-2 p-4 border-b border-border/50 bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20">
          {chatModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = selectedMode === mode.id;
            
            return (
              <Button
                key={mode.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMode(mode.id as 'pdf' | 'web')}
                className={cn(
                  "flex items-center gap-2 transition-all duration-200 relative group",
                  isActive && "shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground",
                  !isActive && "hover:bg-accent/50 hover:scale-105"
                )}
                disabled={isLoading}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">{mode.label}</span>
                {isActive && (
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            // Mobile Layout
            <div className="flex flex-col h-full">
              {/* File Panel Button for Mobile */}
              {selectedMode === 'pdf' && (
                <div className="p-3 border-b border-border/50 bg-card/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFileSheet(true)}
                    className="w-full justify-start gap-2 hover:bg-accent/50 transition-all duration-200"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">Files ({attachedFiles.length + uploadedFileNames.length})</span>
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-muted/10">
                <div 
                  ref={messagesContainerRef}
                  className="h-full overflow-y-auto p-4 space-y-4 scrollbar-hide"
                >
                  {currentMessages.map((message, index) => (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      showMetadata={showMetadata}
                      setShowMetadata={setShowMetadata}
                    />
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-start gap-3 p-4 bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm animate-fade-in">
                      <div className="relative">
                        <Bot className="h-6 w-6 text-primary animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping"></div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <p className="text-sm text-muted-foreground">AI is thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50 bg-gradient-to-r from-card/50 via-card/80 to-card/50 backdrop-blur-sm">
                <ChatInput
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  attachedFiles={attachedFiles}
                  onSend={handleSendMessage}
                  onFileUpload={handleFileUpload}
                  onDeleteFile={handleDeleteFile}
                  fileInputRef={fileInputRef}
                  isLoading={isLoading}
                  uploadLoading={uploadLoading}
                  selectedMode={selectedMode}
                />
              </div>
            </div>
          ) : (
            // Desktop Layout with Resizable Panels
            <PanelGroup direction="horizontal" className="h-full">
              {/* File Panel */}
              {selectedMode === 'pdf' && (
                <>
                  <Panel 
                    defaultSize={22} 
                    minSize={18} 
                    maxSize={35}
                    className="bg-gradient-to-b from-card/40 to-card/60 border-r border-border/50"
                  >
                    <FilePanel
                      attachedFiles={attachedFiles}
                      uploadedFileNames={uploadedFileNames}
                      isLoadingUploadedFiles={isLoadingUploadedFiles}
                      onFileUpload={handleFileUpload}
                      onDeleteFile={handleDeleteFile}
                      fileInputRef={fileInputRef}
                      uploadLoading={uploadLoading}
                      currentPDF={currentPDF}
                      onPDFClick={handlePDFClick}
                      onUploadedFileNameClick={handleUploadedFileNameClick}
                    />
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/30 transition-all duration-200 relative group">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/20 group-hover:bg-primary/50 transition-colors" />
                  </PanelResizeHandle>
                </>
              )}

              {/* Chat Panel */}
              <Panel defaultSize={selectedMode === 'pdf' ? 50 : 78} minSize={45}>
                <div className="flex flex-col h-full bg-gradient-to-br from-background/50 to-muted/10">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-hidden">
                    <div 
                      ref={messagesContainerRef}
                      className="h-full overflow-y-auto p-6 space-y-6 scrollbar-hide"
                    >
                      {currentMessages.map((message, index) => (
                        <MessageBubble 
                          key={message.id} 
                          message={message} 
                          showMetadata={showMetadata}
                          setShowMetadata={setShowMetadata}
                        />
                      ))}
                      
                      {isLoading && (
                        <div className="flex items-start gap-4 p-6 bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 shadow-lg animate-fade-in">
                          <div className="relative">
                            <Bot className="h-7 w-7 text-primary animate-pulse" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                          </div>
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">AI is analyzing and thinking...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Input Area */}
                  <div className="p-6 border-t border-border/50 bg-gradient-to-r from-card/40 via-card/60 to-card/40 backdrop-blur-sm">
                    <ChatInput
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      attachedFiles={attachedFiles}
                      onSend={handleSendMessage}
                      onFileUpload={handleFileUpload}
                      onDeleteFile={handleDeleteFile}
                      fileInputRef={fileInputRef}
                      isLoading={isLoading}
                      uploadLoading={uploadLoading}
                      selectedMode={selectedMode}
                    />
                  </div>
                </div>
              </Panel>

              {/* PDF Viewer Panel */}
              {selectedMode === 'pdf' && showPDFViewer && currentPDF && (
                <>
                  <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/30 transition-all duration-200 relative group">
                    <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/20 group-hover:bg-primary/50 transition-colors" />
                  </PanelResizeHandle>
                  <Panel defaultSize={28} minSize={25} maxSize={45}>
                    <div className="h-full bg-gradient-to-b from-card/40 to-card/60 border-l border-border/50">
                      <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate text-foreground">{currentPDF.name}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPDFViewer(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="h-[calc(100%-65px)] bg-background/50">
                        <PDFViewer file={currentPDF} isVisible={showPDFViewer} onToggleVisibility={setShowPDFViewer} />
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          )}
        </div>
      </div>

      {/* Mobile PDF Viewer */}
      <Drawer open={showMobilePDF} onOpenChange={setShowMobilePDF}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-between">
              <span className="truncate">{currentPDF?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobilePDF(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {currentPDF && <PDFViewer file={currentPDF} isVisible={showMobilePDF} onToggleVisibility={setShowMobilePDF} />}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteFile}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFile}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Not Available Dialog */}
      <AlertDialog open={showPreviewNotAvailable} onOpenChange={setShowPreviewNotAvailable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preview Not Available</AlertDialogTitle>
            <AlertDialogDescription>
              File "{previewNotAvailableFileName}" preview is not available. You can still use it for questions or delete it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPreviewNotAvailable(false)}>
              Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPreviewNotAvailable(false);
                setShowDeleteConfirmation(true);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile File Bottom Sheet */}
      <Drawer open={showMobileFileSheet} onOpenChange={setShowMobileFileSheet}>
        <DrawerContent className="h-[70vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Uploaded Files
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Currently attached files (with preview) */}
              {attachedFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Current Session Files</h3>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <Badge 
                        key={`mobile-attached-${index}`} 
                        variant="secondary" 
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex-shrink-0",
                          currentPDF?.name === file.name && (showPDFViewer || showMobilePDF) && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                        )}
                        onClick={() => {
                          // Set the clicked file as the current PDF
                          setCurrentPDF(file);
                          setShowMobilePDF(true);
                          setShowMobileFileSheet(false);
                        }}
                      >
                        <FileText className="w-3 h-3" />
                        <span className="text-xs font-medium">{file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(index);
                          }}
                          className="hover:bg-background/50 rounded-full p-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Previously uploaded files (no preview) */}
              {uploadedFileNames.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Previous Session Files</h3>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFileNames.map((fileName, index) => (
                      <Badge 
                        key={`mobile-uploaded-${index}`} 
                        variant="outline" 
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer border-dashed border-border/50 text-muted-foreground hover:border-border hover:text-foreground flex-shrink-0"
                        onClick={() => {
                          handleUploadedFileNameClick(fileName);
                          setShowMobileFileSheet(false);
                        }}
                      >
                        <FileText className="w-3 h-3" />
                        <span className="text-xs font-medium">{fileName}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUploadedFileName(fileName);
                          }}
                          className="hover:bg-background/50 rounded-full p-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {attachedFiles.length === 0 && uploadedFileNames.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Upload PDFs to start asking questions</p>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* New Session Dialog - Only show for authenticated users */}
      {isAuthenticated && (
        <NewSessionDialog
          open={showNewSessionConfirmation}
          onOpenChange={setShowNewSessionConfirmation}
          selectedMode={selectedMode}
          onConfirm={confirmNewSession}
          onCancel={cancelNewSession}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </section>
  );
};

export default ChatInterface;