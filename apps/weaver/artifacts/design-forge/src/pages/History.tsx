import { Link } from "wouter";
import { useListProjects, useDeleteProject, getListProjectsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { 
  GitBranch, 
  Figma, 
  FileText, 
  Trash2, 
  SearchX,
  AlertCircle
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function History() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading, isError } = useListProjects();

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    }
  });

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">Project History</h1>
        <p className="text-muted-foreground mt-2">All previously extracted design systems and generations.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center p-4 space-x-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
              <p className="font-medium text-foreground">Could not reach the API server</p>
              <p className="text-sm mt-1">Projects will appear here once the backend is running.</p>
            </div>
          ) : projects?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
              <SearchX className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No projects found</h3>
              <p className="mt-1">You haven't extracted any design languages yet.</p>
              <Button asChild className="mt-6" variant="outline">
                <Link href="/">Import Source</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y border-t border-b sm:border-0 rounded-md overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                <div className="col-span-5 md:col-span-6">Project</div>
                <div className="col-span-3 md:col-span-2">Status</div>
                <div className="col-span-2 text-center">Generations</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              
              {projects?.map((project) => (
                <div key={project.id} className="grid sm:grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-full sm:col-span-5 md:col-span-6 flex items-start space-x-3">
                    <div className="mt-1 text-muted-foreground shrink-0">
                      {project.sourceType === "repo" && <GitBranch className="h-5 w-5" />}
                      {project.sourceType === "figma" && <Figma className="h-5 w-5" />}
                      {project.sourceType === "markdown" && <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <Link 
                        href={`/projects/${project.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                        data-testid={`link-history-project-${project.id}`}
                      >
                        {project.name}
                      </Link>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 mt-1">
                        <span className="truncate max-w-[200px]">{project.sourceRef}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 flex items-center">
                    <Badge variant={project.status === 'ready' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold">
                      {project.status}
                    </Badge>
                  </div>
                  
                  <div className="col-span-3 sm:col-span-2 flex items-center sm:justify-center text-sm font-mono text-muted-foreground">
                    {project.generationCount || 0}
                  </div>
                  
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end space-x-2">
                    <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex h-8">
                      <Link href={`/projects/${project.id}`}>View</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-${project.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{project.name}"? This action cannot be undone and will delete all associated generations.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteProject.mutate({ id: project.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteProject.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
