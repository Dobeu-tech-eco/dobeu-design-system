import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetStats, 
  useListProjects, 
  useImportMarkdown, 
  useImportFigma, 
  useImportRepo,
  getGetStatsQueryKey,
  getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, GitBranch, FileText, Figma, Code, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const statsQuery = useGetStats();
  const projectsQuery = useListProjects();

  const importMarkdown = useImportMarkdown({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation(`/projects/${data.id}`);
      },
      onError: (err) => {
        setError(err.data?.error || "Failed to import Markdown. The API server may be unavailable.");
      }
    }
  });

  const importFigma = useImportFigma({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation(`/projects/${data.id}`);
      },
      onError: (err) => {
        setError(err.data?.error || "Failed to import Figma file. The API server may be unavailable.");
      }
    }
  });

  const importRepo = useImportRepo({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation(`/projects/${data.id}`);
      },
      onError: (err) => {
        setError(err.data?.error || "Failed to import repository. The API server may be unavailable.");
      }
    }
  });

  const isImporting = importMarkdown.isPending || importFigma.isPending || importRepo.isPending;

  // Handlers
  const handleMarkdownUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File exceeds 2MB limit.");
      return;
    }
    setError(null);
    const content = await file.text();
    importMarkdown.mutate({ data: { fileName: file.name, content } });
  };

  const handleFigmaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      setError("File exceeds 30MB limit.");
      return;
    }
    setError(null);
    
    // Read as ArrayBuffer and chunked base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + chunkSize)));
    }
    const contentBase64 = btoa(binary);

    importFigma.mutate({ data: { fileName: file.name, contentBase64 } });
  };

  const handleRepoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const repoUrl = formData.get("repoUrl") as string;
    
    if (!repoUrl) return;
    if (!repoUrl.startsWith("http://") && !repoUrl.startsWith("https://") && !repoUrl.startsWith("git@")) {
      setError("Please provide a valid git repository URL.");
      return;
    }

    setError(null);
    importRepo.mutate({ data: { repoUrl } });
  };

  return (
    <div className="w-full max-w-4xl space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 pt-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground font-display">
          Extract design languages from anywhere.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Import a Markdown spec, a Figma file, or a public repository to instantly generate production-ready tokens for any open-source design system.
        </p>
      </div>

      {/* Intake Section */}
      <Card className="w-full shadow-lg border-2">
        <Tabs defaultValue="repo" className="w-full">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
              <TabsTrigger value="repo" disabled={isImporting} data-testid="tab-repo">Repository</TabsTrigger>
              <TabsTrigger value="figma" disabled={isImporting} data-testid="tab-figma">Figma</TabsTrigger>
              <TabsTrigger value="markdown" disabled={isImporting} data-testid="tab-markdown">Markdown</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-8 pb-10">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isImporting ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium animate-pulse text-muted-foreground">
                  {importRepo.isPending && "Fetching repository & extracting signals..."}
                  {importFigma.isPending && "Parsing Figma document..."}
                  {importMarkdown.isPending && "Analyzing Markdown specification..."}
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="repo" className="mt-0">
                  <form onSubmit={handleRepoSubmit} className="space-y-4 max-w-xl mx-auto">
                    <div className="space-y-2">
                      <Label htmlFor="repoUrl" className="font-semibold">Public Git Repository URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="repoUrl"
                          name="repoUrl"
                          placeholder="https://github.com/organization/repo.git"
                          disabled={isImporting}
                          data-testid="input-repo-url"
                        />
                        <Button type="submit" disabled={isImporting} data-testid="button-submit-repo">
                          Analyze
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supports GitHub, GitLab, and Bitbucket public URLs.
                      </p>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="figma" className="mt-0">
                  <div className="max-w-xl mx-auto text-center space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 transition-colors">
                      <Figma className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <Label htmlFor="figma-upload" className="cursor-pointer">
                        <span className="text-primary font-medium hover:underline">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input 
                        id="figma-upload" 
                        type="file" 
                        accept=".fig" 
                        className="hidden" 
                        onChange={handleFigmaUpload}
                        disabled={isImporting}
                        data-testid="input-upload-figma"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Max 30MB .fig files supported</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="markdown" className="mt-0">
                  <div className="max-w-xl mx-auto text-center space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 transition-colors">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <Label htmlFor="md-upload" className="cursor-pointer">
                        <span className="text-primary font-medium hover:underline">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input 
                        id="md-upload" 
                        type="file" 
                        accept=".md,.markdown,.txt" 
                        className="hidden" 
                        onChange={handleMarkdownUpload}
                        disabled={isImporting}
                        data-testid="input-upload-markdown"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Max 2MB text files supported</p>
                    </div>
                  </div>
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Stats & History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[60%]" />
              </div>
            ) : statsQuery.isError ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p>Backend unavailable</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-muted rounded-md p-3">
                    <div className="text-2xl font-bold">{statsQuery.data?.projectCount || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase">Projects</div>
                  </div>
                  <div className="bg-muted rounded-md p-3">
                    <div className="text-2xl font-bold">{statsQuery.data?.generationCount || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase">Generations</div>
                  </div>
                </div>
                {statsQuery.data?.systemUsage && statsQuery.data.systemUsage.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold mb-2">Top Systems</div>
                    <div className="space-y-2">
                      {statsQuery.data.systemUsage.slice(0, 3).map((su) => (
                        <div key={su.designSystemId} className="flex items-center justify-between text-sm">
                          <span>{su.name}</span>
                          <span className="font-mono text-xs">{su.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Projects</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
              <Link href="/history">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projectsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : projectsQuery.isError ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p>Could not reach the API server.</p>
                <p className="text-xs mt-1">Projects will appear here once the backend is running.</p>
              </div>
            ) : projectsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No projects yet. Import a source above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {projectsQuery.data?.slice(0, 5).map((project) => (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group"
                    data-testid={`link-project-${project.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-muted-foreground">
                        {project.sourceType === "repo" && <GitBranch className="h-5 w-5" />}
                        {project.sourceType === "figma" && <Figma className="h-5 w-5" />}
                        {project.sourceType === "markdown" && <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center space-x-2">
                          <span className="truncate max-w-[150px] sm:max-w-[250px]">{project.sourceRef}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <div className="hidden sm:block">
                        <Badge variant={project.status === 'ready' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold">
                          {project.status}
                        </Badge>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground w-12 text-center" title={`${project.generationCount || 0} generations`}>
                        {project.generationCount || 0}g
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
